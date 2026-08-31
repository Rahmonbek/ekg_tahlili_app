using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.Models;
using EkgAnalyzerApi.Services;
using System.Security.Claims;

namespace EkgAnalyzerApi.Middleware
{
    /// <summary>
    /// Audit Middleware — barcha POST, PUT, PATCH, DELETE so'rovlarni avtomatik loglaydi.
    /// TT 4.1.6 va O'z DSt 2814:2014 3-daraja talabiga muvofiq.
    /// </summary>
    public class AuditMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<AuditMiddleware> _logger;

        // Loglanmaydigan yo'llar (health check, swagger, static files)
        //
        // `/hubs` — SignalR `negotiate` so'rovlari. Har bir sahifa
        // yangilanishida uchta hub uchun uchta `POST .../negotiate` ketadi
        // va ularning har biri "CREATE" amali sifatida yozilardi.
        // Natijada jurnaldagi 1432 yozuvning ~20% i shu shovqin edi
        // (videocall 102, consultation 98, analysis 96) va haqiqiy
        // foydalanuvchi amallari (ecg-analyses 6, LOGIN 5) ular ichida
        // ko'rinmay qolardi (T-083).
        private static readonly string[] ExcludedPaths = {
            "/swagger", "/health", "/_framework", "/favicon", "/hubs"
        };

        public AuditMiddleware(RequestDelegate next, ILogger<AuditMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var method = context.Request.Method;
            var path = context.Request.Path.Value ?? "";

            // Faqat o'zgartiruvchi so'rovlarni loglash (POST, PUT, PATCH, DELETE)
            var shouldLog = method is "POST" or "PUT" or "PATCH" or "DELETE";

            // Excluded paths ni tekshirish
            if (shouldLog && ExcludedPaths.Any(e => path.StartsWith(e, StringComparison.OrdinalIgnoreCase)))
            {
                shouldLog = false;
            }

            // So'rovni o'tkazish
            await _next(context);

            // Loglash
            if (shouldLog)
            {
                try
                {
                    using var scope = context.RequestServices.CreateScope();
                    var dbContext = scope.ServiceProvider.GetRequiredService<MedDataDB>();

                    // Foydalanuvchi ma'lumotlarini olish
                    int? userId = null;
                    string? username = null;
                    var userIdClaim = context.User?.FindFirst(ClaimTypes.NameIdentifier);
                    var usernameClaim = context.User?.FindFirst(ClaimTypes.Name);

                    if (userIdClaim != null && int.TryParse(userIdClaim.Value, out var uid))
                    {
                        userId = uid;
                    }
                    username = usernameClaim?.Value;

                    // IP va UserAgent
                    var (ip, userAgent) = AuditLogService.ExtractRequestInfo(context);

                    // Action turini aniqlash
                    var action = method switch
                    {
                        "POST" => path.Contains("login", StringComparison.OrdinalIgnoreCase) ? "LOGIN"
                                : path.Contains("register", StringComparison.OrdinalIgnoreCase) ? "REGISTER"
                                : path.Contains("logout", StringComparison.OrdinalIgnoreCase) ? "LOGOUT"
                                : "CREATE",
                        "PUT" or "PATCH" => "UPDATE",
                        "DELETE" => "DELETE",
                        _ => method
                    };

                    // Entity type ni yo'ldan ajratish
                    var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
                    var entityType = segments.Length >= 2 ? segments[1] : path;

                    // `EntityId` ustuni hech qachon to'ldirilmasdi: jurnaldan
                    // "kimdir shu URL ga POST yubordi" dan boshqa narsa
                    // bilib bo'lmasdi (T-083). Endi u ikki manbadan olinadi:
                    //   * yo'ldagi son (`/api/ecg-analyses/96`)
                    //   * yoki forma/so'rov maydonidagi `id`
                    string? entityId = segments.LastOrDefault(seg =>
                        seg.Length <= 12 && seg.All(char.IsDigit));

                    if (entityId == null && context.Request.HasFormContentType)
                    {
                        try
                        {
                            var formId = context.Request.Form["id"].ToString();
                            if (!string.IsNullOrWhiteSpace(formId)) entityId = formId;
                        }
                        catch
                        {
                            // Forma o'qib bo'lmasa audit yozuvi baribir saqlanadi
                        }
                    }

                    if (entityId == null && context.Request.Query.ContainsKey("id"))
                    {
                        entityId = context.Request.Query["id"].ToString();
                    }

                    var auditLog = new AuditLog
                    {
                        UserId = userId,
                        Username = username,
                        Action = action,
                        EntityType = entityType,
                        EntityId = string.IsNullOrWhiteSpace(entityId) ? null : entityId,
                        RequestPath = path,
                        HttpMethod = method,
                        ResponseStatus = context.Response.StatusCode,
                        IpAddress = ip,
                        UserAgent = userAgent?.Length > 500 ? userAgent[..500] : userAgent,
                        CreatedAt = DateTime.UtcNow
                    };

                    dbContext.AuditLogs.Add(auditLog);
                    await dbContext.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    // Audit log xatosi asosiy so'rovni to'xtatmasligi kerak
                    _logger.LogError(ex, "Audit log yozishda xatolik: {Path}", path);
                }
            }
        }
    }

    /// <summary>
    /// Extension method — middleware ni app pipeline ga qo'shish uchun
    /// </summary>
    public static class AuditMiddlewareExtensions
    {
        public static IApplicationBuilder UseAuditLogging(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<AuditMiddleware>();
        }
    }
}
