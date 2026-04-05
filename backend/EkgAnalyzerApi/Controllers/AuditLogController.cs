using EkgAnalyzerApi.Constants;
using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

[ApiController]
[Route("api/audit-logs")]
[Authorize]
public class AuditLogController : ControllerBase
{
    private readonly MedDataDB _context;

    public AuditLogController(MedDataDB context)
    {
        _context = context;
    }

    /// <summary>
    /// Audit loglarni ko'rish (faqat Admin va SuperAdmin uchun)
    /// GET api/audit-logs?page=1&action=LOGIN&userId=5
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
        // Faqat admin va super admin ko'rishi mumkin
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var currentUserId))
            return Unauthorized(new { message = "Token invalid" });

        var currentUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == currentUserId);
        if (currentUser == null)
            return Unauthorized(new { message = "User not found" });

        if (currentUser.RoleId != RoleConstants.Admin && currentUser.RoleId != RoleConstants.SuperAdmin)
            return Forbid();

        // Query
        var query = _context.AuditLogs.AsQueryable();

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
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
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
            currentPage = page
        });
    }
}
