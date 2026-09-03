using System.Security.Cryptography;
using System.Text;
using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using Microsoft.EntityFrameworkCore;

namespace EkgAnalyzerApi.Services;

/// <summary>
/// Kompleks (ko'p tahlilli) AI xulosasi.
///
/// Bemor kartasida shifokor bir nechta tahlilni belgilaydi (masalan ikkita
/// EKG, bitta laboratoriya, bitta SMAD va bitta Holter) va ularni BIRGALIKDA
/// tahlil qilishga yuboradi. AI ularni alohida emas, yagona klinik manzara
/// sifatida ko'rib chiqadi va yakuniy xulosa beradi.
///
/// Bu servis faqat .NET tomonini bajaradi: tekshirish, yozuv yaratish va
/// takrorni oldini olish. AI chaqiruvining o'zi Python tomonda
/// (`combined_analyses_api.py`) — arxitektura qoidasi bo'yicha OpenAI ga
/// murojaat faqat Python orqali.
/// </summary>
public class CombinedAnalysisService
{
    /// <summary>
    /// Qo'llab-quvvatlanadigan tahlil turlari.
    ///
    /// Parazitologiya ataylab yo'q: uning holati satr (`pending`/`analyzed`),
    /// AI natijasi boshqa ustunda (`ai_response`) va u bemor kartasi
    /// lentasida ham ko'rsatilmaydi. Kerak bo'lsa alohida vazifa sifatida.
    /// </summary>
    public static readonly string[] SupportedTypes = { "ecg", "holter", "smad", "lab" };

    /// <summary>Kamida shuncha tahlil bo'lmasa "kompleks" tahlilning ma'nosi yo'q.</summary>
    public const int MinItems = 2;

    /// <summary>
    /// Yuqori chegara — token sarfini va so'rov vaqtini cheklaydi.
    /// Bundan ko'p tahlil kerak bo'lsa, ularni ikkita xulosaga bo'lish kerak.
    /// </summary>
    public const int MaxItems = 10;

    private readonly MedDataDB _context;
    private readonly ILogger<CombinedAnalysisService> _logger;

    public CombinedAnalysisService(MedDataDB context, ILogger<CombinedAnalysisService> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>Yaratish natijasi: xatolik matni yoki tayyor yozuv.</summary>
    public record CreateResult(CombinedAnalysis? Entity, string? Error, bool Reused);

    /// <summary>
    /// So'rovni tekshiradi va yangi kompleks tahlil yozuvini yaratadi.
    /// Aynan shu to'plam uchun tayyor xulosa allaqachon bo'lsa — yangisini
    /// yaratmasdan mavjudini qaytaradi (<c>Reused = true</c>).
    /// </summary>
    public async Task<CreateResult> CreateAsync(
        CombinedAnalysisCreateRequest request, int userId, CancellationToken ct = default)
    {
        var doctor = await _context.Doctors.AsNoTracking()
            .FirstOrDefaultAsync(d => d.UserId == userId, ct);
        if (doctor == null)
            return new CreateResult(null, "Xodim yozuvi topilmadi", false);

        var user = await _context.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user?.ClinicId == null)
            return new CreateResult(null, "Klinika aniqlanmadi", false);

        var patientExists = await _context.Patcients.AnyAsync(p => p.Id == request.PatientId, ct);
        if (!patientExists)
            return new CreateResult(null, "Bemor topilmadi", false);

        // Takrorlarni olib tashlaymiz: bir tahlil ikki marta tanlangan bo'lishi mumkin
        var refs = (request.Items ?? new List<CombinedAnalysisItemRefDTO>())
            .Where(i => !string.IsNullOrWhiteSpace(i.Type) && i.Id > 0)
            .Select(i => new CombinedAnalysisItemRefDTO { Type = i.Type.Trim().ToLowerInvariant(), Id = i.Id })
            .GroupBy(i => (i.Type, i.Id))
            .Select(g => g.First())
            .ToList();

        if (refs.Count < MinItems)
            return new CreateResult(null, $"Kamida {MinItems} ta tahlil tanlang", false);

        if (refs.Count > MaxItems)
            return new CreateResult(null, $"Ko'pi bilan {MaxItems} ta tahlil tanlash mumkin", false);

        var unsupported = refs.Where(r => !SupportedTypes.Contains(r.Type))
            .Select(r => r.Type).Distinct().ToList();
        if (unsupported.Count > 0)
            return new CreateResult(null,
                $"Qo'llab-quvvatlanmaydigan tahlil turi: {string.Join(", ", unsupported)}", false);

        // Har bir tahlil shu bemorga tegishlimi va AI natijasi tayyormi?
        var loaded = new List<SourceAnalysis>();
        foreach (var r in refs)
        {
            var src = await LoadSourceAsync(r.Type, r.Id, ct);
            if (src == null || src.PatientId != request.PatientId)
                return new CreateResult(null,
                    $"Tahlil topilmadi yoki bu bemorga tegishli emas: {r.Type}#{r.Id}", false);

            if (src.Status != 2 || string.IsNullOrWhiteSpace(src.AiAnswerData))
                return new CreateResult(null,
                    $"Tahlilning AI natijasi tayyor emas: {r.Type}#{r.Id}. "
                    + "Faqat tahlil qilingan yozuvlarni birlashtirish mumkin.", false);

            loaded.Add(src);
        }

        // Rejim tanlovi YO'Q — kompleks tahlil DOIM chuqur rejimda bajariladi
        // (loyiha egasining qarori): AI ga tayyor xulosalar bilan birga
        // EKG rasm fayllari ham yuboriladi. Ustun saqlanadi, chunki eski
        // yozuvlarda `summary` qiymati bor va ular o'zgarmasligi kerak.
        const string mode = "deep";
        var lang = NormalizeLang(request.Lang);
        var fingerprint = Fingerprint(loaded);

        // TAKRORNI OLDINI OLISH.
        //
        // Qidiruv AYNAN TANLANGAN TAHLILLAR TO'PLAMI bo'yicha: kim
        // yuborgani, qachon yuborgani va qaysi tilda ekani AHAMIYATSIZ
        // (loyiha egasining talabi — dublikat kerak emas). Shuning uchun
        // `source_fingerprint` bo'yicha emas: unda til ham bor edi va
        // ruscha interfeysdagi shifokor o'zbekchasi bor to'plamni qayta
        // yuborsa dublikat yaratilardi.
        //
        // `Status == 2` (tayyor) va `Status is 0 or 1` (navbatda/ishlanmoqda)
        // ikkalasi ham hisobga olinadi: ikkinchisisiz tugmani ikki marta
        // bosish ikkita bir xil yozuv yaratardi.
        var wanted = loaded.Select(x => $"{x.Type}#{x.Id}").ToHashSet();

        var candidates = await _context.CombinedAnalyses
            .Include(c => c.Items)
            .Include(c => c.CreatedDoctor)
            .Where(c => c.PatientId == request.PatientId
                && c.Status >= 0
                && c.Items.Count == wanted.Count)
            .OrderByDescending(c => c.Id)
            .ToListAsync(ct);

        var existing = candidates.FirstOrDefault(c =>
            c.Items.Select(i => $"{i.AnalysisType}#{i.AnalysisId}").ToHashSet().SetEquals(wanted));

        if (existing != null)
        {
            _logger.LogInformation(
                "Kompleks tahlil allaqachon mavjud: id={Id} bemor={PatientId} tahlillar={Items}",
                existing.Id, request.PatientId, string.Join(",", wanted.OrderBy(x => x)));
            return new CreateResult(existing, null, true);
        }

        var now = DateTime.UtcNow;
        var entity = new CombinedAnalysis
        {
            PatientId = request.PatientId,
            ClinicId = user.ClinicId.Value,
            CreatedDoctorId = doctor.Id,
            Status = 0,
            Mode = mode,
            AiLang = lang,
            SourceFingerprint = fingerprint,
            CreatedAt = now,
            UpdatedAt = now,
            Items = loaded.Select(s => new CombinedAnalysisItem
            {
                AnalysisType = s.Type,
                AnalysisId = s.Id,
                SnapshotDate = s.AnalysisDate ?? s.CreatedAt,
                SnapshotSeverity = AiSeverity.Parse(s.AiAnswerData),
            }).ToList(),
        };

        _context.CombinedAnalyses.Add(entity);
        await _context.SaveChangesAsync(ct);

        return new CreateResult(entity, null, false);
    }

    /// <summary>Bemorning barcha kompleks xulosalari (yangisi yuqorida).</summary>
    public async Task<List<CombinedAnalysisListItemDTO>> GetByPatientAsync(
        int patientId, CancellationToken ct = default)
    {
        var rows = await _context.CombinedAnalyses.AsNoTracking()
            .Include(c => c.Items)
            .Include(c => c.CreatedDoctor)
            .Where(c => c.PatientId == patientId)
            .OrderByDescending(c => c.Id)
            .ToListAsync(ct);

        return rows.Select(ToListItem).ToList();
    }

    /// <summary>
    /// Kompleks xulosalarning UMUMIY ro'yxati — alohida sahifa uchun.
    ///
    /// Rol bo'yicha cheklov <see cref="PatientVisibility"/> dan olinadi:
    /// foydalanuvchi bemorlar ro'yxatida qaysi bemorlarni ko'rsa, shu
    /// bemorlarning kompleks xulosalarini ham ko'radi. Ya'ni shifokor
    /// o'zi ishlagan bemorlarnikini, hamshira o'zi yuklagan tahlillar
    /// egalarinikini, admin/direktor esa butun klinikanikini.
    /// </summary>
    public async Task<PagedResult<CombinedAnalysisRowDTO>> GetListAsync(
        int userId, int page = 1, int pageSize = 10,
        string? search = null, CancellationToken ct = default)
    {
        var user = await _context.Users.AsNoTracking()
            .Include(u => u.Doctor)
            .FirstOrDefaultAsync(u => u.Id == userId, ct);

        if (user == null)
            return new PagedResult<CombinedAnalysisRowDTO>
            {
                Items = new List<CombinedAnalysisRowDTO>(), TotalCount = 0,
                Page = page, PageSize = pageSize
            };

        var visibleIds = PatientVisibility.VisiblePatientIds(_context, user);

        var query = _context.CombinedAnalyses.AsNoTracking()
            .Include(c => c.Items)
            .Include(c => c.CreatedDoctor)
            .Include(c => c.Patient)
            .Where(c => visibleIds.Contains(c.PatientId));

        if (!string.IsNullOrWhiteSpace(search))
        {
            // Passport shifrlangan bo'lishi mumkin — bu yerda faqat F.I.SH.
            // bo'yicha qidiriladi (bemorlar ro'yxatidagi bilan bir xil qoida)
            var words = search.Trim().ToLower()
                .Split(' ', StringSplitOptions.RemoveEmptyEntries);
            foreach (var word in words)
            {
                query = query.Where(c =>
                    (c.Patient!.FirstName != null && c.Patient.FirstName.ToLower().Contains(word)) ||
                    (c.Patient!.LastName != null && c.Patient.LastName.ToLower().Contains(word)) ||
                    (c.Patient!.SureName != null && c.Patient.SureName.ToLower().Contains(word)));
            }
        }

        var totalCount = await query.CountAsync(ct);

        var rows = await query
            .OrderByDescending(c => c.Id)
            .ApplyPaging(page, pageSize)
            .ToListAsync(ct);

        var items = rows.Select(c =>
        {
            var basic = ToListItem(c);
            return new CombinedAnalysisRowDTO
            {
                Id = basic.Id,
                Status = basic.Status,
                Mode = basic.Mode,
                CreatedAt = basic.CreatedAt,
                AiLang = basic.AiLang,
                AIStatus = basic.AIStatus,
                AiSummary = basic.AiSummary,
                ErrorReason = basic.ErrorReason,
                ItemCount = basic.ItemCount,
                DoctorName = basic.DoctorName,
                Items = basic.Items,
                PatientId = c.PatientId,
                PatientFirstName = c.Patient?.FirstName,
                PatientLastName = c.Patient?.LastName,
                PatientSureName = c.Patient?.SureName,
                PatientBirthDate = c.Patient?.BirthDate,
                PatientGender = c.Patient?.Gender ?? false,
            };
        }).ToList();

        return new PagedResult<CombinedAnalysisRowDTO>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
        };
    }

    /// <summary>Bitta kompleks xulosa — to'liq JSON javobi bilan.</summary>
    public async Task<CombinedAnalysisDetailDTO?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var c = await _context.CombinedAnalyses.AsNoTracking()
            .Include(x => x.Items)
            .Include(x => x.CreatedDoctor)
            .Include(x => x.Patient)
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        if (c == null) return null;

        var basic = ToListItem(c);
        var dto = new CombinedAnalysisDetailDTO
        {
            Id = basic.Id,
            Status = basic.Status,
            Mode = basic.Mode,
            CreatedAt = basic.CreatedAt,
            AiLang = basic.AiLang,
            AIStatus = basic.AIStatus,
            AiSummary = basic.AiSummary,
            ErrorReason = basic.ErrorReason,
            ItemCount = basic.ItemCount,
            DoctorName = basic.DoctorName,
            Items = basic.Items,
            PatientId = c.PatientId,
            PatientFirstName = c.Patient?.FirstName,
            PatientLastName = c.Patient?.LastName,
            PatientSureName = c.Patient?.SureName,
            PatientBirthDate = c.Patient?.BirthDate,
            PatientGender = c.Patient?.Gender ?? false,
            ModelUsed = c.ModelUsed,
            AIAnswerData = c.AIAnswerData,
        };

        // Manba tahlil o'chirilganmi? Snapshot saqlangan, lekin havola
        // ishlamasligini frontend bilishi kerak (tugmani o'chirib qo'yadi).
        foreach (var item in dto.Items)
            item.Exists = await SourceExistsAsync(item.Type, item.AnalysisId, ct);

        return dto;
    }

    /// <summary>Kompleks xulosani o'chiradi. Tarkib kaskad bilan o'chadi.</summary>
    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
    {
        var entity = await _context.CombinedAnalyses.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (entity == null) return false;

        _context.CombinedAnalyses.Remove(entity);
        await _context.SaveChangesAsync(ct);
        return true;
    }

    // ── Ichki yordamchilar ───────────────────────────────────────────────────

    private static CombinedAnalysisListItemDTO ToListItem(CombinedAnalysis c)
    {
        // Boshqa modullardagi bilan bir xil qoida: "tayyor" deyilgan-u,
        // javob bo'sh bo'lsa — bu soxta "tayyor", xatolik deb ko'rsatiladi.
        var status = c.Status == 2 && string.IsNullOrWhiteSpace(c.AIAnswerData) ? -1 : c.Status;

        return new CombinedAnalysisListItemDTO
        {
            Id = c.Id,
            Status = status,
            Mode = c.Mode,
            CreatedAt = c.CreatedAt,
            AiLang = c.AiLang,
            AIStatus = AiSeverity.Parse(c.AIAnswerData),
            AiSummary = AiSeverity.Conclusion(c.AIAnswerData),
            ErrorReason = status == -1 ? AiSeverity.ExtractErrorMessage(c.AIAnswerData) : null,
            ItemCount = c.Items?.Count ?? 0,
            DoctorName = c.CreatedDoctor == null
                ? null
                : $"{c.CreatedDoctor.LastName} {c.CreatedDoctor.FirstName}".Trim(),
            Items = (c.Items ?? new List<CombinedAnalysisItem>())
                .OrderBy(i => i.SnapshotDate)
                .Select(i => new CombinedAnalysisItemDTO
                {
                    Type = i.AnalysisType,
                    AnalysisId = i.AnalysisId,
                    Date = i.SnapshotDate,
                    Severity = i.SnapshotSeverity,
                })
                .ToList(),
        };
    }

    private record SourceAnalysis(
        string Type, int Id, int PatientId, int Status,
        string? AiAnswerData, DateTime? AnalysisDate, DateTime? CreatedAt, DateTime? UpdatedAt);

    private async Task<SourceAnalysis?> LoadSourceAsync(string type, int id, CancellationToken ct)
    {
        switch (type)
        {
            case "ecg":
                return await _context.ECGAnalyse.AsNoTracking().Where(a => a.Id == id)
                    .Select(a => new SourceAnalysis("ecg", a.Id, a.PatcientId, a.Status ?? 0,
                        a.AIAnswerData, a.AnalysisDate, a.CreatedAt, a.UpdatedAt))
                    .FirstOrDefaultAsync(ct);
            case "holter":
                return await _context.HolterAnalyses.AsNoTracking().Where(a => a.Id == id)
                    .Select(a => new SourceAnalysis("holter", a.Id, a.PatcientId, a.Status ?? 0,
                        a.AIAnswerData, a.AnalysisDate, a.CreatedAt, a.UpdatedAt))
                    .FirstOrDefaultAsync(ct);
            case "smad":
                return await _context.SmadAnalyses.AsNoTracking().Where(a => a.Id == id)
                    .Select(a => new SourceAnalysis("smad", a.Id, a.PatcientId, a.Status ?? 0,
                        a.AIAnswerData, a.AnalysisDate, a.CreatedAt, a.UpdatedAt))
                    .FirstOrDefaultAsync(ct);
            case "lab":
                return await _context.LabAnalyse.AsNoTracking().Where(a => a.Id == id)
                    .Select(a => new SourceAnalysis("lab", a.Id, a.PatcientId, a.Status ?? 0,
                        a.AIAnswerData, a.AnalysisDate, a.CreatedAt, a.UpdatedAt))
                    .FirstOrDefaultAsync(ct);
            default:
                return null;
        }
    }

    private async Task<bool> SourceExistsAsync(string type, int id, CancellationToken ct) => type switch
    {
        "ecg" => await _context.ECGAnalyse.AnyAsync(a => a.Id == id, ct),
        "holter" => await _context.HolterAnalyses.AnyAsync(a => a.Id == id, ct),
        "smad" => await _context.SmadAnalyses.AnyAsync(a => a.Id == id, ct),
        "lab" => await _context.LabAnalyse.AnyAsync(a => a.Id == id, ct),
        _ => false,
    };

    /// <summary>
    /// To'plamning MAZMUN barmoq izi: qaysi tahlillar va ular oxirgi
    /// marta qachon yangilangani.
    ///
    /// Takrorni aniqlashda ISHLATILMAYDI (u to'plamning o'zi bo'yicha
    /// qidiradi) — bu qiymat diagnostika uchun: manba tahlil qayta
    /// tahlil qilingan bo'lsa, barmoq izi mavjud xulosanikidan farq
    /// qiladi va xulosa eskirganini ko'rsatadi.
    /// </summary>
    private static string Fingerprint(IEnumerable<SourceAnalysis> items)
    {
        var payload = string.Join("|", items
            .OrderBy(i => i.Type, StringComparer.Ordinal).ThenBy(i => i.Id)
            .Select(i => $"{i.Type}:{i.Id}:{i.UpdatedAt?.Ticks ?? 0}"));

        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(payload))).ToLowerInvariant();
    }

    private static string NormalizeLang(string? lang) => lang?.Trim().ToLowerInvariant() switch
    {
        "ru" => "ru",
        "en" => "en",
        _ => "uz",
    };
}
