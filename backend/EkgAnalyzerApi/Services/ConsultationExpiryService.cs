using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace EkgAnalyzerApi.Services
{
    /// <summary>
    /// Har soatda ishlaydi: 48 soat ichida javob yo'q "pending" konsultatsiyalarni "expired" ga o'tkazadi.
    /// </summary>
    public class ConsultationExpiryService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<ConsultationExpiryService> _logger;
        private readonly TimeSpan _interval = TimeSpan.FromHours(1);
        private readonly TimeSpan _expiryThreshold = TimeSpan.FromHours(48);

        public ConsultationExpiryService(
            IServiceScopeFactory scopeFactory,
            ILogger<ConsultationExpiryService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("ConsultationExpiryService ishga tushdi.");

            while (!stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(_interval, stoppingToken);

                try
                {
                    await ProcessExpiredConsultationsAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "ConsultationExpiryService: muddati o'tgan konsultatsiyalarni qayta ishlashda xatolik");
                }
            }
        }

        private async Task ProcessExpiredConsultationsAsync(CancellationToken cancellationToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<MedDataDB>();
            var hub = scope.ServiceProvider.GetRequiredService<IHubContext<ConsultationHub>>();
            var connections = scope.ServiceProvider.GetRequiredService<IConsultationConnectionService>();

            var threshold = DateTime.UtcNow - _expiryThreshold;

            var expired = await db.Consultations
                .Where(c => c.Status == "pending" && c.CreatedAt < threshold)
                .ToListAsync(cancellationToken);

            if (!expired.Any()) return;

            _logger.LogInformation("ConsultationExpiryService: {Count} ta konsultatsiya muddati o'tdi", expired.Count);

            foreach (var c in expired)
            {
                c.Status    = "expired";
                c.UpdatedAt = DateTime.UtcNow;
            }

            await db.SaveChangesAsync(cancellationToken);

            // Adminlarga SignalR orqali bildirishnoma yuborish
            foreach (var c in expired)
            {
                try
                {
                    var adminConns = connections.GetAdminConnectionsForClinic(c.ClinicId).ToList();
                    if (adminConns.Any())
                    {
                        await hub.Clients.Clients(adminConns).SendAsync(
                            "ConsultationExpired",
                            new { consultationId = c.Id },
                            cancellationToken);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "ConsultationExpiryService: consultationId={Id} uchun bildirishnoma yuborishda xatolik", c.Id);
                }
            }
        }
    }
}
