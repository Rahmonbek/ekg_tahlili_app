using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.Services.LabStatistics;

namespace EkgAnalyzerApi.Services.LabRules;

/// <summary>
/// Klinik qoidalarni bemor tarixiga qo'llaydi va natijani `lab_rule_signals`
/// ga yozadi. Baho klinika kesimida: bemorning faqat shu klinikadagi
/// (o'chirilmagan) tahlillari.
///
/// Signal dalili (`evidence_hash`: holat + daraja + dalil qiymatlari)
/// o'zgarganda shifokor qarori `pending` ga qaytadi va izohi tozalanadi —
/// yangi dalilni qayta ko'rishi kerak. Dalil AYNAN o'sha bo'lsa (masalan
/// qayta tahlil xuddi shu qiymatlarni qaytardi) qaror saqlanadi. Endi
/// ishlamay qolgan qoidaning signali o'chiriladi (u hosila ma'lumot).
///
/// Himoyalar:
///  * statusi 0/1 (AI ishlayapti) lab tahlili bor bemor baholanmaydi va
///    signallari o'chirilmaydi — qayta tahlil paytida qiymatlar vaqtincha
///    o'chirilgan bo'ladi (L-10);
///  * bitta qoidaning xatosi qolganlarini va eski signallarni o'chirmaydi;
///    xato bergan bemor `MaxErrors` marta qayta uriniladi, keyin ma'lumoti
///    o'zgarguncha to'xtatiladi (L-11).
/// </summary>
public class LabRuleEngine
{
    private static readonly JsonSerializerOptions Json = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    /// <summary>Ketma-ket shuncha xatodan keyin bemor ma'lumoti o'zgarguncha qayta urinilmaydi.</summary>
    internal const int MaxErrors = 3;

    /// <summary>Statusi shu bo'lgan lab tahlili bor bemor hozircha baholanmaydi (AI ishlayapti).</summary>
    private const string InProgressSql = @"
        EXISTS (SELECT 1 FROM lab_analyses x
                 WHERE x.patient_id = {0} AND x.clinic_id = {1}
                   AND x.deleted_at IS NULL AND x.status IN (0, 1))";

    private readonly MedDataDB _db;
    private readonly ILogger<LabRuleEngine> _logger;

    public LabRuleEngine(MedDataDB db, ILogger<LabRuleEngine> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>Qayta baholanishi kerak bo'lgan (klinika, bemor) juftlari.</summary>
    public async Task<List<(int ClinicId, int PatientId, long LastId, int Count)>> FindDirtyAsync(int batch, int? clinicId = null)
    {
        var rows = await SqlRows.QueryAsync(_db, $@"
            WITH cur AS (
                SELECT a.clinic_id, v.patient_id, MAX(v.id) AS last_id, COUNT(*)::int AS cnt
                  FROM lab_analysis_values v
                  JOIN lab_analyses a ON a.id = v.lab_analysis_id AND a.deleted_at IS NULL
                 WHERE a.clinic_id IS NOT NULL AND (@clinic::int IS NULL OR a.clinic_id = @clinic::int)
                 GROUP BY a.clinic_id, v.patient_id
            )
            SELECT cur.clinic_id, cur.patient_id, cur.last_id, cur.cnt
              FROM cur
              LEFT JOIN lab_rule_patient_state s
                     ON s.clinic_id = cur.clinic_id AND s.patient_id = cur.patient_id
             WHERE (s.patient_id IS NULL
                    OR s.rules_version <> @version
                    OR s.last_value_id <> cur.last_id
                    OR s.values_count <> cur.cnt)
               AND NOT {string.Format(InProgressSql, "cur.patient_id", "cur.clinic_id")}
             ORDER BY COALESCE(s.error_count, 0), cur.clinic_id, cur.patient_id
             LIMIT @batch", new()
        {
            ["@clinic"] = clinicId,
            ["@version"] = LabRules.Version,
            ["@batch"] = batch,
        });
        return rows.Select(r => (
            Convert.ToInt32(r["clinic_id"]), Convert.ToInt32(r["patient_id"]),
            Convert.ToInt64(r["last_id"]), Convert.ToInt32(r["cnt"]))).ToList();
    }

    /// <summary>
    /// Barcha qiymatlari o'chirilgan (tahlili o'chirilgan) bemorlarning
    /// signallari. Qayta tahlil qilinayotgan (qiymatlari vaqtincha yo'q)
    /// bemorga tegilmaydi.
    /// </summary>
    public async Task<int> PurgeOrphansAsync()
    {
        return await SqlRows.ExecuteAsync(_db, $@"
            DELETE FROM lab_rule_signals s
             WHERE NOT EXISTS (
                SELECT 1 FROM lab_analysis_values v
                  JOIN lab_analyses a ON a.id = v.lab_analysis_id AND a.deleted_at IS NULL
                 WHERE v.patient_id = s.patient_id AND a.clinic_id = s.clinic_id)
               AND NOT {string.Format(InProgressSql, "s.patient_id", "s.clinic_id")};
            DELETE FROM lab_rule_patient_state st
             WHERE NOT EXISTS (
                SELECT 1 FROM lab_analysis_values v
                  JOIN lab_analyses a ON a.id = v.lab_analysis_id AND a.deleted_at IS NULL
                 WHERE v.patient_id = st.patient_id AND a.clinic_id = st.clinic_id)
               AND NOT {string.Format(InProgressSql, "st.patient_id", "st.clinic_id")};", new());
    }

    public async Task<Dictionary<string, CatalogItem>> LoadCatalogAsync()
    {
        var rows = await SqlRows.QueryAsync(_db, @"
            SELECT column_name, name_uz, measure,
                   normal_min_male, normal_max_male, normal_min_female, normal_max_female
              FROM lab_value_types WHERE column_name IS NOT NULL", new());
        return rows.ToDictionary(
            r => (string)r["column_name"]!,
            r => new CatalogItem(
                (string)r["column_name"]!, (r["name_uz"] as string) ?? (string)r["column_name"]!,
                r["measure"] as string, Dec(r["normal_min_male"]), Dec(r["normal_max_male"]),
                Dec(r["normal_min_female"]), Dec(r["normal_max_female"])));
    }

    /// <summary>Bitta bemorni baholaydi va signallarini yangilaydi. Qaytaradi: signallar soni.</summary>
    public async Task<int> EvaluateAsync(int clinicId, int patientId, long lastId, int count,
        IReadOnlyDictionary<string, CatalogItem> catalog)
    {
        List<RuleSignal> signals;
        List<string> failed;
        try
        {
            var ctx = await LoadContextAsync(clinicId, patientId, catalog);
            if (ctx == null) return 0;
            (signals, failed) = LabRules.EvaluateSafe(ctx, (rule, ex) =>
                _logger.LogError(ex, "Lab qoidasi xatosi: rule={Rule} clinic={Clinic} patient={Patient}",
                    rule, clinicId, patientId));
        }
        catch (Exception ex)
        {
            // Kutilmagan ma'lumot: HECH NARSA o'chirilmaydi (eski signallar va
            // shifokor baholari saqlanadi), keyingi siklda qayta uriniladi
            _logger.LogError(ex, "Lab qoidalari xatosi: clinic={Clinic} patient={Patient}", clinicId, patientId);
            await RecordErrorAsync(clinicId, patientId, lastId, count);
            return 0;
        }

        // Qayta ko'rish sharti: dalil xeshi o'zgargan. Eski (xeshsiz) yozuvda —
        // avvalgi shart (boshqa tahlil yoki holat), aks holda migratsiyadan
        // keyingi birinchi hisobda barcha baholar bekor bo'lardi.
        const string reset = @"(CASE WHEN lab_rule_signals.evidence_hash IS NULL
                     THEN lab_rule_signals.latest_analysis_id IS DISTINCT FROM EXCLUDED.latest_analysis_id
                          OR lab_rule_signals.status <> EXCLUDED.status
                     ELSE lab_rule_signals.evidence_hash IS DISTINCT FROM EXCLUDED.evidence_hash END)";

        await using var tx = await _db.Database.BeginTransactionAsync();
        foreach (var s in signals)
        {
            await SqlRows.ExecuteAsync(_db, $@"
                INSERT INTO lab_rule_signals
                    (clinic_id, patient_id, rule_id, status, severity, title_uz, message_uz, recommendation_uz,
                     evidence, temporal, missing_data, latest_analysis_id, observed_at, source_version, evaluated_at,
                     evidence_hash)
                VALUES (@c, @p, @rule, @status, @sev, @title, @msg, @rec,
                        CAST(@evidence AS jsonb), CAST(@temporal AS jsonb), CAST(@missing AS jsonb),
                        @analysis, @observed, @version, NOW(), @hash)
                ON CONFLICT (clinic_id, patient_id, rule_id) DO UPDATE SET
                    status = EXCLUDED.status,
                    severity = EXCLUDED.severity,
                    title_uz = EXCLUDED.title_uz,
                    message_uz = EXCLUDED.message_uz,
                    recommendation_uz = EXCLUDED.recommendation_uz,
                    evidence = EXCLUDED.evidence,
                    temporal = EXCLUDED.temporal,
                    missing_data = EXCLUDED.missing_data,
                    observed_at = EXCLUDED.observed_at,
                    source_version = EXCLUDED.source_version,
                    evaluated_at = NOW(),
                    -- Yangi dalil — shifokor qayta ko'rishi kerak
                    reviewer_status = CASE WHEN {reset} THEN 'pending' ELSE lab_rule_signals.reviewer_status END,
                    reviewed_by_user_id = CASE WHEN {reset} THEN NULL ELSE lab_rule_signals.reviewed_by_user_id END,
                    reviewed_at = CASE WHEN {reset} THEN NULL ELSE lab_rule_signals.reviewed_at END,
                    review_note = CASE WHEN {reset} THEN NULL ELSE lab_rule_signals.review_note END,
                    latest_analysis_id = EXCLUDED.latest_analysis_id,
                    evidence_hash = EXCLUDED.evidence_hash", new()
            {
                ["@c"] = clinicId,
                ["@p"] = patientId,
                ["@rule"] = s.RuleId,
                ["@status"] = s.Status,
                ["@sev"] = s.Severity,
                ["@title"] = Trim(s.Title, 200),
                ["@msg"] = s.Message,
                ["@rec"] = s.Recommendation,
                ["@evidence"] = JsonSerializer.Serialize(s.Evidence, Json),
                ["@temporal"] = s.Temporal == null ? null : JsonSerializer.Serialize(s.Temporal, Json),
                ["@missing"] = JsonSerializer.Serialize(s.Missing, Json),
                ["@analysis"] = s.LatestAnalysisId,
                ["@observed"] = s.ObservedAt,
                ["@version"] = LabRules.Version,
                ["@hash"] = EvidenceHash(s),
            });
        }

        // Ishlamay qolgan qoidalarning signali o'chiriladi; xato bergan
        // qoidalarniki esa SAQLANADI (ular baholanmadi)
        await SqlRows.ExecuteAsync(_db, @"
            DELETE FROM lab_rule_signals
             WHERE clinic_id = @c AND patient_id = @p AND NOT (rule_id = ANY(@keep));", new()
        {
            ["@c"] = clinicId,
            ["@p"] = patientId,
            ["@keep"] = signals.Select(s => s.RuleId).Concat(failed).Distinct().ToArray(),
        });

        if (failed.Count == 0)
        {
            await SqlRows.ExecuteAsync(_db, @"
                INSERT INTO lab_rule_patient_state
                    (clinic_id, patient_id, rules_version, last_value_id, values_count, error_count, evaluated_at)
                VALUES (@c, @p, @version, @last, @cnt, 0, NOW())
                ON CONFLICT (clinic_id, patient_id) DO UPDATE SET
                    rules_version = EXCLUDED.rules_version,
                    last_value_id = EXCLUDED.last_value_id,
                    values_count = EXCLUDED.values_count,
                    error_count = 0,
                    evaluated_at = NOW();", new()
            {
                ["@c"] = clinicId,
                ["@p"] = patientId,
                ["@version"] = LabRules.Version,
                ["@last"] = lastId,
                ["@cnt"] = count,
            });
        }
        await tx.CommitAsync();

        if (failed.Count > 0) await RecordErrorAsync(clinicId, patientId, lastId, count);
        return signals.Count;
    }

    /// <summary>
    /// Xatoni hisoblaydi: `MaxErrors` gacha bemor "o'zgargan" bo'lib qoladi
    /// (`last_value_id = -1`) va keyingi siklda qayta uriniladi; keyin
    /// haqiqiy holat yoziladi — ma'lumot yoki qoidalar versiyasi o'zgarguncha
    /// siklni band qilmaydi.
    /// </summary>
    private async Task RecordErrorAsync(int clinicId, int patientId, long lastId, int count)
    {
        try
        {
            await SqlRows.ExecuteAsync(_db, @"
                INSERT INTO lab_rule_patient_state
                    (clinic_id, patient_id, rules_version, last_value_id, values_count, error_count, evaluated_at)
                VALUES (@c, @p, @version, -1, @cnt, 1, NOW())
                ON CONFLICT (clinic_id, patient_id) DO UPDATE SET
                    rules_version = EXCLUDED.rules_version,
                    last_value_id = CASE WHEN lab_rule_patient_state.error_count + 1 >= @max
                                         THEN @last ELSE -1 END,
                    values_count = EXCLUDED.values_count,
                    error_count = lab_rule_patient_state.error_count + 1,
                    evaluated_at = NOW();", new()
            {
                ["@c"] = clinicId,
                ["@p"] = patientId,
                ["@version"] = LabRules.Version,
                ["@last"] = lastId,
                ["@cnt"] = count,
                ["@max"] = MaxErrors,
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lab qoidalari: xato hisoblagichi yozilmadi: clinic={Clinic} patient={Patient}",
                clinicId, patientId);
        }
    }

    private async Task<PatientLabContext?> LoadContextAsync(int clinicId, int patientId,
        IReadOnlyDictionary<string, CatalogItem> catalog)
    {
        var patient = (await SqlRows.QueryAsync(_db,
            "SELECT gender, birthdate FROM patients WHERE id = @p", new() { ["@p"] = patientId })).FirstOrDefault();
        if (patient == null) return null;

        var obsRows = await SqlRows.QueryAsync(_db, @"
            SELECT t.column_name, v.value, v.measured_at, v.ref_low, v.ref_high, v.flag,
                   v.result_kind, v.text, v.lab_analysis_id, v.unit_mismatch
              FROM lab_analysis_values v
              JOIN lab_analyses a    ON a.id = v.lab_analysis_id AND a.deleted_at IS NULL
              JOIN lab_value_types t ON t.id = v.value_type_id
             WHERE v.patient_id = @p AND a.clinic_id = @c", new() { ["@p"] = patientId, ["@c"] = clinicId });

        var observations = obsRows.Select(r => new Obs(
            (string)r["column_name"]!,
            Dec(r["value"]),
            ToUtc(r["measured_at"]),
            Dec(r["ref_low"]),
            Dec(r["ref_high"]),
            r["flag"] is short f ? f : null,
            r["result_kind"] as string,
            r["text"] as string,
            Convert.ToInt32(r["lab_analysis_id"]),
            r["unit_mismatch"] is true)).ToList();

        var birth = patient["birthdate"] switch
        {
            DateTime d => d,
            DateOnly d => d.ToDateTime(TimeOnly.MinValue),
            _ => (DateTime?)null,
        };
        return new PatientLabContext(clinicId, patientId, patient["gender"] as bool?, birth, observations, catalog);
    }

    /// <summary>
    /// Dalil barmoq izi (SHA-256): holat, daraja, asosiy tahlil va har bir
    /// dalilning qiymati/sanasi/chegarasi. Matnlar (sarlavha, xabar) va
    /// katalog nomlari kirmaydi — ular o'zgarsa baho qaytarilmaydi.
    /// </summary>
    internal static string EvidenceHash(RuleSignal s)
    {
        var canon = new
        {
            s.Status,
            s.Severity,
            s.LatestAnalysisId,
            Evidence = s.Evidence.Select(e => new
            {
                e.Indicator,
                Value = Num(e.Value),
                e.Text,
                Date = e.Date.ToUniversalTime().ToString("yyyy-MM-dd'T'HH:mm:ss'Z'"),
                e.AnalysisId,
                Threshold = Num(e.Threshold),
                e.Comparator,
                e.ThresholdSource,
            }),
        };
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(canon)));
        return Convert.ToHexString(bytes).ToLowerInvariant();

        // 5.6 va 5.60 bir xil dalil (numeric ustun kiritilgan aniqlikni saqlaydi)
        static string? Num(decimal? v) =>
            v?.ToString("0.############", System.Globalization.CultureInfo.InvariantCulture);
    }

    /// <summary>Klinikani to'liq qayta baholashga belgilaydi (worker keyingi sikllarda bajaradi).</summary>
    public Task<int> ResetClinicAsync(int clinicId) =>
        SqlRows.ExecuteAsync(_db, "DELETE FROM lab_rule_patient_state WHERE clinic_id = @c", new() { ["@c"] = clinicId });

    private static decimal? Dec(object? v) => v switch
    {
        null => null,
        decimal d => d,
        double d => (decimal)d,
        float f => (decimal)f,
        int i => i,
        long l => l,
        _ => Convert.ToDecimal(v),
    };

    private static DateTime ToUtc(object? v) => v switch
    {
        DateTime d when d.Kind == DateTimeKind.Utc => d,
        DateTime d => DateTime.SpecifyKind(d, DateTimeKind.Utc),
        DateTimeOffset o => o.UtcDateTime,
        _ => DateTime.UtcNow,
    };

    private static string Trim(string s, int max) => s.Length <= max ? s : s[..max];
}
