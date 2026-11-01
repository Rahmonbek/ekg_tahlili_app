using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

[ApiController]
[Route("api/lab-values")]
[Authorize]
public class LabValuesController : ControllerBase
{
    private readonly MedDataDB _context;

    public LabValuesController(MedDataDB context)
    {
        _context = context;
    }


    /// <summary>Ko'rsatkichlar katalogi (`lab_value_types`). Tartib — `Id` (natija kartochkalari shu tartibda chiziladi).</summary>
    [HttpGet("get-lab-values")]
    public async Task<IActionResult> GetComplaints()
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        // Ilgari bu yerda `IQueryable` `await` qilinmasdan qaytarilardi:
        // metod `async` bo'lsa-da hech qanday `await` yo'q edi va so'rov
        // javob serializatsiyasi paytida, ya'ni `try/catch` va middleware
        // doirasidan tashqarida bajarilardi (T-009).
        var complaints = await _context.LabValueTypes
            .OrderBy(v => v.Id)
            .ToListAsync();

        return Ok(complaints);
    }

    /// <summary>
    /// Bitta bemorning laboratoriya ko'rsatkichlari vaqt bo'yicha (T-035).
    ///
    /// Nima uchun kerak: qiymatlar (endi `lab_analysis_values` da) ilgari
    /// **faqat bitta tahlil ichida**
    /// ko'rish mumkin edi. "Gemoglobin uch oyda qanday o'zgardi" degan
    /// savolga javob berish uchun shifokor tahlillarni birma-bir ochib,
    /// raqamlarni qo'lda yozib olishi kerak edi.
    ///
    /// Faqat **kamida ikkita** o'lchovi bor ko'rsatkichlar qaytariladi:
    /// bitta nuqtada dinamika yo'q, va uni grafikda ko'rsatish bo'sh
    /// va'da bo'lardi.
    /// </summary>
    [HttpGet("patient-dynamics/{patcientId:int}")]
    public async Task<IActionResult> GetPatientDynamics(int patcientId)
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == int.Parse(userIdClaim.Value));
        if (user == null)
            return Unauthorized(new { message = "Token invalid" });

        // Bemor shu klinikaga tegishlimi — boshqa klinikaning bemori
        // bo'yicha tarixni ko'rsatish mumkin emas.
        var patient = await _context.Patcients
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == patcientId);
        if (patient == null)
            return NotFound(new { message = "patient_not_found" });

        // Bemorning shu klinikadagi faol tahlillari soni (o'chirilganlari
        // global filtr bilan chiqarib tashlanadi)
        var analysisCount = await _context.LabAnalyse
            .AsNoTracking()
            .CountAsync(a => a.PatcientId == patcientId && a.ClinicId == user.ClinicId);

        if (analysisCount == 0)
            return Ok(new { analysisCount = 0, series = Array.Empty<object>() });

        // Qiymatlar `lab_analysis_values` dan BITTA so'rov bilan olinadi.
        // Ilgari har bir ko'rsatkich `lab_analyses` ning alohida ustuni edi va
        // ular refleksiya bilan birma-bir o'qilardi. Birligi me'yor birligiga
        // keltirilmagan qiymatlar (`unit_mismatch`) grafikka qo'shilmaydi —
        // ular boshqa birlikda va o'qni buzadi.
        var rows = await _context.LabAnalysisValues
            .AsNoTracking()
            .Where(v => v.LabAnalysis.PatcientId == patcientId
                        && v.LabAnalysis.ClinicId == user.ClinicId
                        && !v.UnitMismatch
                        && v.Value != null)
            .Select(v => new
            {
                v.ValueTypeId,
                v.LabAnalysisId,
                Date = v.LabAnalysis.AnalysisDate ?? v.LabAnalysis.CreatedAt,
                Value = v.Value!.Value,
            })
            .ToListAsync();

        var types = await _context.LabValueTypes
            .AsNoTracking()
            .OrderBy(t => t.Id)
            .ToListAsync();

        var series = new List<object>();
        foreach (var type in types)
        {
            var points = rows
                .Where(r => r.ValueTypeId == type.Id)
                .OrderBy(r => r.Date)
                .Select(r => new
                {
                    date = AppTime.ToLocal(r.Date),
                    analysisId = r.LabAnalysisId,
                    value = Convert.ToDouble(r.Value)
                })
                .ToList();

            // Bitta nuqta dinamika emas
            if (points.Count < 2)
                continue;

            series.Add(new
            {
                columnName = type.ColumnName,
                nameUz = type.NameUz,
                nameRu = type.NameRu,
                nameEn = type.NameEn,
                measure = type.Measure,
                normalMinMale = type.NormalMinMale,
                normalMaxMale = type.NormalMaxMale,
                normalMinFemale = type.NormalMinFemale,
                normalMaxFemale = type.NormalMaxFemale,
                gender = patient.Gender,
                points
            });
        }

        // `analysisCount` frontend uchun MUHIM: agar bemorda ikki va undan
        // ortiq tahlil bo'lsa-yu, lekin `series` bo'sh bo'lsa — bu "kamida
        // ikkita tahlil kerak" degani EMAS, balki tahlillar HAR XIL
        // ko'rsatkichlarni o'lchagani (umumiy ko'rsatkich yo'q) degani.
        // Frontend shu ikki holatga alohida tushunarli xabar ko'rsatadi.
        return Ok(new { analysisCount, series });
    }
}
