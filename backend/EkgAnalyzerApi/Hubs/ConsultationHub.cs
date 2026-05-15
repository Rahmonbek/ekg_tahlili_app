using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EkgAnalyzerApi.Hubs
{
    [Authorize]
    public class ConsultationHub : Hub
    {
        private readonly IConsultationConnectionService _connections;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<ConsultationHub> _logger;

        public ConsultationHub(
            IConsultationConnectionService connections,
            IServiceScopeFactory scopeFactory,
            ILogger<ConsultationHub> logger)
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

            int clinicId = 0;
            using (var scope = _scopeFactory.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<MedDataDB>();
                var user = await db.Users.AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Id == userId);
                clinicId = user?.ClinicId ?? 0;
            }

            _connections.Register(userId, clinicId, roleId, Context.ConnectionId);
            _logger.LogInformation("ConsultationHub: userId={UserId} role={RoleId} connected", userId, roleId);
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var info = _connections.GetUserInfo(Context.ConnectionId);
            if (info.HasValue)
            {
                _connections.Remove(Context.ConnectionId);
                _logger.LogInformation("ConsultationHub: userId={UserId} disconnected", info.Value.userId);
            }
            await base.OnDisconnectedAsync(exception);
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
