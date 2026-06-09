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
    private readonly EncryptionService _encryption;

    public VideoCallController(
        MedDataDB db,
        IVideoCallConnectionService connections,
        IConfiguration config,
        EncryptionService encryption)
    {
        _db = db;
        _connections = connections;
        _config = config;
        _encryption = encryption;
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

        var linkedConsultantUserIds = await _db.ClinicConsultants.AsNoTracking()
            .Where(cc => cc.ClinicId == currentUser.ClinicId && cc.Status == "active")
            .Select(cc => cc.Doctor!.UserId)
            .ToListAsync();

        var doctors = await _db.Users.AsNoTracking()
            .Where(u => u.RoleId == 4 && u.Status &&
                       (u.ClinicId == currentUser.ClinicId || linkedConsultantUserIds.Contains(u.Id)))
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
                IsOnline = _connections.IsOnline(u.Id),
                IsBusy = _db.VideoCallSessions.Any(s =>
                    (s.Status == "pending" || s.Status == "active") &&
                    (s.InitiatorId == u.Id || s.RecipientId == u.Id))
            };
        }).ToList();

        return Ok(result);
    }

    [HttpPost("conferences")]
    public async Task<IActionResult> CreateConference([FromBody] CreateVideoConferenceDto dto)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized();
        if (roleId != 2 && roleId != 3) return Forbid();

        if (dto.PatientId <= 0)
            return BadRequest(new { message = "patient_required" });

        var doctorIds = dto.DoctorIds.Distinct().Where(id => id > 0).ToList();
        if (!doctorIds.Any())
            return BadRequest(new { message = "select_consultants" });

        var clinicId = await GetUserClinicIdAsync(userId);
        if (clinicId == 0)
            return BadRequest(new { message = "clinic_not_found" });

        var patientExists = await _db.Patcients.AnyAsync(p => p.Id == dto.PatientId);
        if (!patientExists)
            return NotFound(new { message = "patient_not_found" });

        var allowedDoctorIds = await _db.ClinicConsultants.AsNoTracking()
            .Where(cc => cc.ClinicId == clinicId && cc.Status == "active" && doctorIds.Contains(cc.DoctorId))
            .Select(cc => cc.DoctorId)
            .Distinct()
            .ToListAsync();

        if (allowedDoctorIds.Count != doctorIds.Count)
            return BadRequest(new { message = "consultant_not_linked" });

        var conference = new VideoConference
        {
            RoomName = $"conference-{Guid.NewGuid():N}",
            ClinicId = clinicId,
            PatientId = dto.PatientId,
            CreatedByAdminId = userId,
            Status = "scheduled",
            Participants = allowedDoctorIds.Select(id => new VideoConferenceParticipant
            {
                DoctorId = id,
                Status = "invited"
            }).ToList()
        };

        _db.VideoConferences.Add(conference);
        await _db.SaveChangesAsync();

        return Ok(new { id = conference.Id, roomName = conference.RoomName, message = "video_conference_created" });
    }

    [HttpGet("conferences")]
    public async Task<IActionResult> GetConferences()
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized();
        if (roleId != 2 && roleId != 3 && roleId != 4) return Forbid();

        var query = _db.VideoConferences.AsNoTracking()
            .Include(c => c.Patient)
            .Include(c => c.Clinic)
            .Include(c => c.Participants)
            .AsQueryable();

        if (roleId == 4)
        {
            var doctorId = await GetDoctorIdAsync(userId);
            query = query.Where(c => c.Participants.Any(p => p.DoctorId == doctorId));
        }
        else
        {
            var clinicId = await GetUserClinicIdAsync(userId);
            query = query.Where(c => c.ClinicId == clinicId);
        }

        var items = await query
            .OrderByDescending(c => c.CreatedAt)
            .Take(100)
            .ToListAsync();

        return Ok(items.Select(ToListItem).ToList());
    }

    [HttpGet("conferences/{id}")]
    public async Task<IActionResult> GetConferenceDetail(int id)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized();
        if (roleId != 2 && roleId != 3 && roleId != 4) return Forbid();

        var conference = await LoadConferenceAsync(id);
        if (conference == null) return NotFound(new { message = "video_conference_not_found" });

        var access = await HasConferenceAccessAsync(conference, userId, roleId);
        if (!access) return Forbid();

        return Ok(await ToDetailDtoAsync(conference, userId, roleId));
    }

    [HttpPost("conferences/{id}/token")]
    public async Task<IActionResult> GetConferenceToken(int id)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized();
        if (roleId != 2 && roleId != 3 && roleId != 4) return Forbid();

        var conference = await LoadConferenceAsync(id, tracking: true);
        if (conference == null) return NotFound(new { message = "video_conference_not_found" });
        if (conference.Status == "ended") return BadRequest(new { message = "video_conference_ended" });

        var access = await HasConferenceAccessAsync(conference, userId, roleId);
        if (!access) return Forbid();

        if (roleId == 4)
        {
            var doctorId = await GetDoctorIdAsync(userId);
            var participant = conference.Participants.FirstOrDefault(p => p.DoctorId == doctorId);
            if (participant == null) return Forbid();
            participant.Status = "joined";
            participant.JoinedAt ??= DateTime.UtcNow;
        }
        else
        {
            conference.Status = "active";
            conference.StartedAt ??= DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        var user = await _db.Users.AsNoTracking()
            .Include(u => u.Doctor)
            .FirstOrDefaultAsync(u => u.Id == userId);
        var displayName = BuildUserFullName(user, roleId == 4 ? "Shifokor" : "Admin");
        var apiKey = _config["LiveKit:ApiKey"] ?? "";
        var apiSecret = _config["LiveKit:ApiSecret"] ?? "";
        var liveKitUrl = _config["LiveKit:Url"] ?? "";
        var token = GenerateLiveKitToken(apiKey, apiSecret, $"user_{userId}", conference.RoomName, displayName);

        return Ok(new VideoTokenResponseDto(token, liveKitUrl));
    }

    [HttpPost("conferences/{id}/end")]
    public async Task<IActionResult> EndConference(int id)
    {
        var userId = GetUserId();
        var roleId = GetRoleId();
        if (userId == 0) return Unauthorized();
        if (roleId != 2 && roleId != 3) return Forbid();

        var conference = await _db.VideoConferences
            .FirstOrDefaultAsync(c => c.Id == id);
        if (conference == null) return NotFound(new { message = "video_conference_not_found" });

        var clinicId = await GetUserClinicIdAsync(userId);
        if (conference.ClinicId != clinicId) return Forbid();

        conference.Status = "ended";
        conference.EndedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "video_conference_ended" });
    }

    private int GetUserId()
    {
        var claim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : 0;
    }

    private async Task<int> GetUserClinicIdAsync(int userId)
    {
        return await _db.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => u.ClinicId)
            .FirstOrDefaultAsync() ?? 0;
    }

    private async Task<int> GetDoctorIdAsync(int userId)
    {
        return await _db.Doctors.AsNoTracking()
            .Where(d => d.UserId == userId)
            .Select(d => d.Id)
            .FirstOrDefaultAsync();
    }

    private async Task<VideoConference?> LoadConferenceAsync(int id, bool tracking = false)
    {
        var query = tracking ? _db.VideoConferences.AsQueryable() : _db.VideoConferences.AsNoTracking();
        return await query
            .Include(c => c.Patient)
            .Include(c => c.Clinic)
            .Include(c => c.Participants)
                .ThenInclude(p => p.Doctor)
                    .ThenInclude(d => d!.User)
            .Include(c => c.Participants)
                .ThenInclude(p => p.Doctor)
                    .ThenInclude(d => d!.DoctorPositions!)
                        .ThenInclude(dp => dp.Position)
            .FirstOrDefaultAsync(c => c.Id == id);
    }

    private async Task<bool> HasConferenceAccessAsync(VideoConference conference, int userId, int roleId)
    {
        if (roleId == 2 || roleId == 3)
            return conference.ClinicId == await GetUserClinicIdAsync(userId);

        if (roleId == 4)
        {
            var doctorId = await GetDoctorIdAsync(userId);
            return conference.Participants.Any(p => p.DoctorId == doctorId);
        }

        return false;
    }

    private VideoConferenceListItemDto ToListItem(VideoConference c)
    {
        var patientName = c.Patient == null
            ? ""
            : $"{c.Patient.LastName} {c.Patient.FirstName} {c.Patient.SureName}".Trim();

        return new VideoConferenceListItemDto
        {
            Id = c.Id,
            RoomName = c.RoomName,
            Status = c.Status,
            CreatedAt = c.CreatedAt,
            StartedAt = c.StartedAt,
            EndedAt = c.EndedAt,
            PatientFullName = patientName,
            ParticipantCount = c.Participants.Count,
            JoinedCount = c.Participants.Count(p => p.Status == "joined"),
            ClinicName = c.Clinic?.ClinicName
        };
    }

    private async Task<VideoConferenceDetailDto> ToDetailDtoAsync(VideoConference c, int userId, int roleId)
    {
        var list = ToListItem(c);
        var patient = c.Patient;
        var analyses = patient == null ? new List<PatientAnalysisItemDto>() : await GetPatientAnalysesAsync(patient.Id);

        return new VideoConferenceDetailDto
        {
            Id = list.Id,
            RoomName = list.RoomName,
            Status = list.Status,
            CreatedAt = list.CreatedAt,
            StartedAt = list.StartedAt,
            EndedAt = list.EndedAt,
            PatientFullName = list.PatientFullName,
            ParticipantCount = list.ParticipantCount,
            JoinedCount = list.JoinedCount,
            ClinicName = list.ClinicName,
            CanManage = roleId == 2 || roleId == 3,
            CanJoin = c.Status != "ended",
            Patient = patient == null ? new VideoConferencePatientDto() : new VideoConferencePatientDto
            {
                Id = patient.Id,
                FullName = $"{patient.LastName} {patient.FirstName} {patient.SureName}".Trim(),
                PassportSeries = TryDecrypt(patient.Passport),
                BirthDate = patient.BirthDate,
                Gender = patient.Gender,
                Phone = patient.Phone,
                Address = patient.Address
            },
            Participants = c.Participants.Select(p =>
            {
                var position = p.Doctor?.DoctorPositions?.FirstOrDefault()?.Position;
                return new VideoConferenceParticipantDto
                {
                    Id = p.Id,
                    DoctorId = p.DoctorId,
                    DoctorUserId = p.Doctor?.UserId,
                    FullName = p.Doctor == null ? "" : $"{p.Doctor.LastName} {p.Doctor.FirstName} {p.Doctor.SureName}".Trim(),
                    Position = position?.NameUz ?? position?.NameRu,
                    Phone = p.Doctor?.Phone,
                    Status = p.Status,
                    JoinedAt = p.JoinedAt,
                    IsOnline = p.Doctor != null && _connections.IsOnline(p.Doctor.UserId)
                };
            }).ToList(),
            Analyses = analyses
        };
    }

    private string? TryDecrypt(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return value;
        try { return _encryption.Decrypt(value); }
        catch { return value; }
    }

    private static string BuildUserFullName(User? user, string fallback)
    {
        if (user?.Doctor == null) return user?.Username ?? fallback;
        var fullName = $"{user.Doctor.LastName} {user.Doctor.FirstName} {user.Doctor.SureName}".Trim();
        return string.IsNullOrWhiteSpace(fullName) ? fallback : fullName;
    }

    private async Task<List<PatientAnalysisItemDto>> GetPatientAnalysesAsync(int patientId)
    {
        var result = new List<PatientAnalysisItemDto>();

        var ecg = await _db.ECGAnalyse.AsNoTracking()
            .Where(e => e.PatcientId == patientId)
            .Select(e => new { e.Id, e.CreatedAt, HasAi = e.AIAnswerData != null, ClinicName = e.Clinic != null ? e.Clinic.ClinicName : null })
            .ToListAsync();
        result.AddRange(ecg.Select(e => new PatientAnalysisItemDto { Type = "EKG", Id = e.Id, Date = e.CreatedAt, HasAiResult = e.HasAi, ClinicName = e.ClinicName }));

        var smad = await _db.SmadAnalyses.AsNoTracking()
            .Where(e => e.PatcientId == patientId)
            .Select(e => new { e.Id, e.CreatedAt, HasAi = e.AIAnswerData != null, ClinicName = e.Clinic != null ? e.Clinic.ClinicName : null })
            .ToListAsync();
        result.AddRange(smad.Select(e => new PatientAnalysisItemDto { Type = "SMAD", Id = e.Id, Date = e.CreatedAt, HasAiResult = e.HasAi, ClinicName = e.ClinicName }));

        var holter = await _db.HolterAnalyses.AsNoTracking()
            .Where(e => e.PatcientId == patientId)
            .Select(e => new { e.Id, e.CreatedAt, HasAi = e.AIAnswerData != null, ClinicName = e.Clinic != null ? e.Clinic.ClinicName : null })
            .ToListAsync();
        result.AddRange(holter.Select(e => new PatientAnalysisItemDto { Type = "Holter", Id = e.Id, Date = e.CreatedAt, HasAiResult = e.HasAi, ClinicName = e.ClinicName }));

        var lab = await _db.LabAnalyse.AsNoTracking()
            .Where(e => e.PatcientId == patientId)
            .Select(e => new { e.Id, e.CreatedAt, HasAi = e.AIAnswerData != null, ClinicName = e.Clinic != null ? e.Clinic.ClinicName : null })
            .ToListAsync();
        result.AddRange(lab.Select(e => new PatientAnalysisItemDto { Type = "Lab", Id = e.Id, Date = e.CreatedAt, HasAiResult = e.HasAi, ClinicName = e.ClinicName }));

        var parasitology = await _db.ParasitologyAnalyses.AsNoTracking()
            .Where(e => e.PatcientId == patientId)
            .Select(e => new { e.Id, e.CreatedAt, HasAi = e.AiResponse != null, ClinicName = e.Clinic != null ? e.Clinic.ClinicName : null })
            .ToListAsync();
        result.AddRange(parasitology.Select(e => new PatientAnalysisItemDto { Type = "Parasit", Id = e.Id, Date = e.CreatedAt, HasAiResult = e.HasAi, ClinicName = e.ClinicName }));

        return result.OrderByDescending(x => x.Date).ToList();
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
