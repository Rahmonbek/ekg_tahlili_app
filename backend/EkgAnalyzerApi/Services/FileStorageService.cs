namespace EkgAnalyzerApi.Services;

/// <summary>
/// Yuklangan fayllarga kirish uchun yagona nuqta.
///
/// Nima uchun kerak: ilgari fayl yo'li ikkita joyda (FileProxyController va
/// PdfReportService) alohida hisoblanardi va ikkalasida ham
/// <c>ContentRootPath/../../python_back/uploads</c> ko'rinishidagi nisbiy yo'l
/// zaxira variant sifatida ishlatilardi. Ishlab chiqarishda .NET
/// <c>/var/www/nmed/api</c> da, fayllar esa <c>/var/www/nmed/python/uploads</c> da
/// bo'lgani uchun bu yo'l mavjud bo'lmagan papkaga ishora qilardi —
/// PDF hisobotlarga rasm qo'shilmasdi va fayl endpointi 404 qaytarardi.
///
/// Endi ildiz papka faqat konfiguratsiyadan olinadi va ilova ishga tushishda
/// tekshiriladi.
/// </summary>
public interface IFileStorage
{
    /// <summary>Python API yozadigan uploads papkasining absolyut yo'li.</summary>
    string UploadsRoot { get; }

    /// <summary>.NET o'zi yozadigan statik fayllar papkasi (wwwroot).</summary>
    string WebRoot { get; }

    /// <summary>
    /// Nisbiy yo'lni ildiz papka ichidagi absolyut yo'lga aylantiradi.
    /// Yo'l ildizdan chiqib ketsa (path traversal) <c>null</c> qaytaradi.
    /// </summary>
    string? ResolveUpload(string relativePath);

    /// <summary>Xuddi shunday, lekin wwwroot uchun.</summary>
    string? ResolveWebRoot(string relativePath);

    /// <summary>
    /// Bazadagi fayl havolasini diskdagi absolyut yo'lga aylantiradi.
    ///
    /// Havola ikki xil formatda bo'lishi mumkin va chaqiruvchi qaysi biri
    /// ekanini bilishi shart emas:
    ///   <c>/uploads/ecg_analyse_files/2026/08/....jpg</c> — Python yozgan,
    ///   <c>/doctor_avatars/....jpg</c> — .NET wwwroot ichida.
    /// To'liq URL (<c>https://.../api/files/uploads/...</c>) ham qabul
    /// qilinadi.
    ///
    /// Fayl mavjud bo'lmasa yoki yo'l ildizdan chiqib ketsa — <c>null</c>.
    /// </summary>
    string? ResolveStoredLink(string? dbLink);
}

public class FileStorageService : IFileStorage
{
    public string UploadsRoot { get; }
    public string WebRoot { get; }

    public FileStorageService(IConfiguration config, IWebHostEnvironment env, ILogger<FileStorageService> logger)
    {
        var configured = config["Storage:UploadsRoot"]
                         ?? config["Python:UploadsRoot"]
                         ?? config["Uploads:PythonRoot"];

        if (string.IsNullOrWhiteSpace(configured))
        {
            // Development uchun qulaylik: manba daraxti ichidagi standart joy.
            // Ishlab chiqarishda bu yo'l noto'g'ri bo'ladi, shuning uchun
            // ogohlantirish yoziladi va sozlash talab qilinadi.
            configured = Path.Combine(env.ContentRootPath, "..", "..", "python_back", "uploads");
            logger.LogWarning(
                "Storage:UploadsRoot sozlanmagan. Vaqtincha {Path} ishlatilmoqda. " +
                "Ishlab chiqarishda buni albatta sozlang — aks holda fayllar topilmaydi.",
                Path.GetFullPath(configured));
        }

        UploadsRoot = EnsureTrailingSeparator(Path.GetFullPath(configured));
        WebRoot = EnsureTrailingSeparator(
            Path.GetFullPath(env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot")));

        if (!Directory.Exists(UploadsRoot))
            logger.LogWarning("Uploads papkasi mavjud emas: {Path}", UploadsRoot);
    }

    public string? ResolveUpload(string relativePath) => Resolve(UploadsRoot, relativePath);

    public string? ResolveWebRoot(string relativePath) => Resolve(WebRoot, relativePath);

    public string? ResolveStoredLink(string? dbLink)
    {
        if (string.IsNullOrWhiteSpace(dbLink)) return null;

        var rel = dbLink;

        // To'liq URL berilsa faqat yo'l qismi olinadi
        if (Uri.TryCreate(rel, UriKind.Absolute, out var uri))
            rel = uri.AbsolutePath;

        // Frontend ba'zan proksi endpointining o'zini saqlaydi
        const string filesPrefix = "/api/files/";
        if (rel.StartsWith(filesPrefix, StringComparison.OrdinalIgnoreCase))
            rel = rel["/api/files".Length..];

        rel = rel.TrimStart('/');

        const string uploadsPrefix = "uploads/";
        var path = rel.StartsWith(uploadsPrefix, StringComparison.OrdinalIgnoreCase)
            ? ResolveUpload(rel[uploadsPrefix.Length..])
            : ResolveWebRoot(rel);

        return path != null && File.Exists(path) ? path : null;
    }

    private static string? Resolve(string root, string relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath)) return null;

        var safeRelative = relativePath
            .Replace('\\', Path.DirectorySeparatorChar)
            .Replace('/', Path.DirectorySeparatorChar)
            .TrimStart(Path.DirectorySeparatorChar);

        var fullPath = Path.GetFullPath(Path.Combine(root, safeRelative));

        // Ildizdan chiqib ketishni to'sish. `root` oxirida ajratuvchi borligi muhim:
        // aks holda `/uploads` ildizi uchun `/uploads_eski/...` yo'li ham o'tib ketardi.
        return fullPath.StartsWith(root, StringComparison.OrdinalIgnoreCase) ? fullPath : null;
    }

    private static string EnsureTrailingSeparator(string path) =>
        Path.EndsInDirectorySeparator(path) ? path : path + Path.DirectorySeparatorChar;
}
