using System.Globalization;
using System.Text;
using EkgAnalyzerApi.Constants;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EkgAnalyzerApi.Helpers;

namespace EkgAnalyzerApi.Controllers;

/// <summary>
/// Tahlillar ro'yxatini CSV ga eksport qilish.
///
/// Klinikalar oylik hisobot tayyorlashda ma'lumotni qo'lda ko'chirib
/// yozishga majbur edi — platformada eksport imkoniyati umuman yo'q edi.
///
/// CSV Excel bilan mos bo'lishi uchun UTF-8 BOM bilan va nuqtali vergul
/// ajratgichi bilan yoziladi (O'zbekistonda Excel odatda shu sozlamada).
/// </summary>
[ApiController]
[Route("api/analyses/export")]
[Authorize(Policy = RoleConstants.PolicyClinicManager)]
public class AnalysisExportController : ControllerBase
{
    /// <summary>Bir marta eksport qilinadigan eng ko'p yozuv soni.</summary>
    private const int MaxRows = 5000;

    private readonly ECGAnalyseService _ecg;
    private readonly HolterAnalyseService _holter;
    private readonly SmadAnalyseService _smad;
    private readonly LabAnalyseService _lab;
    private readonly ICurrentUser _currentUser;

    public AnalysisExportController(
        ECGAnalyseService ecg,
        HolterAnalyseService holter,
        SmadAnalyseService smad,
        LabAnalyseService lab,
        ICurrentUser currentUser)
    {
        _ecg = ecg;
        _holter = holter;
        _smad = smad;
        _lab = lab;
        _currentUser = currentUser;
    }

    [HttpGet]
    public async Task<IActionResult> Export(
        [FromQuery] string type,
        [FromQuery] string? search = null,
        [FromQuery] int? status = null,
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null,
        [FromQuery] int? aiStatus = null)
    {
        var clinicId = await _currentUser.GetClinicIdAsync();
        if (clinicId == null)
            return Unauthorized(new { message = "Klinika aniqlanmadi" });

        type = (type ?? string.Empty).ToLowerInvariant();

        List<ExportRow> rows;
        switch (type)
        {
            case "ecg":
            {
                var r = await _ecg.GetECGAnalysesByClinicIdAsync(
                    clinicId.Value, 1, MaxRows, search, status, dateFrom, dateTo, aiStatus, null);
                rows = r.Items.Select(x => new ExportRow(
                    x.Id, x.DocumentNumber, PatientName(x.Patcient), x.Patcient?.BirthDate,
                    x.CreatedAt, x.AnalysisDate, x.Status, x.AIStatus, DoctorName(x.CreatedDoctor))).ToList();
                break;
            }
            case "holter":
            {
                var r = await _holter.GetHolterAnalysesByClinicIdAsync(
                    clinicId.Value, 1, MaxRows, search, status, dateFrom, dateTo, aiStatus, null);
                rows = r.Items.Select(x => new ExportRow(
                    x.Id, x.DocumentNumber, PatientName(x.Patcient), x.Patcient?.BirthDate,
                    x.CreatedAt, x.AnalysisDate, x.Status, x.AIStatus, DoctorName(x.CreatedDoctor))).ToList();
                break;
            }
            case "smad":
            {
                var r = await _smad.GetSmadAnalysesByClinicIdAsync(
                    clinicId.Value, 1, MaxRows, search, status, dateFrom, dateTo, aiStatus, null);
                rows = r.Items.Select(x => new ExportRow(
                    x.Id, x.DocumentNumber, PatientName(x.Patcient), x.Patcient?.BirthDate,
                    x.CreatedAt, x.AnalysisDate, x.Status, x.AIStatus, DoctorName(x.CreatedDoctor))).ToList();
                break;
            }
            case "lab":
            {
                var r = await _lab.GetLabAnalysesByClinicIdAsync(
                    clinicId.Value, 1, MaxRows, search, status, dateFrom, dateTo, aiStatus, null);
                rows = r.Items.Select(x => new ExportRow(
                    x.Id, x.DocumentNumber, PatientName(x.Patcient), x.Patcient?.BirthDate,
                    x.CreatedAt, x.AnalysisDate, x.Status, x.AIStatus, DoctorName(x.CreatedDoctor))).ToList();
                break;
            }
            default:
                return BadRequest(new { message = "Noma'lum tahlil turi" });
        }

        var csv = BuildCsv(rows);
        var fileName = $"nmed-{type}-{DateTime.UtcNow:yyyyMMdd-HHmm}.csv";

        // UTF-8 BOM — busiz Excel kirill va o'zbek harflarini buzib ko'rsatadi
        var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(csv)).ToArray();
        return File(bytes, "text/csv; charset=utf-8", fileName);
    }

    private record ExportRow(
        int Id, string? DocumentNumber, string Patient, DateOnly? BirthDate,
        DateTime? CreatedAt, DateTime? AnalysisDate, int? Status, int? AiStatus, string Doctor);

    // Sharif chiqarilmaydi — platformadagi barcha ko'rsatish joylari bilan
    // bir xil qoida (PersonNameHelper)
    private static string PatientName(PatcientForECG? p) =>
        p == null ? "" : PersonNameHelper.Display(p.LastName, p.FirstName);

    private static string DoctorName(DoctorForECGData? d) =>
        d == null ? "" : $"{d.LastName} {d.FirstName}".Trim();

    private static string StatusText(int? s) => s switch
    {
        0 => "Kutmoqda",
        1 => "AI tahlil qilmoqda",
        2 => "Tayyor",
        3 => "Fayl mos emas",
        -1 => "Xatolik",
        _ => "",
    };

    private static string AiStatusText(int? s) => s switch
    {
        1 => "Normal",
        2 => "O'rtacha",
        3 => "Xavfli",
        _ => "Baholanmadi",
    };

    private static string BuildCsv(List<ExportRow> rows)
    {
        var sb = new StringBuilder();
        sb.AppendLine(string.Join(';', new[]
        {
            "ID", "Hujjat raqami", "Bemor", "Tug'ilgan sana",
            "Yuklangan sana", "Tahlil sanasi", "Holat", "AI xulosasi", "Kiritgan xodim",
        }.Select(Escape)));

        foreach (var r in rows)
        {
            sb.AppendLine(string.Join(';', new[]
            {
                r.Id.ToString(CultureInfo.InvariantCulture),
                r.DocumentNumber ?? "",
                r.Patient,
                r.BirthDate?.ToString("dd.MM.yyyy") ?? "",
                r.CreatedAt?.ToString("dd.MM.yyyy HH:mm") ?? "",
                r.AnalysisDate?.ToString("dd.MM.yyyy") ?? "",
                StatusText(r.Status),
                AiStatusText(r.AiStatus),
                r.Doctor,
            }.Select(Escape)));
        }

        return sb.ToString();
    }

    /// <summary>
    /// CSV maydonini himoyalash. Formula injection dan ham saqlaydi:
    /// `=`, `+`, `-`, `@` bilan boshlangan qiymat Excel da formula sifatida
    /// bajarilishi mumkin, shuning uchun oldiga apostrof qo'yiladi.
    /// </summary>
    private static string Escape(string value)
    {
        value ??= "";

        if (value.Length > 0 && (value[0] == '=' || value[0] == '+' || value[0] == '-' || value[0] == '@'))
            value = "'" + value;

        if (value.Contains('"') || value.Contains(';') || value.Contains('\n') || value.Contains('\r'))
            return '"' + value.Replace("\"", "\"\"") + '"';

        return value;
    }
}
