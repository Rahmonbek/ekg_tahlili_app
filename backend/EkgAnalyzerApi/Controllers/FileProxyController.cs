using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;

namespace EkgAnalyzerApi.Controllers;

[ApiController]
[Route("api/files")]
[Authorize]
public class FileProxyController : ControllerBase
{
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _config;
    private readonly ILogger<FileProxyController> _logger;
    private readonly FileExtensionContentTypeProvider _contentTypes = new();

    public FileProxyController(
        IWebHostEnvironment env,
        IConfiguration config,
        ILogger<FileProxyController> logger)
    {
        _env = env;
        _config = config;
        _logger = logger;
    }

    [HttpGet("uploads/{**relativePath}")]
    public IActionResult GetUpload(string relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath))
            return NotFound();

        var root = GetUploadsRoot();
        var safeRelative = relativePath
            .Replace('\\', Path.DirectorySeparatorChar)
            .Replace('/', Path.DirectorySeparatorChar)
            .TrimStart(Path.DirectorySeparatorChar);

        var fullPath = Path.GetFullPath(Path.Combine(root, safeRelative));
        if (!fullPath.StartsWith(root, StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Fayl yo'li noto'g'ri" });

        if (!System.IO.File.Exists(fullPath))
        {
            _logger.LogWarning("Upload fayl topilmadi: {Path}", fullPath);
            return NotFound(new { message = "Fayl topilmadi" });
        }

        if (!_contentTypes.TryGetContentType(fullPath, out var contentType))
            contentType = "application/octet-stream";

        return PhysicalFile(fullPath, contentType, enableRangeProcessing: true);
    }

    private string GetUploadsRoot()
    {
        var configured = _config["Python:UploadsRoot"] ?? _config["Uploads:PythonRoot"];
        var root = !string.IsNullOrWhiteSpace(configured)
            ? configured
            : Path.Combine(_env.ContentRootPath, "..", "..", "python_back", "uploads");

        return Path.GetFullPath(root);
    }
}
