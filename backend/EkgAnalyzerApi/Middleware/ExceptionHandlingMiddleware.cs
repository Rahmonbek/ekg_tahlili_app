using System.Text.Json;

namespace EkgAnalyzerApi.Middleware;

/// <summary>
/// Ushlanmagan istisnolarni qayta ishlaydi.
///
/// Nima uchun kerak: ilgari global handler yo'q edi. Development muhitida
/// mijozga to'liq stack trace, SQL matni va kutubxona versiyalari qaytardi
/// (hujumchi uchun foydali ma'lumot). Production'da esa bo'sh 500 qaytardi —
/// foydalanuvchi ham, qo'llab-quvvatlash ham nima bo'lganini bilmasdi.
///
/// Endi: to'liq tafsilot serverdagi log'ga, mijozga esa faqat tushunarli xabar
/// va <c>traceId</c> qaytadi. Foydalanuvchi shu ID ni aytsa, log'dan aniq
/// so'rovni topish mumkin.
/// </summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Ruxsat etilmagan murojaat: {Path}", context.Request.Path);
            await WriteAsync(context, StatusCodes.Status401Unauthorized,
                "Ruxsat yo'q yoki sessiya tugagan.");
        }
        catch (Exception ex)
        {
            var traceId = context.TraceIdentifier;
            _logger.LogError(ex,
                "Ushlanmagan istisno. traceId={TraceId} method={Method} path={Path}",
                traceId, context.Request.Method, context.Request.Path);

            await WriteAsync(context, StatusCodes.Status500InternalServerError,
                "Ichki xatolik yuz berdi. Muammo takrorlansa, quyidagi kodni qo'llab-quvvatlashga ayting.",
                traceId);
        }
    }

    private static async Task WriteAsync(HttpContext context, int statusCode, string message, string? traceId = null)
    {
        // Javob allaqachon boshlangan bo'lsa aralashib bo'lmaydi
        if (context.Response.HasStarted) return;

        context.Response.Clear();
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json; charset=utf-8";

        var payload = traceId == null
            ? JsonSerializer.Serialize(new { message })
            : JsonSerializer.Serialize(new { message, traceId });

        await context.Response.WriteAsync(payload);
    }
}

public static class ExceptionHandlingMiddlewareExtensions
{
    public static IApplicationBuilder UseGlobalExceptionHandling(this IApplicationBuilder builder)
        => builder.UseMiddleware<ExceptionHandlingMiddleware>();
}
