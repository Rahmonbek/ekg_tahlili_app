using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.Models;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EkgAnalyzerApi.Hubs
{
    [Authorize]
    public class VideoCallHub : Hub
    {
        private readonly IVideoCallConnectionService _connections;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<VideoCallHub> _logger;

        public VideoCallHub(
            IVideoCallConnectionService connections,
            IServiceScopeFactory scopeFactory,
            ILogger<VideoCallHub> logger)
        {
            _connections = connections;
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        public override async Task OnConnectedAsync()
        {
            var userId = GetUserId();
            var roleId = GetRoleId();
            if (userId == 0) { await base.OnConnectedAsync(); return; }

            // DB dan clinicId olish
            int clinicId = 0;
            using (var scope = _scopeFactory.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<MedDataDB>();
                var user = await db.Users.AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Id == userId);
                clinicId = user?.ClinicId ?? 0;
            }

            _connections.Register(userId, clinicId, roleId, Context.ConnectionId);

            // Shifokor (4) online bo'lsa — bir xil klinika adminlariga xabar
            if (roleId == 4 && clinicId > 0)
            {
                var adminConns = _connections.GetAdminConnectionsForClinic(clinicId).ToList();
                if (adminConns.Any())
                    await Clients.Clients(adminConns).SendAsync("DoctorOnline", new { doctorUserId = userId });
            }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var info = _connections.GetUserInfo(Context.ConnectionId);
            if (info.HasValue)
            {
                var (userId, clinicId, roleId) = info.Value;
                _connections.Remove(Context.ConnectionId);

                if (roleId == 4 && clinicId > 0)
                {
                    var adminConns = _connections.GetAdminConnectionsForClinic(clinicId).ToList();
                    if (adminConns.Any())
                        await Clients.Clients(adminConns).SendAsync("DoctorOffline", new { doctorUserId = userId });
                }
            }

            await base.OnDisconnectedAsync(exception);
        }

        // Admin/Direktor → Shifokorga qo'ng'iroq boshlash
        public async Task InitiateCall(int recipientUserId, string roomName)
        {
            var callerId = GetUserId();
            var callerRole = GetRoleId();

            if (callerId == 0 || (callerRole != 2 && callerRole != 3))
            {
                await Clients.Caller.SendAsync("CallError", new { message = "Ruxsat yo'q" });
                return;
            }

            var recipientConn = _connections.GetConnectionId(recipientUserId);
            if (recipientConn == null)
            {
                await Clients.Caller.SendAsync("CallError", new { message = "Shifokor offline" });
                return;
            }

            // DB ga sessiya yozish
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<MedDataDB>();
            var caller = await db.Users.AsNoTracking()
                .Include(u => u.Doctor)
                .FirstOrDefaultAsync(u => u.Id == callerId);

            var callerName = caller?.Doctor != null
                ? $"{caller.Doctor.FirstName} {caller.Doctor.LastName}".Trim()
                : caller?.Username ?? "Admin";

            var session = new VideoCallSession
            {
                RoomName = roomName,
                InitiatorId = callerId,
                RecipientId = recipientUserId,
                ClinicId = caller?.ClinicId ?? 0,
                Status = "pending"
            };
            db.VideoCallSessions.Add(session);
            await db.SaveChangesAsync();

            await Clients.Client(recipientConn).SendAsync("IncomingCall", new
            {
                roomName,
                initiatorName = callerName,
                initiatorId = callerId,
                sessionId = session.Id
            });
        }

        // Shifokor → qo'ng'iroqni qabul qilish
        public async Task AcceptCall(string roomName)
        {
            var recipientId = GetUserId();

            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<MedDataDB>();

            var session = await db.VideoCallSessions
                .Where(s => s.RoomName == roomName && s.Status == "pending")
                .FirstOrDefaultAsync();

            if (session == null) return;

            session.Status = "active";
            await db.SaveChangesAsync();

            var recipient = await db.Users.AsNoTracking()
                .Include(u => u.Doctor)
                .FirstOrDefaultAsync(u => u.Id == recipientId);

            var recipientName = recipient?.Doctor != null
                ? $"{recipient.Doctor.FirstName} {recipient.Doctor.LastName}".Trim()
                : recipient?.Username ?? "Shifokor";

            var initiatorConn = _connections.GetConnectionId(session.InitiatorId);
            if (initiatorConn != null)
                await Clients.Client(initiatorConn).SendAsync("CallAccepted", new { roomName, recipientName });
        }

        // Har ikki tomon → qo'ng'iroqni tugatish yoki rad etish
        public async Task EndCall(string roomName)
        {
            var userId = GetUserId();

            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<MedDataDB>();

            var session = await db.VideoCallSessions
                .Where(s => s.RoomName == roomName && s.Status != "ended" && s.Status != "rejected")
                .FirstOrDefaultAsync();

            if (session == null) return;

            bool isRejection = session.Status == "pending";
            session.Status = isRejection ? "rejected" : "ended";
            session.EndedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            var otherUserId = session.InitiatorId == userId ? session.RecipientId : session.InitiatorId;
            var otherConn = _connections.GetConnectionId(otherUserId);

            string eventName = isRejection ? "CallRejected" : "CallEnded";
            if (otherConn != null)
                await Clients.Client(otherConn).SendAsync(eventName, new { roomName });

            await Clients.Caller.SendAsync(eventName, new { roomName });
        }

        private int GetUserId()
        {
            var claim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(claim, out var id) ? id : 0;
        }

        private int GetRoleId()
        {
            var claim = Context.User?.FindFirst("roleId")?.Value;
            return int.TryParse(claim, out var id) ? id : 0;
        }
    }
}
