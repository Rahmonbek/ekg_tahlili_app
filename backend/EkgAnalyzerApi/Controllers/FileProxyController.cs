using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;

namespace EkgAnalyzerApi.Controllers;

/// <summary>
/// Tibbiy fayllarni berish. **Autentifikatsiya majburiy.**
///
/// Ilgari ikkala metod ham <c>[AllowAnonymous]</c> edi — bemorning EKG rasmlari,
/// Holter/SMAD/Laboratoriya PDF fayllari va generatsiya qilingan grafiklar
/// URL ni bilgan har kimga ochiq edi. Fayl nomlari esa taxmin qilinardi
/// (<c>ecg_96.png</c>, <c>ecg_97.png</c>, ...).
///
/// Endi: token talab qilinadi va so'ralayotgan fayl foydalanuvchining
/// klinikasiga tegishli tahlilga bog'liqligi tekshiriladi.
/// </summary>
[ApiController]
[Route("api/files")]
[Authorize]
public class FileProxyController : ControllerBase
{
    private readonly IFileStorage _storage;
    private readonly MedDataDB _context;
    private readonly ICurrentUser _currentUser;
    private readonly ILogger<FileProxyController> _logger;
    private readonly FileExtensionContentTypeProvider _contentTypes = new();

    public FileProxyController(
        IFileStorage storage,
        MedDataDB context,
        ICurrentUser currentUser,
        ILogger<FileProxyController> logger)
    {
        _storage = storage;
        _context = context;
        _currentUser = currentUser;
        _logger = logger;
    }

    /// <summary>
    /// Python API yozgan tahlil fayllari (EKG, Holter, SMAD, Laboratoriya).
    /// GET api/files/uploads/{yo'l}
    /// </summary>
    [HttpGet("uploads/{**relativePath}")]
    public async Task<IActionResult> GetUpload(string relativePath)
    {
        var clinicId = await _currentUser.GetClinicIdAsync();
        if (clinicId == null)
            return Unauthorized(new { message = "Klinika aniqlanmadi" });

        // Bazadagi havolalar `/uploads/...` bilan boshlanadi
        var dbLink = "/uploads/" + relativePath.Replace('\\', '/').TrimStart('/');

        var (found, originalName) = await FindAsync(dbLink, clinicId.Value);
        if (!found)
        {
            _logger.LogWarning(
                "Faylga ruxsatsiz murojaat. userId={UserId} clinicId={ClinicId}",
                _currentUser.UserId, clinicId);
            return NotFound(new { message = "Fayl topilmadi yoki ruxsat yo'q" });
        }

        var fullPath = _storage.ResolveUpload(relativePath);
        if (fullPath == null)
            return BadRequest(new { message = "Fayl yo'li noto'g'ri" });

        // Diskdagi nom UUID (T-101) — saqlashda asl nom taklif qilinadi
        return PhysicalFileOrNotFound(fullPath, originalName);
    }

    /// <summary>
    /// .NET wwwroot dagi ommaviy statik fayllar: klinika logotipi, shifokor avatari.
    /// Bular tibbiy ma'lumot emas, lekin baribir autentifikatsiya talab qilinadi.
    /// </summary>
    [HttpGet("{**relativePath}")]
    public IActionResult GetBackendFile(string relativePath)
    {
        // Litsenziya fayllari tibbiy bo'lmasa ham maxfiy hujjat — faqat o'z klinikasi
        if (relativePath.StartsWith("clinic_licenses", StringComparison.OrdinalIgnoreCase)
            && _currentUser.RoleId is not (Constants.RoleConstants.Admin
                                           or Constants.RoleConstants.Director
                                           or Constants.RoleConstants.SuperAdmin))
        {
            return Forbid();
        }

        var fullPath = _storage.ResolveWebRoot(relativePath);
        if (fullPath == null)
            return BadRequest(new { message = "Fayl yo'li noto'g'ri" });

        return PhysicalFileOrNotFound(fullPath);
    }

    /// <summary>
    /// So'ralgan fayl foydalanuvchi klinikasiga tegishli biror tahlilga
    /// bog'liqmi va bog'liq bo'lsa uning asl nomi qanday?
    /// </summary>
    /// <remarks>
    /// Asl nom aynan shu yerda olinadi: yozuv allaqachon topilgan, uni
    /// nom uchun ikkinchi marta qidirish keraksiz so'rov bo'lardi.
    /// Har bir tur uchun bitta so'rov ishlatiladi — `Found` bayrog'i
    /// yozuv topilganini, `Name` esa nomni bildiradi (nom `null`
    /// bo'lishi mumkin: eski yozuvlarda va biz yaratgan fayllarda).
    /// </remarks>
    private async Task<(bool Found, string? Name)> FindAsync(string link, int clinicId)
    {
        var ecg = await _context.ECGAnalyse
            .Where(e => e.ClinicId == clinicId
                && (e.AnalyseFileLink == link
                    || e.GeneratedFileLink == link
                    || e.GeneratedShortFileLink == link))
            .Select(e => new { e.OriginalFilename, e.AnalyseFileLink })
            .FirstOrDefaultAsync();
        if (ecg != null)
        {
            // Generatsiya qilingan fayllarning asl nomi yo'q — ular
            // yuklanmagan, biz yaratganmiz
            return (true, ecg.AnalyseFileLink == link ? ecg.OriginalFilename : null);
        }

        var lab = await _context.LabAnalyse
            .Where(e => e.ClinicId == clinicId && e.AnalyseFileLink == link)
            .Select(e => new { e.OriginalFilename }).FirstOrDefaultAsync();
        if (lab != null) return (true, lab.OriginalFilename);

        var holter = await _context.HolterAnalyses
            .Where(e => e.ClinicId == clinicId && e.AnalyseFileLink == link)
            .Select(e => new { e.OriginalFilename }).FirstOrDefaultAsync();
        if (holter != null) return (true, holter.OriginalFilename);

        var smad = await _context.SmadAnalyses
            .Where(e => e.ClinicId == clinicId && e.AnalyseFileLink == link)
            .Select(e => new { e.OriginalFilename }).FirstOrDefaultAsync();
        if (smad != null) return (true, smad.OriginalFilename);

        var diag = await _context.MedicalDiagnose
            .Where(e => e.ClinicId == clinicId && e.DiagnoseFileLink == link)
            .Select(e => new { e.OriginalFilename }).FirstOrDefaultAsync();
        if (diag != null) return (true, diag.OriginalFilename);

        return (false, null);
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
