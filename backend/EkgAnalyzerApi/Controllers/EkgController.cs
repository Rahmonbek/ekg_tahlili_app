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

            var allowedTypes = new[] { ".jpg", ".jpeg", ".png", ".bmp", ".pdf", ".csv", ".txt", ".edf", ".mat", ".xml" };
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowedTypes.Contains(extension))
                return BadRequest(new { error = $"Fayl turi ({extension}) qo‘llab-quvvatlanmaydi." });

            try
            {
                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);

                // Faylni byte[] ga o‘tkazish
                byte[] fileBytes;
                using (var ms = new MemoryStream())
                {
                    await file.CopyToAsync(ms);
                    fileBytes = ms.ToArray();
                }

                // Faylni OpenAI /v1/files ga upload qilish
                using var fileContent = new ByteArrayContent(fileBytes);
                fileContent.Headers.ContentType = new MediaTypeHeaderValue(
                    extension switch
                    {
                        ".png" => "image/png",
                        ".jpg" => "image/jpeg",
                        ".jpeg" => "image/jpeg",
                        _ => "application/octet-stream"
                    });

                using var multipart = new MultipartFormDataContent();
                var fileName = file.FileName;
               

                // Agar xohlasa, fayl nomini ham kengaytma bilan birga yangilash mumkin:
                var newFileName = Path.GetFileNameWithoutExtension(fileName) + extension;
                multipart.Add(fileContent, "file", newFileName);

                // 🔹 Purpose tanlash
                string purpose = extension switch
                {
                    ".jpg" => "vision",
                    ".JPG" => "vision",
                    ".jpeg" => "vision",
                    ".png" => "vision",
                    _ => "user_data"
                };
                multipart.Add(new StringContent(purpose), "purpose");

                var uploadResponse = await client.PostAsync("https://api.openai.com/v1/files", multipart);
                var uploadJson = await uploadResponse.Content.ReadAsStringAsync();

                if (!uploadResponse.IsSuccessStatusCode)
                {
                    return BadRequest(new
                    {
                        error = "Fayl upload qilinishida xatolik.",
                        status = uploadResponse.StatusCode.ToString(),
                        raw = uploadJson
                    });
                }

                // Upload qilingan fayl ID sini olish
                using var uploadDoc = JsonDocument.Parse(uploadJson);
                var fileId = uploadDoc.RootElement.GetProperty("id").GetString();

                // Prompt
                var prompt = @"
Siz tajribali kardiolog shifokorsiz. Quyidagi EKG faylni tahlil qiling va quyidagi JSON formatda natija yozing.
{
  ""digital_measurements"": {
    ""HR"": ""Yurak urish tezligi (bpm) va qisqa izoh"",
    ""PR_interval"": ""PR interval (ms)"",
    ""QRS_duration"": ""QRS davomiyligi (ms)"",
    ""QT_interval"": ""QT interval (ms)"",
    ""QTc_Bazett"": ""QTc (Bazett) (ms)"",
    ""QRS_axis"": ""QRS o‘qi (gradus bilan)""
  },
  ""automatic_analysis"": ""EKG signali asosida aniqlangan yurak ritmi, ishemik o‘zgarishlar yoki boshqa muhim klinik belgilar haqida qisqa tibbiy xulosa"",
  ""automatic_analysis_bool"": ""xulosaning jiddiylik darajasi (1 = yengil, 2 = o‘rtacha, 3 = og‘ir)"",
  ""AI_recommendations"": ""Oddiy tilda bemor uchun tavsiya: tekshiruv zarurati, yuklamani kamaytirish, yoki shifokor ko‘rigiga murojaat qilish haqida"",
  ""final_summary"": ""Tibbiy asosli yakuniy xulosa, qisqa tahlil natijasi""
}
Faqat JSON formatida javob qaytaring, boshqa izoh yozmang. (Barcha ma'lumotlar o'zbek tilida bo'lsin)
";

                // /v1/responses ga so‘rov
                var requestBody = new
                {
                    model = "gpt-4.1-mini",
                    input = new object[]
                    {
                        new
                        {
                            role = "user",
                            content = new object[]
                            {
                                new { type = "input_text", text = prompt },
                                new { type = "input_image", file_id = fileId }
                            }
                        }
                    },
                    max_output_tokens = 700
                };

                var jsonContent = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
                var response = await client.PostAsync("https://api.openai.com/v1/responses", jsonContent);
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
