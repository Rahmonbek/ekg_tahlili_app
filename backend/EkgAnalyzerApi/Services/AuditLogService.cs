using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.Models;

namespace EkgAnalyzerApi.Services
{
    /// <summary>
    /// Audit log yozish uchun service.
    /// TT 4.1.6 va O'z DSt 2814:2014 3-daraja talabiga muvofiq
    /// barcha CRUD, login/logout amallari logga yoziladi.
    /// </summary>
    public class AuditLogService
    {
        private readonly MedDataDB _context;

        public AuditLogService(MedDataDB context)
        {
            _context = context;
        }

        /// <summary>
        /// Audit log yozuvini yaratadi
        /// </summary>
        public async Task LogAsync(
            int? userId,
            string? username,
            string action,
            string? entityType = null,
            string? entityId = null,
            string? oldValues = null,
            string? newValues = null,
            string? ipAddress = null,
            string? userAgent = null,
            string? requestPath = null,
            string? httpMethod = null,
            int? responseStatus = null)
        {
            var log = new AuditLog
            {
                UserId = userId,
                Username = username,
                Action = action,
                EntityType = entityType,
                EntityId = entityId,
                OldValues = oldValues,
                NewValues = newValues,
                IpAddress = ipAddress,
                UserAgent = userAgent,
                RequestPath = requestPath,
                HttpMethod = httpMethod,
                ResponseStatus = responseStatus,
                CreatedAt = DateTime.UtcNow
            };

            _context.AuditLogs.Add(log);
            await _context.SaveChangesAsync();
        }

        /// <summary>
        /// HTTP kontekstdan IP va User-Agent oladi
        /// </summary>
        public static (string? ip, string? userAgent) ExtractRequestInfo(HttpContext? context)
        {
            if (context == null) return (null, null);

            var ip = context.Connection.RemoteIpAddress?.ToString();
            var userAgent = context.Request.Headers["User-Agent"].ToString();
            
            // X-Forwarded-For headerdan haqiqiy IP olish (reverse proxy ortida bo'lganda)
            if (context.Request.Headers.ContainsKey("X-Forwarded-For"))
            {
                ip = context.Request.Headers["X-Forwarded-For"].ToString().Split(',').First().Trim();
            }

            return (ip, userAgent);
        }
    }
}
