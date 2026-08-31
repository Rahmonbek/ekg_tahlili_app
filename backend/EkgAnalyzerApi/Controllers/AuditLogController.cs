using EkgAnalyzerApi.Constants;
using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/audit-logs")]
[Authorize]
public class AuditLogController : ControllerBase
{
    private readonly MedDataDB _context;
    private readonly ICurrentUser _currentUser;

    public AuditLogController(MedDataDB context, ICurrentUser currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    /// <summary>
    /// Audit jurnali. Admin/Direktor — faqat O'Z KLINIKASI xodimlarining
    /// harakatlari; SuperAdmin — butun platforma bo'yicha.
    ///
    /// Ilgari so'rov klinika bo'yicha umuman filtrlanmasdi: bir klinikaning
    /// admini boshqa klinikalarning foydalanuvchi nomlarini, IP manzillarini
    /// va harakatlarini ko'ra olardi.
    ///
    /// GET api/audit-logs?page=1&amp;action=LOGIN&amp;userId=5
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAuditLogs(
        int page = 1,
        int pageSize = 20,
        string? action = null,
        int? userId = null,
        string? entityType = null,
        DateTime? fromDate = null,
        DateTime? toDate = null)
    {
        var currentUserId = _currentUser.UserId;
        if (currentUserId <= 0)
            return Unauthorized(new { message = "Token invalid" });

        var currentUser = await _context.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == currentUserId);
        if (currentUser == null)
            return Unauthorized(new { message = "User not found" });

        // Audit jurnali — platforma darajasidagi vosita, faqat SuperAdmin
        var isSuperAdmin = currentUser.RoleId == RoleConstants.SuperAdmin;
        if (!isSuperAdmin)
            return Forbid();

        (page, pageSize) = Paging.Normalize(page, pageSize);

        var query = _context.AuditLogs.AsNoTracking().AsQueryable();

        // ── Ko'p ijarachilik: o'z klinikasi xodimlari bilan cheklaymiz ──
        if (!isSuperAdmin)
        {
            if (currentUser.ClinicId == null)
                return Unauthorized(new { message = "Klinika aniqlanmadi" });

            var clinicUserIds = _context.Users
                .Where(u => u.ClinicId == currentUser.ClinicId)
                .Select(u => (int?)u.Id);

            query = query.Where(l => l.UserId != null && clinicUserIds.Contains(l.UserId));
        }

        if (!string.IsNullOrEmpty(action))
            query = query.Where(l => l.Action == action.ToUpper());

        if (userId.HasValue)
            query = query.Where(l => l.UserId == userId.Value);

        if (!string.IsNullOrEmpty(entityType))
            query = query.Where(l => l.EntityType == entityType);

        if (fromDate.HasValue)
            query = query.Where(l => l.CreatedAt >= fromDate.Value.ToUniversalTime());

        if (toDate.HasValue)
            query = query.Where(l => l.CreatedAt <= toDate.Value.ToUniversalTime());

        var totalCount = await query.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var logs = await query
            .OrderByDescending(l => l.CreatedAt)
            .ApplyPaging(page, pageSize)
            .Select(l => new
            {
                l.Id,
                l.UserId,
                l.Username,
                l.Action,
                l.EntityType,
                l.EntityId,
                l.RequestPath,
                l.HttpMethod,
                l.ResponseStatus,
                l.IpAddress,
                l.CreatedAt
            })
            .ToListAsync();

        return Ok(new
        {
            data = logs,
            totalCount,
            totalPages,
            currentPage = page,
            pageSize
        });
    }

    /// <summary>
    /// Jurnalda uchraydigan amallar ro'yxati — filtr uchun.
    /// Ular ham foydalanuvchi ko'ra oladigan doiradan olinadi.
    /// </summary>
    [HttpGet("actions")]
    public async Task<IActionResult> GetActions()
    {
        var currentUserId = _currentUser.UserId;
        if (currentUserId <= 0)
            return Unauthorized(new { message = "Token invalid" });

        var currentUser = await _context.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == currentUserId);
        if (currentUser == null) return Unauthorized(new { message = "User not found" });

        var isSuperAdmin = currentUser.RoleId == RoleConstants.SuperAdmin;
        if (!isSuperAdmin)
            return Forbid();

        var query = _context.AuditLogs.AsNoTracking().AsQueryable();
        if (!isSuperAdmin)
        {
            var clinicUserIds = _context.Users
                .Where(u => u.ClinicId == currentUser.ClinicId)
                .Select(u => (int?)u.Id);
            query = query.Where(l => l.UserId != null && clinicUserIds.Contains(l.UserId));
        }

        var actions = await query
            .Select(l => l.Action)
            .Distinct()
            .OrderBy(a => a)
            .ToListAsync();

        return Ok(actions);
    }
}
