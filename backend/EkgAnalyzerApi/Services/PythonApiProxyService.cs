using System.Net.Http.Headers;
using System.Text;
using System.Text.RegularExpressions;

namespace EkgAnalyzerApi.Services
{
    /// <summary>
    /// Python FastAPI ga proxy so'rovlarni yuborish uchun service.
    /// .NET API JWT tekshiruvidan o'tgan so'rovlarni Python API ga forward qiladi.
    /// </summary>
    public class PythonApiProxyService
    {
        private static readonly Regex EncodedWordRegex = new(@"=\?[^?]+\?[bBqQ]\?[^?]+\?=", RegexOptions.Compiled);
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<PythonApiProxyService> _logger;

        public PythonApiProxyService(IHttpClientFactory httpClientFactory, ILogger<PythonApiProxyService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        /// <summary>
        /// Multipart form-data so'rovni Python API ga proxy qiladi.
        /// JWT tokenni ham birga yuboradi.
        /// </summary>
        /// <param name="overrides">
        /// Server o'zi belgilaydigan maydonlar (L-03): shu kalitlar mijoz
        /// formasidan OLIB TASHLANADI va qiymati shu yerdan qo'yiladi.
        /// Masalan `clinic_id` / `created_doctor_id` — ilgari frontend
        /// yuborgan qiymat o'zgarishsiz ketardi va istalgan foydalanuvchi
        /// tahlilni boshqa klinika nomidan yarata olardi.
        /// </param>
        public async Task<HttpResponseMessage> ProxyMultipartAsync(
            string pythonEndpoint,
            HttpRequest originalRequest,
            string? jwtToken = null,
            IReadOnlyDictionary<string, string>? overrides = null)
        {
            var client = _httpClientFactory.CreateClient("PythonApi");

            // Original request dan multipart content ni qayta tiklash
            var formContent = new MultipartFormDataContent();

            // Form fields ni ko'chirish
            if (originalRequest.HasFormContentType)
            {
                var form = await originalRequest.ReadFormAsync();

                foreach (var field in form)
                {
                    if (overrides != null && overrides.ContainsKey(field.Key))
                        continue;

                    foreach (var value in field.Value)
                    {
                        formContent.Add(new StringContent(value ?? ""), field.Key);
                    }
                }

                if (overrides != null)
                {
                    foreach (var (key, value) in overrides)
                        formContent.Add(new StringContent(value), key);
                }

                // Fayllarni ko'chirish
                var originalNameSent = form.ContainsKey("original_filename");
                foreach (var file in form.Files)
                {
                    var stream = file.OpenReadStream();
                    var fileContent = new StreamContent(stream);
                    fileContent.Headers.ContentType = new MediaTypeHeaderValue(
                        file.ContentType ?? "application/octet-stream");
                    formContent.Add(fileContent, file.Name, NormalizeFileName(file.FileName, file.ContentType));

                    // `NormalizeFileName` ASCII bo'lmagan belgilarni olib
                    // tashlaydi — diskdagi nom uchun bu to'g'ri, lekin shu
                    // bilan asl nom butunlay yo'qolardi:
                    //   "Бемор_Тестов_СМАД_2026.pdf" -> "2026.pdf"
                    // Asl nom alohida maydonda yuboriladi va Python uni
                    // `original_filename` ustuniga yozadi (T-101).
                    var original = (file.FileName ?? "").Trim();
                    if (original.Length > 255) original = original[..255];
                    if (!originalNameSent && original.Length > 0)
                    {
                        formContent.Add(new StringContent(original), "original_filename");
                        originalNameSent = true;
                    }

                    // Bir nechta fayl (laboratoriya): har birining asl nomi
                    // fayllar bilan BIR XIL tartibda — Python ularni indeks
                    // bo'yicha moslaydi. Bo'sh nom ham yuboriladi, aks holda
                    // tartib siljib, nomlar boshqa faylga yopishib qolardi.
                    formContent.Add(new StringContent(original), "original_filenames");
                }
            }

            // JWT tokenni Python API ga ham yuborish
            if (!string.IsNullOrEmpty(jwtToken))
            {
                client.DefaultRequestHeaders.Authorization =
                    new AuthenticationHeaderValue("Bearer", jwtToken);
            }

            _logger.LogInformation("Proxying request to Python API: {Endpoint}", pythonEndpoint);

            try
            {
                var response = await client.PostAsync(pythonEndpoint, formContent);
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Python API proxy xatolik: {Endpoint}", pythonEndpoint);
                throw;
            }
        }

        /// <summary>
        /// JSON so'rovni Python API ga yuboradi.
        ///
        /// Kompleks tahlil uchun kerak: u yerda fayl yuklanmaydi, faqat
        /// yozuv identifikatorlari uzatiladi — multipart ortiqcha bo'lardi.
        /// </summary>
        public async Task<HttpResponseMessage> ProxyJsonAsync(
            string pythonEndpoint,
            object payload,
            string? jwtToken = null)
        {
            var client = _httpClientFactory.CreateClient("PythonApi");

            if (!string.IsNullOrEmpty(jwtToken))
            {
                client.DefaultRequestHeaders.Authorization =
                    new AuthenticationHeaderValue("Bearer", jwtToken);
            }

            var json = System.Text.Json.JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            _logger.LogInformation("Proxying JSON request to Python API: {Endpoint}", pythonEndpoint);

            try
            {
                return await client.PostAsync(pythonEndpoint, content);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Python API proxy xatolik: {Endpoint}", pythonEndpoint);
                throw;
            }
        }

        private string NormalizeFileName(string? fileName, string? contentType)
        {
            var rawFileName = string.IsNullOrWhiteSpace(fileName) ? "upload" : fileName.Trim();
            var decodedFileName = DecodeEncodedFileName(rawFileName);
            var selectedFileName = EncodedWordRegex.IsMatch(decodedFileName) ? "upload" : decodedFileName;
            var baseName = Path.GetFileName(selectedFileName).Replace('\\', '_').Replace('/', '_');

            // Kengaytma nomdan OLDIN ajratiladi: ilgari butun nom tozalanib,
            // keyin `Trim('.')` qilinardi va faqat kirill harfli nom
            // ("Анализ.xlsx") "xlsx" ga — kengaytmasiz nomga aylanardi,
            // Python esa uni turi noma'lum deb rad etardi.
            var extension = Regex.Replace(Path.GetExtension(baseName), @"[^A-Za-z0-9.]", "").ToLowerInvariant();
            if (extension == ".") extension = string.Empty;

            var safeName = Regex.Replace(Path.GetFileNameWithoutExtension(baseName), @"\s+", "_");
            safeName = Regex.Replace(safeName, @"[^A-Za-z0-9._-]", "_").Trim('_', '.', '-');

            if (string.IsNullOrWhiteSpace(safeName))
                safeName = "upload";

            if (string.IsNullOrWhiteSpace(extension))
            {
                extension = contentType?.ToLowerInvariant() switch
                {
                    "application/pdf" => ".pdf",
                    "image/png" => ".png",
                    "image/jpeg" => ".jpg",
                    "text/csv" => ".csv",
                    "text/plain" => ".txt",
                    "text/tab-separated-values" => ".tsv",
                    "application/xml" => ".xml",
                    "text/xml" => ".xml",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" => ".xlsx",
                    _ => string.Empty
                };
            }

            return $"{safeName}{extension}";
        }

        private string DecodeEncodedFileName(string fileName)
        {
            if (!EncodedWordRegex.IsMatch(fileName))
                return fileName;

            try
            {
                return EncodedWordRegex.Replace(fileName, match =>
                {
                    var value = match.Value;
                    var parts = value.Split('?');
                    if (parts.Length < 5)
                        return string.Empty;

                    var encoding = parts[1];
                    var mode = parts[2];
                    var encodedText = parts[3];

                    byte[] bytes = mode.Equals("B", StringComparison.OrdinalIgnoreCase)
                        ? Convert.FromBase64String(encodedText)
                        : DecodeQuotedPrintable(encodedText);

                    return Encoding.GetEncoding(encoding).GetString(bytes);
                }).Trim();
            }
            catch (Exception ex)
            {
                // Buzilgan RFC 2047 nom — asl ko'rinishi qoldiriladi
                _logger.LogWarning(ex, "Fayl nomini dekodlab bo'lmadi: {FileName}", fileName);
                return fileName;
            }
        }

        private static byte[] DecodeQuotedPrintable(string input)
        {
            using var stream = new MemoryStream();
            for (var i = 0; i < input.Length; i++)
            {
                if (input[i] == '_')
                {
                    stream.WriteByte((byte)' ');
                    continue;
                }

                if (input[i] == '=' && i + 2 < input.Length &&
                    byte.TryParse(input.Substring(i + 1, 2), System.Globalization.NumberStyles.HexNumber, null, out var value))
                {
                    stream.WriteByte(value);
                    i += 2;
                    continue;
                }

                stream.WriteByte((byte)input[i]);
            }

            return stream.ToArray();
        }
    }
}
