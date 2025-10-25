using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Text.Json;
using System.Net.Http.Headers;

namespace EkgAnalyzerApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EkgController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly string _apiKey;

        public EkgController(IHttpClientFactory httpClientFactory, IConfiguration configuration)
        {
            _httpClientFactory = httpClientFactory;
            _apiKey = configuration["OpenAI:ApiKey"] ?? throw new Exception("API key not found in configuration");
        }

        [HttpPost("analyze")]
        public async Task<IActionResult> AnalyzeEkg([FromForm] IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { error = "Fayl topilmadi." });

            var allowedTypes = new[] { ".jpg", ".jpeg", ".png", ".bmp", ".pdf" };
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowedTypes.Contains(extension))
                return BadRequest(new { error = $"Fayl turi ({extension}) qo‘llab-quvvatlanmaydi." });

            // Faylni serverga saqlash
            string uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot/uploads");
            if (!Directory.Exists(uploadsFolder))
                Directory.CreateDirectory(uploadsFolder);

            string filePath = Path.Combine(uploadsFolder, file.FileName);
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            string fileUrl = $"{Request.Scheme}://{Request.Host}/uploads/{file.FileName}";

            try
            {
                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);

                string prompt = @"
Siz kardiologiya bo‘yicha sun’iy intellektsiz.
Quyidagi EKG natijasi faylini tahlil qiling va JSON formatida xulosa chiqaring:

{
  ""heart_rate"": ""..."",
  ""rhythm"": ""..."",
  ""st_segment"": ""..."",
  ""diagnosis"": ""..."",
  ""recommendation"": ""...""
}

Faqat JSON shaklida javob qaytaring, izoh yozmang.
";
                fileUrl = "https://drive.usercontent.google.com/download?id=1bwlytZ1OLyghZ5Wq0CDAgliKs4PdA_Ox&export=download&authuser=0&confirm=t&uuid=b8022a53-93a9-461b-9493-4cb3e81709c4&at=AKSUxGP68ftZI-xy3HJE2Kle-MvQ:1761387125062";
                // 🆕 Yangi OpenAI `responses` API formati
                var requestBody = new
                {
                    model = "gpt-4o-mini",
                    input = new object[]
                    {
                        new {
                            role = "user",
                            content = new object[]
                            {
                                new { type = "input_text", text = prompt },
                                new { type = "input_image", image_url = fileUrl }
                            }
                        }
                    },
                    max_output_tokens = 700
                };

                var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
                var response = await client.PostAsync("https://api.openai.com/v1/responses", content);
                var responseText = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    return BadRequest(new
                    {
                        error = "OpenAI API xatosi.",
                        status = response.StatusCode.ToString(),
                        raw = responseText
                    });
                }

                using var doc = JsonDocument.Parse(responseText);
                var output = doc.RootElement.GetProperty("output");
                var text = output[0].GetProperty("content")[0].GetProperty("text").GetString();

                try
                {
                    var parsed = JsonDocument.Parse(text);
                    return Ok(parsed.RootElement);
                }
                catch
                {
                    return Ok(new { result = text });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    error = "Serverda ichki xatolik yuz berdi.",
                    message = ex.Message,
                    stack = ex.StackTrace
                });
            }
        }
    }
}
