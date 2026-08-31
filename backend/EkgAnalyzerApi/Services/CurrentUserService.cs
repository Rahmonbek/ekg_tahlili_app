using System.Security.Claims;
using EkgAnalyzerApi.Data;
using Microsoft.EntityFrameworkCore;

namespace EkgAnalyzerApi.Services;

/// <summary>
/// Joriy so'rovni yuborayotgan foydalanuvchi haqidagi ma'lumot.
///
/// Nima uchun kerak: ilgari har bir controller JWT claim'larini o'zi o'qib,
/// klinikani o'zi aniqlab olardi. Natijada ba'zi endpointlarda klinika
/// tekshiruvi umuman unutilgan va boshqa klinika ma'lumotlari ochiq qolgan edi.
/// Bu xizmat shu mantiqni bitta joyga yig'adi.
/// </summary>
public interface ICurrentUser
{
    /// <summary>JWT dagi foydalanuvchi ID si. Autentifikatsiyadan o'tmagan bo'lsa 0.</summary>
    int UserId { get; }

    /// <summary>JWT dagi rol ID si (1..5). Aniqlanmasa 0.</summary>
    int RoleId { get; }

    bool IsAuthenticated { get; }

    /// <summary>Foydalanuvchining klinikasi. Bazadan o'qiladi va so'rov davomida keshlanadi.</summary>
    Task<int?> GetClinicIdAsync(CancellationToken ct = default);

    /// <summary>Klinika aniqlanmasa <see cref="UnauthorizedAccessException"/> chiqaradi.</summary>
    Task<int> RequireClinicIdAsync(CancellationToken ct = default);

    /// <summary>Joriy foydalanuvchiga tegishli `doctors` yozuvi ID si (bo'lmasa null).</summary>
    Task<int?> GetDoctorIdAsync(CancellationToken ct = default);
}

public class CurrentUserService : ICurrentUser
{
    private readonly IHttpContextAccessor _accessor;
    private readonly MedDataDB _context;

    private int? _clinicId;
    private bool _clinicLoaded;
    private int? _doctorId;
    private bool _doctorLoaded;

    public CurrentUserService(IHttpContextAccessor accessor, MedDataDB context)
    {
        _accessor = accessor;
        _context = context;
    }

    private ClaimsPrincipal? Principal => _accessor.HttpContext?.User;

    public int UserId =>
        int.TryParse(Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : 0;

    public int RoleId =>
        int.TryParse(Principal?.FindFirst("roleId")?.Value, out var role) ? role : 0;

    public bool IsAuthenticated => UserId > 0;

    public async Task<int?> GetClinicIdAsync(CancellationToken ct = default)
    {
        if (_clinicLoaded) return _clinicId;

        var userId = UserId;
        if (userId > 0)
        {
            _clinicId = await _context.Users
                .AsNoTracking()
                .Where(u => u.Id == userId)
                .Select(u => u.ClinicId)
                .FirstOrDefaultAsync(ct);
        }

        _clinicLoaded = true;
        return _clinicId;
    }

    public async Task<int> RequireClinicIdAsync(CancellationToken ct = default)
    {
        var clinicId = await GetClinicIdAsync(ct);
        if (clinicId == null)
            throw new UnauthorizedAccessException("Foydalanuvchining klinikasi aniqlanmadi.");
        return clinicId.Value;
    }

    public async Task<int?> GetDoctorIdAsync(CancellationToken ct = default)
    {
        if (_doctorLoaded) return _doctorId;

        var userId = UserId;
        if (userId > 0)
        {
            var id = await _context.Doctors
                .AsNoTracking()
                .Where(d => d.UserId == userId)
                .Select(d => (int?)d.Id)
                .FirstOrDefaultAsync(ct);
            _doctorId = id;
        }

        _doctorLoaded = true;
        return _doctorId;
    }
}
