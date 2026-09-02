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
    /// Nima uchun kerak: qiymatlar `lab_analyses` ning 40 ta ustunida
    /// allaqachon saqlanardi, lekin ularni **faqat bitta tahlil ichida**
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

        var types = await _context.LabValueTypes.AsNoTracking().ToListAsync();

        var analyses = await _context.LabAnalyse
            .AsNoTracking()
            .Where(a => a.PatcientId == patcientId
                        && a.DeletedAt == null
                        && a.ClinicId == user.ClinicId)
            .OrderBy(a => a.AnalysisDate ?? a.CreatedAt)
            .ToListAsync();

        if (analyses.Count == 0)
            return Ok(new { analysisCount = 0, series = Array.Empty<object>() });

        var entityType = typeof(EkgAnalyzerApi.Models.LabAnalyses);
        var series = new List<object>();

        foreach (var type in types)
        {
            if (string.IsNullOrWhiteSpace(type.ColumnName))
                continue;

            // `column_name` ("hb") -> C# xossasi ("Hb"). Xossa topilmasa
            // ko'rsatkich o'tkazib yuboriladi: bu `lab_value_types` ga
            // ustunsiz yozuv qo'shilganini bildiradi, xatolik emas.
            // Model xossalari `column_name` bilan bir xil yoziladi
            // (`hb`, `bilirubin_total`), shuning uchun to'g'ridan-to'g'ri
            // taqqoslanadi; zaxira sifatida pastki chiziqsiz variant ham.
            var property = entityType.GetProperty(type.ColumnName)
                ?? entityType.GetProperties().FirstOrDefault(
                    p => string.Equals(p.Name.Replace("_", ""),
                                       type.ColumnName.Replace("_", ""),
                                       StringComparison.OrdinalIgnoreCase));
            if (property == null)
                continue;

            var points = analyses
                .Select(a => new { a, value = property.GetValue(a) })
                .Where(x => x.value != null)
                .Select(x => new
                {
                    date = AppTime.ToLocal(x.a.AnalysisDate ?? x.a.CreatedAt),
                    analysisId = x.a.Id,
                    value = Convert.ToDouble(x.value)
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
        return Ok(new { analysisCount = analyses.Count, series });
    }
}
