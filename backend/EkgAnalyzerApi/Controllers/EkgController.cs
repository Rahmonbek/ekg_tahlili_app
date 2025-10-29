using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Text.Json;
using System.Net.Http.Headers;
using iTextSharp.text;
using iTextSharp.text.pdf;

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
        [RequestSizeLimit(200_000_000)] // 200 MB limit
        public async Task<IActionResult> AnalyzeEkg([FromForm] IFormFileCollection files)
        {
            if (files == null || files.Count == 0)
                return BadRequest(new { error = "Hech qanday fayl yuborilmadi." });

            var allowedExts = new[]
            {
                ".jpg", ".jpeg", ".png", ".bmp", ".pdf",
                ".csv", ".txt", ".edf", ".mat", ".xml", ".dat", ".hea", ".zip"
            };

            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);

            var firstFile = files.First();
            var ext = Path.GetExtension(firstFile.FileName).ToLowerInvariant();

            if (!allowedExts.Contains(ext))
                return BadRequest(new { error = "Yaroqsiz fayl turi." });

            string fileId = "";

            // 🟢 Agar fayl rasm bo‘lsa, to‘g‘ridan-to‘g‘ri yuboriladi
            if (ext is ".jpg" or ".jpeg" or ".png" or ".bmp" or ".pdf")
            {
                using var ms = new MemoryStream();
                await firstFile.CopyToAsync(ms);
                var fileBytes = ms.ToArray();

                using var multipart = new MultipartFormDataContent();
                var fileContent = new ByteArrayContent(fileBytes);
                fileContent.Headers.ContentType = new MediaTypeHeaderValue(
                    ext == ".pdf" ? "application/pdf" : "image/png"
                );
                multipart.Add(fileContent, "file", firstFile.FileName);
                multipart.Add(new StringContent("user_data"), "purpose");

                var upload = await client.PostAsync("https://api.openai.com/v1/files", multipart);
                var uploadText = await upload.Content.ReadAsStringAsync();

                if (!upload.IsSuccessStatusCode)
                    return BadRequest(new { error = "Fayl yuklashda xato", raw = uploadText });

                using var uploadDoc = JsonDocument.Parse(uploadText);
                fileId = uploadDoc.RootElement.GetProperty("id").GetString();
            }
            else
            {
                // 🟡 Rasm bo‘lmagan fayllar uchun PDF yaratamiz
                string tempPdfPath = Path.Combine(Path.GetTempPath(), $"{Guid.NewGuid()}.pdf");

                using (var ms = new MemoryStream())
                {
                    await firstFile.CopyToAsync(ms);
                    var bytes = ms.ToArray();

                    using var fs = new FileStream(tempPdfPath, FileMode.Create);
                    using var doc = new iTextSharp.text.Document(PageSize.A4);
                    PdfWriter.GetInstance(doc, fs);
                    doc.Open();

                    var font = FontFactory.GetFont(FontFactory.HELVETICA, 10, iTextSharp.text.Font.NORMAL);
                    doc.Add(new Paragraph($"Fayl nomi: {firstFile.FileName}", font));
                    doc.Add(new Paragraph($"Fayl turi: {ext}", font));
                    doc.Add(new Paragraph("------------------------------------------------------------", font));

                    // Faylni text sifatida yozish
                    try
                    {
                        string content = Encoding.UTF8.GetString(bytes);
                        doc.Add(new Paragraph(content, font));
                    }
                    catch
                    {
                        // Agar binary bo‘lsa, hex ko‘rinishda yozamiz
                        string hex = BitConverter.ToString(bytes.Take(2000).ToArray());
                        doc.Add(new Paragraph("[Binary fayl — quyida 2000 bayt namunasi]", font));
                        doc.Add(new Paragraph(hex, font));
                    }

                    doc.Close();
                }

                // Endi PDF faylni OpenAI’ga yuboramiz
                var pdfBytes = await System.IO.File.ReadAllBytesAsync(tempPdfPath);
                using var multipart = new MultipartFormDataContent();
                var pdfContent = new ByteArrayContent(pdfBytes);
                pdfContent.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
                multipart.Add(pdfContent, "file", "ekg_data.pdf");
                multipart.Add(new StringContent("user_data"), "purpose");

                var upload = await client.PostAsync("https://api.openai.com/v1/files", multipart);
                var uploadText = await upload.Content.ReadAsStringAsync();

                if (!upload.IsSuccessStatusCode)
                    return BadRequest(new { error = "PDF yuklashda xato", raw = uploadText });

                using var uploadDoc = JsonDocument.Parse(uploadText);
                fileId = uploadDoc.RootElement.GetProperty("id").GetString();

                // Tozalash
                System.IO.File.Delete(tempPdfPath);
            }

            // 🔹 OpenAI so‘rovi
            var prompt = @"Siz tajribali kardiolog shifokorsiz. Quyidagi EKG maʼlumotini tahlil qiling va natijani faqat quyidagi JSON formatida qaytaring...";

            var body = new
            {
                model = "gpt-4o-mini",
                input = new object[]
                {
                    new
                    {
                        role = "user",
                        content = new object[]
                        {
                            new { type = "input_text", text = prompt },
                            new { type = "input_file", file_id = fileId }
                        }
                    }
                },
                max_output_tokens = 1500
            };

            var json = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
            var response = await client.PostAsync("https://api.openai.com/v1/responses", json);
            var respText = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                return BadRequest(new { error = "OpenAI API xatosi", raw = respText });

            using var docResp = JsonDocument.Parse(respText);
            var output = docResp.RootElement.GetProperty("output")[0]
                .GetProperty("content")[0].GetProperty("text").GetString();

            try
            {
                var parsed = JsonDocument.Parse(output);
                return Ok(parsed.RootElement);
            }
            catch
            {
                return Ok(new { result = output });
            }
        }
    }
}
