using System.Data;
using System.Data.Common;
using System.Text;
using EkgAnalyzerApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace EkgAnalyzerApi.Services.LabStatistics;

/// <summary>Statistika filtrlari (barchasi ixtiyoriy).</summary>
public class LabStatsFilter
{
    /// <summary>Mahalliy sana (shu kun ham kiradi).</summary>
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    /// <summary>Yuklagan YOKI biriktirilgan shifokor.</summary>
    public int? DoctorId { get; set; }
    /// <summary>male | female | unknown</summary>
    public string? Gender { get; set; }
    public int? AgeFrom { get; set; }
    public int? AgeTo { get; set; }
    /// <summary>`lab_value_types.category` (cbc, liver, thyroid…).</summary>
    public string? Category { get; set; }
    /// <summary>`lab_value_types.column_name`.</summary>
    public string? Indicator { get; set; }
    /// <summary>Faqat me'yordan tashqari qiymatlar/tahlillar.</summary>
    public bool OnlyAbnormal { get; set; }
}

/// <summary>
/// Klinika laboratoriya statistikasi — `lab_analysis_values` (har bir qiymat
/// alohida qator) ustida SQL agregatlar.
///
/// Qoidalar:
///  * har bir so'rov `clinic_id` bilan cheklanadi (klinika izolyatsiyasi);
///  * o'chirilgan tahlillar hisobga olinmaydi;
///  * birligi mos kelmagan qiymatlar (`unit_mismatch`) taqsimot va
///    persentillarga KIRMAYDI (boshqa birlikda), lekin soni ko'rsatiladi;
///  * baho (`flag`) — laboratoriya me'yori bo'yicha, bo'lmasa katalog me'yori.
///
/// Murakkab agregatlar (persentil, gistogramma) uchun xom SQL ishlatiladi —
/// EF LINQ ularni tarjima qila olmaydi. Barcha qiymatlar parametr orqali.
/// </summary>
public class LabStatisticsService
{
    private const string Tz = "Asia/Tashkent";
    private readonly MedDataDB _db;
    private readonly IConfiguration _config;

    public LabStatisticsService(MedDataDB db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    // ── Umumiy ko'rsatkichlar ──────────────────────────────────────────────

    public async Task<object> GetSummaryAsync(int clinicId, LabStatsFilter f)
    {
        var (aWhere, aArgs) = AnalysisWhere(clinicId, f);
        var counts = (await Rows($@"
            SELECT COUNT(*)                                        AS analyses,
                   COUNT(DISTINCT a.patient_id)                    AS patients,
                   COUNT(*) FILTER (WHERE a.status = 2)            AS done,
                   COUNT(*) FILTER (WHERE a.status = -1)           AS failed,
                   COUNT(*) FILTER (WHERE a.status IN (0, 1))      AS processing,
                   COUNT(*) FILTER (WHERE a.analysis_date IS NULL) AS no_date,
                   COUNT(*) FILTER (WHERE a.ai_severity = '1')     AS severity1,
                   COUNT(*) FILTER (WHERE a.ai_severity = '2')     AS severity2,
                   COUNT(*) FILTER (WHERE a.ai_severity = '3')     AS severity3,
                   COUNT(*) FILTER (WHERE EXISTS (
                       SELECT 1 FROM lab_analysis_values x
                        WHERE x.lab_analysis_id = a.id AND x.flag IN (-1, 1)))   AS abnormal_analyses
              FROM lab_analyses a
              JOIN patients p ON p.id = a.patient_id
             WHERE {aWhere}", aArgs)).FirstOrDefault() ?? new();

        var (vWhere, vArgs) = ValueWhere(clinicId, f);
        var values = (await Rows($@"
            SELECT COUNT(*)                                   AS value_count,
                   COUNT(*) FILTER (WHERE v.flag = -1)        AS low,
                   COUNT(*) FILTER (WHERE v.flag = 1)         AS high,
                   COUNT(*) FILTER (WHERE v.flag = 0)         AS normal,
                   COUNT(*) FILTER (WHERE v.flag IS NULL)     AS unassessed,
                   COUNT(*) FILTER (WHERE v.flag_source = 'lab')  AS by_lab_ref,
                   COUNT(DISTINCT v.value_type_id)            AS indicators
              {ValueFrom} WHERE {vWhere}", vArgs)).FirstOrDefault() ?? new();

        var sex = await Rows($@"
            SELECT CASE WHEN p.gender IS TRUE THEN 'male'
                        WHEN p.gender IS FALSE THEN 'female' ELSE 'unknown' END AS key,
                   COUNT(DISTINCT a.patient_id) AS patients,
                   COUNT(*)                     AS analyses
              FROM lab_analyses a JOIN patients p ON p.id = a.patient_id
             WHERE {aWhere}
             GROUP BY 1", aArgs);

        var ages = await Rows($@"
            SELECT {AgeGroupSql("COALESCE(a.analysis_date, a.created_at)")} AS key,
                   COUNT(DISTINCT a.patient_id) AS patients,
                   COUNT(*)                     AS analyses
              FROM lab_analyses a JOIN patients p ON p.id = a.patient_id
             WHERE {aWhere}
             GROUP BY 1", aArgs);

        var files = await Rows($@"
            SELECT CASE
                     WHEN lower(fl.file_link) LIKE '%.xlsx' THEN 'xlsx'
                     WHEN lower(fl.file_link) LIKE '%.pdf'  THEN 'pdf'
                     WHEN lower(fl.file_link) ~ '\.(png|jpe?g)$' THEN 'image'
                     ELSE 'other' END AS key,
                   COUNT(*) AS files
              FROM lab_analysis_files fl
              JOIN lab_analyses a ON a.id = fl.lab_analysis_id
              JOIN patients p ON p.id = a.patient_id
             WHERE {aWhere}
             GROUP BY 1", aArgs);

        var categories = await Rows($@"
            SELECT t.category AS key,
                   COUNT(*)                                AS value_count,
                   COUNT(*) FILTER (WHERE v.flag IN (-1, 1)) AS abnormal,
                   COUNT(DISTINCT v.lab_analysis_id)       AS analyses
              {ValueFrom} WHERE {vWhere}
             GROUP BY t.category
             ORDER BY value_count DESC", vArgs);

        return new { counts, values, sex, ages, files, categories };
    }

    // ── Vaqt bo'yicha ──────────────────────────────────────────────────────

    public async Task<object> GetTimelineAsync(int clinicId, LabStatsFilter f, string bucket)
    {
        bucket = bucket is "day" or "week" or "month" ? bucket : "month";
        var (aWhere, aArgs) = AnalysisWhere(clinicId, f);
        var rows = await Rows($@"
            SELECT to_char(date_trunc('{bucket}', COALESCE(a.analysis_date, a.created_at) AT TIME ZONE '{Tz}'), 'YYYY-MM-DD') AS period,
                   COUNT(*)                     AS analyses,
                   COUNT(DISTINCT a.patient_id) AS patients,
                   COUNT(*) FILTER (WHERE EXISTS (
                       SELECT 1 FROM lab_analysis_values x
                        WHERE x.lab_analysis_id = a.id AND x.flag IN (-1, 1))) AS abnormal,
                   COUNT(*) FILTER (WHERE a.ai_severity = '3') AS severe
              FROM lab_analyses a JOIN patients p ON p.id = a.patient_id
             WHERE {aWhere}
             GROUP BY 1
             ORDER BY 1", aArgs);
        return new { bucket, rows };
    }

    // ── Ko'rsatkichlar kesimida ────────────────────────────────────────────

    public async Task<object> GetIndicatorsAsync(int clinicId, LabStatsFilter f)
    {
        var (vWhere, vArgs) = ValueWhere(clinicId, f);
        var rows = await Rows($@"
            SELECT t.column_name AS column_name, t.category, t.value_kind, t.measure, t.sort_order,
                   t.name_uz, t.name_ru, t.name_en,
                   COUNT(*)                                    AS n,
                   COUNT(DISTINCT v.patient_id)                AS patients,
                   COUNT(*) FILTER (WHERE v.flag = -1)         AS low,
                   COUNT(*) FILTER (WHERE v.flag = 1)          AS high,
                   COUNT(*) FILTER (WHERE v.flag = 0)          AS normal,
                   COUNT(*) FILTER (WHERE v.flag IS NULL)      AS unassessed,
                   COUNT(*) FILTER (WHERE v.unit_mismatch)     AS unit_mismatch,
                   COUNT(*) FILTER (WHERE v.result_kind = 'EQUIVOCAL') AS equivocal,
                   AVG(v.value) FILTER (WHERE {Comparable})    AS mean,
                   MIN(v.value) FILTER (WHERE {Comparable})    AS min,
                   MAX(v.value) FILTER (WHERE {Comparable})    AS max,
                   percentile_cont(0.1) WITHIN GROUP (ORDER BY v.value) FILTER (WHERE {Comparable}) AS p10,
                   percentile_cont(0.5) WITHIN GROUP (ORDER BY v.value) FILTER (WHERE {Comparable}) AS median,
                   percentile_cont(0.9) WITHIN GROUP (ORDER BY v.value) FILTER (WHERE {Comparable}) AS p90
              {ValueFrom} WHERE {vWhere}
             GROUP BY t.id
             ORDER BY t.sort_order, t.id", vArgs);
        return rows;
    }

    public async Task<object?> GetIndicatorDetailAsync(int clinicId, LabStatsFilter f, string column)
    {
        f.Indicator = column;
        var (vWhere, vArgs) = ValueWhere(clinicId, f);

        var range = (await Rows($@"
            SELECT percentile_cont(0.01) WITHIN GROUP (ORDER BY v.value) AS lo,
                   percentile_cont(0.99) WITHIN GROUP (ORDER BY v.value) AS hi,
                   COUNT(*) AS n
              {ValueFrom} WHERE {vWhere} AND {Comparable}", vArgs)).FirstOrDefault();

        var histogram = new List<Dictionary<string, object?>>();
        if (range != null && range["lo"] is double lo && range["hi"] is double hi && hi > lo)
        {
            var hArgs = new Dictionary<string, object?>(vArgs) { ["@hlo"] = lo, ["@hhi"] = hi };
            histogram = await Rows($@"
                SELECT LEAST(GREATEST(width_bucket(v.value::float8, @hlo, @hhi, 20), 1), 20) AS bin,
                       COUNT(*) AS count,
                       COUNT(*) FILTER (WHERE v.flag IN (-1, 1)) AS abnormal
                  {ValueFrom} WHERE {vWhere} AND {Comparable}
                 GROUP BY 1 ORDER BY 1", hArgs);
            var width = (hi - lo) / 20.0;
            foreach (var h in histogram)
            {
                var bin = Convert.ToInt32(h["bin"]);
                h["from"] = Math.Round(lo + (bin - 1) * width, 3);
                h["to"] = Math.Round(lo + bin * width, 3);
            }
        }

        var monthly = await Rows($@"
            SELECT to_char(date_trunc('month', v.measured_at AT TIME ZONE '{Tz}'), 'YYYY-MM') AS period,
                   COUNT(*) AS n,
                   AVG(v.value) FILTER (WHERE {Comparable}) AS mean,
                   percentile_cont(0.5) WITHIN GROUP (ORDER BY v.value) FILTER (WHERE {Comparable}) AS median,
                   COUNT(*) FILTER (WHERE v.flag IN (-1, 1)) AS abnormal
              {ValueFrom} WHERE {vWhere}
             GROUP BY 1 ORDER BY 1", vArgs);

        var bySex = await Rows($@"
            SELECT CASE WHEN p.gender IS TRUE THEN 'male'
                        WHEN p.gender IS FALSE THEN 'female' ELSE 'unknown' END AS key,
                   COUNT(*) AS n,
                   COUNT(*) FILTER (WHERE v.flag = -1) AS low,
                   COUNT(*) FILTER (WHERE v.flag = 1)  AS high,
                   percentile_cont(0.5) WITHIN GROUP (ORDER BY v.value) FILTER (WHERE {Comparable}) AS median
              {ValueFrom} WHERE {vWhere}
             GROUP BY 1", vArgs);

        var byAge = await Rows($@"
            SELECT {AgeGroupSql("v.measured_at")} AS key,
                   COUNT(*) AS n,
                   COUNT(*) FILTER (WHERE v.flag = -1) AS low,
                   COUNT(*) FILTER (WHERE v.flag = 1)  AS high,
                   percentile_cont(0.5) WITHIN GROUP (ORDER BY v.value) FILTER (WHERE {Comparable}) AS median
              {ValueFrom} WHERE {vWhere}
             GROUP BY 1", vArgs);

        // Har bir bemorning shu ko'rsatkich bo'yicha OXIRGI natijasi (me'yordan tashqari bo'lsa)
        var patients = await Rows($@"
            SELECT * FROM (
                SELECT DISTINCT ON (v.patient_id)
                       v.patient_id, p.lastname, p.firstname, p.gender, p.birthdate,
                       v.lab_analysis_id, v.measured_at, v.value, v.unit, v.text,
                       v.ref_low, v.ref_high, v.flag, v.flag_source, v.result_kind
                  {ValueFrom} WHERE {vWhere}
                 ORDER BY v.patient_id, v.measured_at DESC, v.id DESC
            ) last
             WHERE last.flag IN (-1, 1)
             ORDER BY last.measured_at DESC
             LIMIT 200", vArgs);

        return new { column, histogram, monthly, bySex, byAge, patients, range };
    }

    // ── Shifokorlar kesimida ───────────────────────────────────────────────

    public async Task<object> GetDoctorsAsync(int clinicId, LabStatsFilter f)
    {
        var (aWhere, aArgs) = AnalysisWhere(clinicId, f);
        return await Rows($@"
            SELECT a.created_doctor_id AS doctor_id,
                   TRIM(COALESCE(d.lastname, '') || ' ' || COALESCE(d.firstname, '')) AS name,
                   COUNT(*)                     AS analyses,
                   COUNT(DISTINCT a.patient_id) AS patients,
                   COUNT(*) FILTER (WHERE EXISTS (
                       SELECT 1 FROM lab_analysis_values x
                        WHERE x.lab_analysis_id = a.id AND x.flag IN (-1, 1))) AS abnormal,
                   COUNT(*) FILTER (WHERE a.ai_severity = '3') AS severe,
                   MAX(COALESCE(a.analysis_date, a.created_at)) AS last_at
              FROM lab_analyses a
              JOIN patients p ON p.id = a.patient_id
              LEFT JOIN doctors d ON d.id = a.created_doctor_id
             WHERE {aWhere}
             GROUP BY a.created_doctor_id, d.lastname, d.firstname
             ORDER BY analyses DESC", aArgs);
    }

    /// <summary>Filtr uchun: klinika shifokorlari (yuklagan yoki biriktirilgan).</summary>
    public async Task<object> GetDoctorOptionsAsync(int clinicId)
    {
        return await Rows(@"
            SELECT d.id, TRIM(COALESCE(d.lastname, '') || ' ' || COALESCE(d.firstname, '')) AS name
              FROM doctors d
              JOIN users u ON u.id = d.user_id
             WHERE u.clinic_id = @clinic
             ORDER BY 2", new() { ["@clinic"] = clinicId });
    }

    // ── SQL yordamchilari ──────────────────────────────────────────────────

    private const string ValueFrom = @"
              FROM lab_analysis_values v
              JOIN lab_analyses a    ON a.id = v.lab_analysis_id AND a.deleted_at IS NULL
              JOIN patients p        ON p.id = v.patient_id
              JOIN lab_value_types t ON t.id = v.value_type_id";

    /// <summary>Taqsimotga kiradigan qiymat: son, me'yor birligida.</summary>
    private const string Comparable = "v.value IS NOT NULL AND NOT v.unit_mismatch";

    private static string AgeGroupSql(string dateExpr) => $@"
        CASE WHEN p.birthdate IS NULL THEN 'unknown'
             ELSE CASE
                WHEN date_part('year', age(({dateExpr} AT TIME ZONE '{Tz}')::date, p.birthdate)) < 18 THEN '0-17'
                WHEN date_part('year', age(({dateExpr} AT TIME ZONE '{Tz}')::date, p.birthdate)) < 30 THEN '18-29'
                WHEN date_part('year', age(({dateExpr} AT TIME ZONE '{Tz}')::date, p.birthdate)) < 45 THEN '30-44'
                WHEN date_part('year', age(({dateExpr} AT TIME ZONE '{Tz}')::date, p.birthdate)) < 60 THEN '45-59'
                WHEN date_part('year', age(({dateExpr} AT TIME ZONE '{Tz}')::date, p.birthdate)) < 75 THEN '60-74'
                ELSE '75+' END END";

    private (string Where, Dictionary<string, object?> Args) ValueWhere(int clinicId, LabStatsFilter f)
    {
        var sb = new StringBuilder("a.clinic_id = @clinic");
        var args = new Dictionary<string, object?> { ["@clinic"] = clinicId };
        AddCommon(sb, args, f, "v.measured_at");
        if (!string.IsNullOrWhiteSpace(f.Category)) { sb.Append(" AND t.category = @category"); args["@category"] = f.Category; }
        if (!string.IsNullOrWhiteSpace(f.Indicator)) { sb.Append(" AND t.column_name = @indicator"); args["@indicator"] = f.Indicator; }
        if (f.OnlyAbnormal) sb.Append(" AND v.flag IN (-1, 1)");
        return (sb.ToString(), args);
    }

    private (string Where, Dictionary<string, object?> Args) AnalysisWhere(int clinicId, LabStatsFilter f)
    {
        var sb = new StringBuilder("a.clinic_id = @clinic AND a.deleted_at IS NULL");
        var args = new Dictionary<string, object?> { ["@clinic"] = clinicId };
        AddCommon(sb, args, f, "COALESCE(a.analysis_date, a.created_at)");

        // Ko'rsatkich filtrlari tahlil darajasida: shunday qiymati bor tahlillar
        var inner = new List<string>();
        if (!string.IsNullOrWhiteSpace(f.Category)) { inner.Add("t.category = @category"); args["@category"] = f.Category; }
        if (!string.IsNullOrWhiteSpace(f.Indicator)) { inner.Add("t.column_name = @indicator"); args["@indicator"] = f.Indicator; }
        if (f.OnlyAbnormal) inner.Add("x.flag IN (-1, 1)");
        if (inner.Count > 0)
        {
            sb.Append(@" AND EXISTS (SELECT 1 FROM lab_analysis_values x
                                      JOIN lab_value_types t ON t.id = x.value_type_id
                                     WHERE x.lab_analysis_id = a.id AND ")
              .Append(string.Join(" AND ", inner)).Append(')');
        }
        return (sb.ToString(), args);
    }

    private void AddCommon(StringBuilder sb, Dictionary<string, object?> args, LabStatsFilter f, string dateExpr)
    {
        if (f.From.HasValue)
        {
            sb.Append($" AND {dateExpr} >= @from");
            args["@from"] = AppTime.ToUtcFromLocalDate(f.From.Value, _config);
        }
        if (f.To.HasValue)
        {
            sb.Append($" AND {dateExpr} < @to");
            args["@to"] = AppTime.ToUtcFromLocalDate(f.To.Value, _config).AddDays(1);
        }
        if (f.DoctorId.HasValue)
        {
            sb.Append(@" AND (a.created_doctor_id = @doctor OR EXISTS (
                SELECT 1 FROM lab_analyse_doctors ld
                 WHERE ld.lab_analyse_id = a.id AND ld.doctor_id = @doctor))");
            args["@doctor"] = f.DoctorId.Value;
        }
        switch (f.Gender)
        {
            case "male": sb.Append(" AND p.gender IS TRUE"); break;
            case "female": sb.Append(" AND p.gender IS FALSE"); break;
            case "unknown": sb.Append(" AND p.gender IS NULL"); break;
        }
        var age = $"date_part('year', age(({dateExpr} AT TIME ZONE '{Tz}')::date, p.birthdate))";
        if (f.AgeFrom.HasValue) { sb.Append($" AND {age} >= @ageFrom"); args["@ageFrom"] = (double)f.AgeFrom.Value; }
        if (f.AgeTo.HasValue) { sb.Append($" AND {age} <= @ageTo"); args["@ageTo"] = (double)f.AgeTo.Value; }
    }

    /// <summary>Parametrli xom SQL → qatorlar (ustun nomi → qiymat).</summary>
    internal async Task<List<Dictionary<string, object?>>> Rows(string sql, Dictionary<string, object?> args)
        => await SqlRows.QueryAsync(_db, sql, args);
}

/// <summary>EF ulanishi orqali parametrli xom SQL (EF 7 da tipsiz `SqlQuery` yo'q).</summary>
internal static class SqlRows
{
    public static async Task<List<Dictionary<string, object?>>> QueryAsync(
        MedDataDB db, string sql, Dictionary<string, object?> args)
    {
        DbConnection conn = db.Database.GetDbConnection();
        var opened = false;
        if (conn.State != ConnectionState.Open)
        {
            await conn.OpenAsync();
            opened = true;
        }
        try
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = sql;
            var tx = db.Database.CurrentTransaction?.GetDbTransaction();
            if (tx != null) cmd.Transaction = tx;
            foreach (var (name, value) in args)
            {
                var p = cmd.CreateParameter();
                p.ParameterName = name;
                p.Value = value ?? DBNull.Value;
                cmd.Parameters.Add(p);
            }
            await using var reader = await cmd.ExecuteReaderAsync();
            var list = new List<Dictionary<string, object?>>();
            while (await reader.ReadAsync())
            {
                var row = new Dictionary<string, object?>(reader.FieldCount);
                for (var i = 0; i < reader.FieldCount; i++)
                    row[reader.GetName(i)] = reader.IsDBNull(i) ? null : reader.GetValue(i);
                list.Add(row);
            }
            return list;
        }
        finally
        {
            if (opened) await conn.CloseAsync();
        }
    }

    public static async Task<int> ExecuteAsync(MedDataDB db, string sql, Dictionary<string, object?> args)
    {
        DbConnection conn = db.Database.GetDbConnection();
        var opened = false;
        if (conn.State != ConnectionState.Open)
        {
            await conn.OpenAsync();
            opened = true;
        }
        try
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = sql;
            var tx = db.Database.CurrentTransaction?.GetDbTransaction();
            if (tx != null) cmd.Transaction = tx;
            foreach (var (name, value) in args)
            {
                var p = cmd.CreateParameter();
                p.ParameterName = name;
                p.Value = value ?? DBNull.Value;
                cmd.Parameters.Add(p);
            }
            return await cmd.ExecuteNonQueryAsync();
        }
        finally
        {
            if (opened) await conn.CloseAsync();
        }
    }
}
