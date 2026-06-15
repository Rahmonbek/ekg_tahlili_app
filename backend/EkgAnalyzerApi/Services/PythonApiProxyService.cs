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
        public async Task<HttpResponseMessage> ProxyMultipartAsync(
            string pythonEndpoint,
            HttpRequest originalRequest,
            string? jwtToken = null)
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
                    foreach (var value in field.Value)
                    {
                        formContent.Add(new StringContent(value ?? ""), field.Key);
                    }
                }

                // Fayllarni ko'chirish
                foreach (var file in form.Files)
                {
                    var stream = file.OpenReadStream();
                    var fileContent = new StreamContent(stream);
                    fileContent.Headers.ContentType = new MediaTypeHeaderValue(
                        file.ContentType ?? "application/octet-stream");
                    formContent.Add(fileContent, file.Name, NormalizeFileName(file.FileName, file.ContentType));
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

        private static string NormalizeFileName(string? fileName, string? contentType)
        {
            var rawFileName = string.IsNullOrWhiteSpace(fileName) ? "upload" : fileName.Trim();
            var decodedFileName = DecodeEncodedFileName(rawFileName);
            var selectedFileName = EncodedWordRegex.IsMatch(decodedFileName) ? "upload" : decodedFileName;
            var safeName = Path.GetFileName(selectedFileName).Replace('\\', '_').Replace('/', '_');
            safeName = Regex.Replace(safeName, @"\s+", "_");
            safeName = Regex.Replace(safeName, @"[^A-Za-z0-9._-]", "_").Trim('_', '.', '-');

            if (string.IsNullOrWhiteSpace(safeName))
                safeName = "upload";

            var extension = Path.GetExtension(safeName);
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
                    _ => string.Empty
                };
            }

            return string.IsNullOrWhiteSpace(extension) ? safeName : $"{Path.GetFileNameWithoutExtension(safeName)}{extension}";
        }

        private static string DecodeEncodedFileName(string fileName)
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
            catch
            {
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
