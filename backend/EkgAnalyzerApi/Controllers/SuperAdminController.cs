using EkgAnalyzerApi.Constants;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EkgAnalyzerApi.Controllers;

/// <summary>
/// SuperAdmin kabineti — butun platformani kuzatish va boshqarish
/// (`.specify/memory/tasks-superadmin.md`). Klinika filtri YO'Q, shuning
/// uchun butun kontroller faqat SuperAdmin siyosati bilan ochiladi.
/// Har bir yozuvchi so'rov `AuditMiddleware` orqali jurnalga tushadi.
/// </summary>
[ApiController]
[Route("api/superadmin")]
[Authorize(Policy = RoleConstants.PolicySuperAdmin)]
public class SuperAdminController : ControllerBase
{
    private readonly SuperAdminService _service;
    private readonly ICurrentUser _currentUser;
    private readonly TokenService _tokenService;
    private readonly AuditLogService _audit;
    private readonly ILogger<SuperAdminController> _logger;

    public SuperAdminController(SuperAdminService service, ICurrentUser currentUser,
        TokenService tokenService, AuditLogService audit, ILogger<SuperAdminController> logger)
    {
        _service = service;
        _currentUser = currentUser;
        _tokenService = tokenService;
        _audit = audit;
        _logger = logger;
    }

    /// <summary>Kutilgan rad javoblarini (<see cref="SuperAdminException"/>) HTTP kodga aylantiradi.</summary>
    private async Task<IActionResult> Run(Func<Task<object?>> action)
    {
        try
        {
            var result = await action();
            return Ok(result ?? new { ok = true });
        }
        catch (SuperAdminException ex)
        {
            return StatusCode(ex.StatusCode, new { message = ex.Message });
        }
    }

    // ── Statistika ──────────────────────────────────────────────────────

    [HttpGet("overview")]
    public Task<IActionResult> Overview([FromQuery] int days = 30)
        => Run(async () => await _service.GetOverviewAsync(days));

    [HttpGet("ai-usage")]
    public Task<IActionResult> AiUsage([FromQuery] int days = 30)
        => Run(async () => await _service.GetAiUsageAsync(days));

    // ── Klinikalar ──────────────────────────────────────────────────────

    [HttpGet("clinics")]
    public Task<IActionResult> Clinics([FromQuery] string? search, [FromQuery] bool? active,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        => Run(async () => await _service.GetClinicsAsync(search, active, page, pageSize));

    [HttpGet("clinics/{id:int}")]
    public Task<IActionResult> Clinic(int id) => Run(async () => await _service.GetClinicAsync(id));

    [HttpPost("clinics")]
    public Task<IActionResult> CreateClinic([FromBody] SaClinicUpsertDto dto)
        => Run(async () => new { id = await _service.CreateClinicAsync(dto) });

    [HttpPut("clinics/{id:int}")]
    public Task<IActionResult> UpdateClinic(int id, [FromBody] SaClinicUpsertDto dto)
        => Run(async () => { await _service.UpdateClinicAsync(id, dto); return null; });

    [HttpPatch("clinics/{id:int}/active")]
    public Task<IActionResult> SetClinicActive(int id, [FromQuery] bool isActive)
        => Run(async () => { await _service.SetClinicActiveAsync(id, isActive); return new { id, isActive }; });

    [HttpDelete("clinics/{id:int}")]
    public Task<IActionResult> DeleteClinic(int id)
        => Run(async () => { await _service.DeleteClinicAsync(id); return null; });

    // ── Xodimlar ────────────────────────────────────────────────────────

    [HttpGet("users")]
    public Task<IActionResult> Users([FromQuery] string? search, [FromQuery] int? roleId,
        [FromQuery] int? clinicId, [FromQuery] bool? status,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        => Run(async () => await _service.GetUsersAsync(search, roleId, clinicId, status, page, pageSize));

    [HttpPost("users")]
    public Task<IActionResult> CreateUser([FromBody] SaUserUpsertDto dto)
        => Run(async () => new { id = await _service.CreateUserAsync(dto) });

    [HttpPut("users/{id:int}")]
    public Task<IActionResult> UpdateUser(int id, [FromBody] SaUserUpsertDto dto)
        => Run(async () => { await _service.UpdateUserAsync(id, dto, _currentUser.UserId); return null; });

    [HttpPost("users/{id:int}/password")]
    public Task<IActionResult> SetPassword(int id, [FromBody] SaPasswordDto dto)
        => Run(async () => { await _service.SetPasswordAsync(id, dto); return null; });

    [HttpPatch("users/{id:int}/status")]
    public Task<IActionResult> SetUserStatus(int id, [FromQuery] bool status)
        => Run(async () => { await _service.SetUserStatusAsync(id, status, _currentUser.UserId); return new { id, status }; });

    [HttpDelete("users/{id:int}")]
    public Task<IActionResult> DeleteUser(int id)
        => Run(async () => { await _service.DeleteUserAsync(id, _currentUser.UserId); return null; });

    /// <summary>
    /// Xodim sifatida kirish (SA-07): shu foydalanuvchi tokeni qaytariladi.
    /// Klinika sahifalarini xodim ko'zi bilan ko'rish uchun; har chaqiruv
    /// audit jurnaliga ALOHIDA yoziladi (kim kimning nomidan kirdi).
    /// </summary>
    [HttpPost("users/{id:int}/impersonate")]
    public Task<IActionResult> Impersonate(int id) => Run(async () =>
    {
        var user = await _service.GetUserForTokenAsync(id);
        await _audit.LogAsync(_currentUser.UserId, User.Identity?.Name, "IMPERSONATE",
            entityType: "User", entityId: id.ToString(),
            ipAddress: HttpContext.Connection.RemoteIpAddress?.ToString(),
            requestPath: Request.Path, httpMethod: Request.Method, responseStatus: 200);
        _logger.LogWarning("SuperAdmin {AdminId} foydalanuvchi {UserId} sifatida kirdi", _currentUser.UserId, id);
        return new { token = _tokenService.GenerateToken(user), userId = user.Id };
    });

    // ── Bemorlar ────────────────────────────────────────────────────────

    [HttpGet("patients")]
    public Task<IActionResult> Patients([FromQuery] string? search, [FromQuery] int? clinicId,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        => Run(async () => await _service.GetPatientsAsync(search, clinicId, page, pageSize));

    [HttpPut("patients/{id:int}")]
    public Task<IActionResult> UpdatePatient(int id, [FromBody] SaPatientUpdateDto dto)
        => Run(async () => { await _service.UpdatePatientAsync(id, dto); return null; });

    [HttpDelete("patients/{id:int}")]
    public Task<IActionResult> DeletePatient(int id)
        => Run(async () => { await _service.DeletePatientAsync(id); return null; });

    // ── Tahlillar ───────────────────────────────────────────────────────

    [HttpGet("analyses")]
    public Task<IActionResult> Analyses([FromQuery] SaAnalysesFilter filter)
        => Run(async () => await _service.GetAnalysesAsync(filter));

    [HttpGet("analyses/{type}/{id:int}")]
    public Task<IActionResult> Analysis(string type, int id)
        => Run(async () => await _service.GetAnalysisAsync(type.ToLowerInvariant(), id));

    [HttpDelete("analyses/{type}/{id:int}")]
    public Task<IActionResult> DeleteAnalysis(string type, int id, [FromBody] SaDeleteDto? body)
        => Run(async () =>
        {
            await _service.DeleteAnalysisAsync(type.ToLowerInvariant(), id, body?.Reason,
                _currentUser.UserId, User.Identity?.Name);
            return null;
        });

    [HttpPost("analyses/{type}/{id:int}/restore")]
    public Task<IActionResult> RestoreAnalysis(string type, int id)
        => Run(async () => { await _service.RestoreAnalysisAsync(type.ToLowerInvariant(), id, _currentUser.UserId); return null; });

    // ── Spravochniklar ──────────────────────────────────────────────────

    [HttpGet("dictionaries/{kind}")]
    public Task<IActionResult> Dictionary(string kind) => Run(async () => await _service.GetDictionaryAsync(kind));

    [HttpPost("dictionaries/{kind}")]
    public Task<IActionResult> CreateDictionary(string kind, [FromBody] SaDictionaryDto dto)
        => Run(async () => new { id = await _service.UpsertDictionaryAsync(kind, null, dto) });

    [HttpPut("dictionaries/{kind}/{id:int}")]
    public Task<IActionResult> UpdateDictionary(string kind, int id, [FromBody] SaDictionaryDto dto)
        => Run(async () => new { id = await _service.UpsertDictionaryAsync(kind, id, dto) });

    [HttpDelete("dictionaries/{kind}/{id:int}")]
    public Task<IActionResult> DeleteDictionary(string kind, int id)
        => Run(async () => { await _service.DeleteDictionaryAsync(kind, id); return null; });

    [HttpGet("lab-value-types")]
    public Task<IActionResult> LabValueTypes() => Run(async () => await _service.GetLabValueTypesAsync());

    [HttpPost("lab-value-types")]
    public Task<IActionResult> CreateLabValueType([FromBody] SaLabValueTypeDto dto)
        => Run(async () => new { id = await _service.UpsertLabValueTypeAsync(null, dto) });

    [HttpPut("lab-value-types/{id:int}")]
    public Task<IActionResult> UpdateLabValueType(int id, [FromBody] SaLabValueTypeDto dto)
        => Run(async () => new { id = await _service.UpsertLabValueTypeAsync(id, dto) });

    [HttpDelete("lab-value-types/{id:int}")]
    public Task<IActionResult> DeleteLabValueType(int id)
        => Run(async () => { await _service.DeleteLabValueTypeAsync(id); return null; });
}
