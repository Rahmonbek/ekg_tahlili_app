using System.Text;
using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.Services.LabStatistics;

namespace EkgAnalyzerApi.Services.LabRules;

/// <summary>Xavf signallari ro'yxati, umumiy sonlar va shifokor qarori.</summary>
public class LabSignalsService
{
    private static readonly HashSet<string> Statuses = new()
    {
        RuleStatus.Critical, RuleStatus.CriteriaMet, RuleStatus.Suspected,
        RuleStatus.Monitor, RuleStatus.InsufficientData,
    };
    private static readonly HashSet<string> Reviews = new() { "pending", "confirmed", "rejected" };

    private readonly MedDataDB _db;

    public LabSignalsService(MedDataDB db) => _db = db;

    public async Task<object> GetSummaryAsync(int clinicId)
    {
        var args = new Dictionary<string, object?> { ["@c"] = clinicId };
        var byStatus = await SqlRows.QueryAsync(_db, @"
            SELECT status AS key, COUNT(*) AS n, COUNT(DISTINCT patient_id) AS patients
              FROM lab_rule_signals WHERE clinic_id = @c GROUP BY status", args);
        var byRule = await SqlRows.QueryAsync(_db, @"
            SELECT rule_id AS key, COUNT(*) AS n,
                   COUNT(*) FILTER (WHERE status = 'CRITICAL')     AS critical,
                   COUNT(*) FILTER (WHERE status = 'CRITERIA_MET') AS criteria_met,
                   COUNT(*) FILTER (WHERE status = 'SUSPECTED')    AS suspected,
                   COUNT(*) FILTER (WHERE status = 'MONITOR')      AS monitor,
                   COUNT(*) FILTER (WHERE status = 'INSUFFICIENT_DATA') AS insufficient,
                   COUNT(*) FILTER (WHERE reviewer_status = 'pending') AS pending,
                   MAX(title_uz) AS title
              FROM lab_rule_signals WHERE clinic_id = @c
             GROUP BY rule_id ORDER BY n DESC", args);
        var byReview = await SqlRows.QueryAsync(_db, @"
            SELECT reviewer_status AS key, COUNT(*) AS n
              FROM lab_rule_signals WHERE clinic_id = @c GROUP BY reviewer_status", args);
        var state = (await SqlRows.QueryAsync(_db, @"
            SELECT COUNT(*) AS evaluated_patients, MAX(evaluated_at) AS last_evaluated_at,
                   COUNT(*) FILTER (WHERE rules_version <> @v) AS outdated
              FROM lab_rule_patient_state WHERE clinic_id = @c",
            new() { ["@c"] = clinicId, ["@v"] = LabRules.Version })).FirstOrDefault();
        return new { byStatus, byRule, byReview, state, rulesVersion = LabRules.Version };
    }

    public async Task<object> GetListAsync(int clinicId, string? rule, string? status, int? severity,
        string? review, string? search, int? patientId, int page, int pageSize)
    {
        var sb = new StringBuilder("s.clinic_id = @c");
        var args = new Dictionary<string, object?> { ["@c"] = clinicId };
        if (!string.IsNullOrWhiteSpace(rule)) { sb.Append(" AND s.rule_id = @rule"); args["@rule"] = rule; }
        if (status != null && Statuses.Contains(status)) { sb.Append(" AND s.status = @status"); args["@status"] = status; }
        if (severity is >= 1 and <= 3) { sb.Append(" AND s.severity = @sev"); args["@sev"] = (short)severity.Value; }
        if (review != null && Reviews.Contains(review)) { sb.Append(" AND s.reviewer_status = @review"); args["@review"] = review; }
        if (patientId.HasValue) { sb.Append(" AND s.patient_id = @pid"); args["@pid"] = patientId.Value; }
        if (!string.IsNullOrWhiteSpace(search))
        {
            sb.Append(" AND (p.lastname ILIKE @q OR p.firstname ILIKE @q OR (p.lastname || ' ' || p.firstname) ILIKE @q)");
            args["@q"] = "%" + search.Trim() + "%";
        }
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 5, 100);
        args["@limit"] = pageSize;
        args["@offset"] = (page - 1) * pageSize;
        var where = sb.ToString();

        var total = (await SqlRows.QueryAsync(_db, $@"
            SELECT COUNT(*) AS n FROM lab_rule_signals s JOIN patients p ON p.id = s.patient_id WHERE {where}", args))
            .First()["n"];
        var items = await SqlRows.QueryAsync(_db, $@"
            SELECT s.id, s.patient_id, p.lastname, p.firstname, p.gender, p.birthdate,
                   s.rule_id, s.status, s.severity, s.title_uz, s.message_uz, s.recommendation_uz,
                   s.evidence::text AS evidence, s.temporal::text AS temporal, s.missing_data::text AS missing_data,
                   s.latest_analysis_id, s.observed_at, s.evaluated_at, s.source_version,
                   s.reviewer_status, s.reviewed_at, s.review_note,
                   TRIM(COALESCE(d.lastname, '') || ' ' || COALESCE(d.firstname, '')) AS reviewer_name
              FROM lab_rule_signals s
              JOIN patients p ON p.id = s.patient_id
              LEFT JOIN users u ON u.id = s.reviewed_by_user_id
              LEFT JOIN doctors d ON d.user_id = u.id
             WHERE {where}
             ORDER BY s.severity DESC,
                      CASE s.status WHEN 'CRITICAL' THEN 0 WHEN 'CRITERIA_MET' THEN 1 WHEN 'SUSPECTED' THEN 2
                                    WHEN 'MONITOR' THEN 3 ELSE 4 END,
                      s.observed_at DESC NULLS LAST, s.id DESC
             LIMIT @limit OFFSET @offset", args);
        return new { total, page, pageSize, items };
    }

    /// <summary>Shifokor qarori: tasdiqlash yoki rad etish (izoh bilan).</summary>
    public async Task<bool> ReviewAsync(int clinicId, long id, int userId, string decision, string? note)
    {
        if (decision is not ("confirmed" or "rejected" or "pending")) return false;
        var n = await SqlRows.ExecuteAsync(_db, @"
            UPDATE lab_rule_signals
               SET reviewer_status = @d,
                   reviewed_by_user_id = CASE WHEN @d = 'pending' THEN NULL ELSE @u END,
                   reviewed_at = CASE WHEN @d = 'pending' THEN NULL ELSE NOW() END,
                   review_note = @note
             WHERE id = @id AND clinic_id = @c", new()
        {
            ["@d"] = decision,
            ["@u"] = userId,
            ["@note"] = string.IsNullOrWhiteSpace(note) ? null : note.Trim()[..Math.Min(note.Trim().Length, 1000)],
            ["@id"] = id,
            ["@c"] = clinicId,
        });
        return n > 0;
    }
}
