using System.Net.Http.Headers;

namespace EkgAnalyzerApi.Services
{
    /// <summary>
    /// Python FastAPI ga proxy so'rovlarni yuborish uchun service.
    /// .NET API JWT tekshiruvidan o'tgan so'rovlarni Python API ga forward qiladi.
    /// </summary>
    public class PythonApiProxyService
    {
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
                    formContent.Add(fileContent, file.Name, file.FileName ?? "upload");
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
    }
}
