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
        private static readonly string[] ExcludedPaths = {
            "/swagger", "/health", "/_framework", "/favicon"
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

                    var auditLog = new AuditLog
                    {
                        UserId = userId,
                        Username = username,
                        Action = action,
                        EntityType = entityType,
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
