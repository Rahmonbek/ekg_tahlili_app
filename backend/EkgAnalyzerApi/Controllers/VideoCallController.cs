using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

[ApiController]
[Route("api/videocall")]
[Authorize]
public class VideoCallController : ControllerBase
{
    private readonly MedDataDB _db;
    private readonly IVideoCallConnectionService _connections;
    private readonly IConfiguration _config;

    public VideoCallController(MedDataDB db, IVideoCallConnectionService connections, IConfiguration config)
    {
        _db = db;
        _connections = connections;
        _config = config;
    }

    // POST api/videocall/token — LiveKit token generatsiya qilish
    [HttpPost("token")]
    public async Task<IActionResult> GetToken([FromBody] VideoTokenRequestDto dto)
    {
        var userId = GetUserId();
        if (userId == 0) return Unauthorized();

        var user = await _db.Users.AsNoTracking()
            .Include(u => u.Doctor)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null) return Unauthorized();

        // Faqat Admin(2), Direktor(3), Shifokor(4)
        if (user.RoleId != 2 && user.RoleId != 3 && user.RoleId != 4)
            return Forbid();

        var apiKey = _config["LiveKit:ApiKey"] ?? "";
        var apiSecret = _config["LiveKit:ApiSecret"] ?? "";
        var liveKitUrl = _config["LiveKit:Url"] ?? "";

        var identity = $"user_{userId}";
        var token = GenerateLiveKitToken(apiKey, apiSecret, identity, dto.RoomName, dto.ParticipantName);

        return Ok(new VideoTokenResponseDto(token, liveKitUrl));
    }

    // POST api/videocall/end — sessiyani tugatish
    [HttpPost("end")]
    public async Task<IActionResult> EndCall([FromBody] EndCallRequestDto dto)
    {
        var session = await _db.VideoCallSessions
            .Where(s => s.RoomName == dto.RoomName && s.Status != "ended" && s.Status != "rejected")
            .FirstOrDefaultAsync();

        if (session != null)
        {
            session.Status = "ended";
            session.EndedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        return Ok(new { message = "ended" });
    }

    // GET api/videocall/doctors — klinikadagi shifokorlar + online holati
    [HttpGet("doctors")]
    public async Task<IActionResult> GetDoctors()
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized();

        // Faqat Admin(2) va Direktor(3)
        if (roleId != 2 && roleId != 3) return Forbid();

        var currentUser = await _db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (currentUser?.ClinicId == null) return Ok(new List<DoctorOnlineStatusDto>());

        var doctors = await _db.Users.AsNoTracking()
            .Where(u => u.ClinicId == currentUser.ClinicId && u.RoleId == 4 && u.Status)
            .Include(u => u.Doctor)
                .ThenInclude(d => d!.DoctorPositions!)
                    .ThenInclude(dp => dp.Position)
            .ToListAsync();

        var result = doctors.Select(u =>
        {
            var posObj = u.Doctor?.DoctorPositions?.FirstOrDefault()?.Position;
            var pos = posObj?.NameUz ?? posObj?.NameRu ?? "";
            var fullName = u.Doctor != null
                ? $"{u.Doctor.FirstName} {u.Doctor.LastName}".Trim()
                : u.Username;

            return new DoctorOnlineStatusDto
            {
                UserId = u.Id,
                DoctorId = u.Doctor?.Id ?? 0,
                FullName = fullName,
                Position = pos,
                IsOnline = _connections.IsOnline(u.Id)
            };
        }).ToList();

        return Ok(result);
    }

    private int GetUserId()
    {
        var claim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : 0;
    }

    private int GetRoleId()
    {
        var claim = User.Claims.FirstOrDefault(c => c.Type == "roleId")?.Value;
        return int.TryParse(claim, out var id) ? id : 0;
    }

    // LiveKit JWT token qo'lda generatsiya qilish
    private static string GenerateLiveKitToken(
        string apiKey, string apiSecret, string identity, string roomName, string displayName)
    {
        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

        var headerObj = new { alg = "HS256", typ = "JWT" };
        var payloadObj = new
        {
            iss = apiKey,
            sub = identity,
            iat = now,
            exp = now + 21600, // 6 soat
            nbf = now,
            name = displayName,
            video = new { roomJoin = true, room = roomName }
        };

        var headerJson = JsonConvert.SerializeObject(headerObj);
        var payloadJson = JsonConvert.SerializeObject(payloadObj);

        var headerB64 = Base64UrlEncode(Encoding.UTF8.GetBytes(headerJson));
        var payloadB64 = Base64UrlEncode(Encoding.UTF8.GetBytes(payloadJson));
        var signingInput = $"{headerB64}.{payloadB64}";

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(apiSecret));
        var sig = hmac.ComputeHash(Encoding.UTF8.GetBytes(signingInput));

        return $"{signingInput}.{Base64UrlEncode(sig)}";
    }

    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
