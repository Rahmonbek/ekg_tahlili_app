using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;

namespace EkgAnalyzerApi.Controllers;

/// <summary>
/// Tibbiy fayllarni berish.
///
/// **Autentifikatsiya va klinika tekshiruvi loyiha egasining qarori bo'yicha
/// O'CHIRILGAN.** Ilgari bu yerda token talab qilinardi va so'ralayotgan fayl
/// foydalanuvchi klinikasiga tegishli tahlilga bog'liqligi tekshirilardi.
///
/// Sabab: `&lt;img&gt;`, `&lt;iframe&gt;` va PDF ko'ruvchilar Authorization
/// sarlavhasini yubora olmaydi, token esa URL da yurganda brauzer tarixiga va
/// server loglariga tushib qolardi.
///
/// Endi yagona himoya — yo'lning taxmin qilib bo'lmasligi: fayllar
/// <c>/uploads/{tur}/{yil}/{oy}/{uuid}.{kengaytma}</c> ko'rinishida saqlanadi
/// (<see cref="IFileStorage"/>). Yo'ldan tashqariga chiqish (path traversal)
/// himoyasi <see cref="IFileStorage.ResolveUpload"/> ichida qoladi — bu
/// endpoint faqat saqlash ildizi ichidagi fayllarni bera oladi.
/// </summary>
[ApiController]
[Route("api/files")]
[AllowAnonymous]
public class FileProxyController : ControllerBase
{
    private readonly IFileStorage _storage;
    private readonly MedDataDB _context;
    private readonly ILogger<FileProxyController> _logger;
    private readonly FileExtensionContentTypeProvider _contentTypes = new();

    public FileProxyController(
        IFileStorage storage,
        MedDataDB context,
        ILogger<FileProxyController> logger)
    {
        _storage = storage;
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Python API yozgan tahlil fayllari (EKG, Holter, SMAD, Laboratoriya).
    /// GET api/files/uploads/{yo'l}
    /// </summary>
    [HttpGet("uploads/{**relativePath}")]
    public async Task<IActionResult> GetUpload(string relativePath)
    {
        var fullPath = _storage.ResolveUpload(relativePath);
        if (fullPath == null)
            return BadRequest(new { message = "Fayl yo'li noto'g'ri" });

        if (!System.IO.File.Exists(fullPath))
            return NotFound(new { message = "Fayl topilmadi" });

        // Diskdagi nom UUID (T-101) — saqlashda asl nom taklif qilinadi.
        // Bu qidiruv faqat NOM uchun; ruxsat tekshiruvi emas.
        var dbLink = "/uploads/" + relativePath.Replace('\\', '/').TrimStart('/');
        var originalName = await FindOriginalNameAsync(dbLink);

        return PhysicalFileOrNotFound(fullPath, originalName);
    }

    /// <summary>
    /// .NET wwwroot dagi ommaviy statik fayllar: klinika logotipi, shifokor avatari,
    /// litsenziya hujjatlari.
    /// </summary>
    [HttpGet("{**relativePath}")]
    public IActionResult GetBackendFile(string relativePath)
    {
        var fullPath = _storage.ResolveWebRoot(relativePath);
        if (fullPath == null)
            return BadRequest(new { message = "Fayl yo'li noto'g'ri" });

        return PhysicalFileOrNotFound(fullPath);
    }

    /// <summary>
    /// Fayl yo'liga bog'langan yozuvning asl fayl nomini topadi.
    /// Topilmasa <c>null</c> — fayl baribir beriladi, faqat nomsiz.
    /// </summary>
    private async Task<string?> FindOriginalNameAsync(string link)
    {
        try
        {
            var ecg = await _context.ECGAnalyse.AsNoTracking()
                .Where(e => e.AnalyseFileLink == link)
                .Select(e => e.OriginalFilename).FirstOrDefaultAsync();
            if (ecg != null) return ecg;

            var lab = await _context.LabAnalyse.AsNoTracking()
                .Where(e => e.AnalyseFileLink == link)
                .Select(e => e.OriginalFilename).FirstOrDefaultAsync();
            if (lab != null) return lab;

            var holter = await _context.HolterAnalyses.AsNoTracking()
                .Where(e => e.AnalyseFileLink == link)
                .Select(e => e.OriginalFilename).FirstOrDefaultAsync();
            if (holter != null) return holter;

            var smad = await _context.SmadAnalyses.AsNoTracking()
                .Where(e => e.AnalyseFileLink == link)
                .Select(e => e.OriginalFilename).FirstOrDefaultAsync();
            if (smad != null) return smad;

            var diag = await _context.MedicalDiagnose.AsNoTracking()
                .Where(e => e.DiagnoseFileLink == link)
                .Select(e => e.OriginalFilename).FirstOrDefaultAsync();
            return diag;
        }
        catch (Exception ex)
        {
            // Nom — qulaylik, majburiyat emas: baza javob bermasa ham fayl beriladi
            _logger.LogWarning(ex, "Fayl asl nomini o'qib bo'lmadi: {Link}", link);
            return null;
        }
    }

    private IActionResult PhysicalFileOrNotFound(string fullPath, string? originalName = null)
    {
        if (!System.IO.File.Exists(fullPath))
            return NotFound(new { message = "Fayl topilmadi" });

        if (!_contentTypes.TryGetContentType(fullPath, out var contentType))
            contentType = "application/octet-stream";

        if (!string.IsNullOrWhiteSpace(originalName))
        {
            // ASP.NET ning `fileDownloadName` parametri `attachment` qo'yadi va
            // brauzer faylni ko'rsatmasdan darhol yuklab oladi — PDF hisobotni
            // ko'rmoqchi bo'lgan shifokor uni har safar diskdan ochishga majbur
            // bo'lardi. Shuning uchun sarlavha qo'lda, `inline` bilan yoziladi.
            //
            // `filename*` — RFC 5987: nomda kirill yoki o'zbek harflari bo'lishi
            // mumkin, ular ASCII sarlavhaga sig'maydi.
            var encoded = Uri.EscapeDataString(SafeFileName(originalName));
            Response.Headers.ContentDisposition = $"inline; filename*=UTF-8''{encoded}";
        }

        return PhysicalFile(fullPath, contentType, enableRangeProcessing: true);
    }

    /// <summary>
    /// Sarlavhaga yozishdan oldin nomni tozalaydi: yangi qator yoki karetka
    /// qaytarish HTTP sarlavhasini ikkiga bo'lib yuborishi mumkin.
    /// </summary>
    private static string SafeFileName(string name)
    {
        var cleaned = new string(name
            .Where(ch => !char.IsControl(ch) && ch != '"' && ch != '\\')
            .ToArray())
            .Trim();
        return cleaned.Length == 0 ? "file" : cleaned;
    }
}
