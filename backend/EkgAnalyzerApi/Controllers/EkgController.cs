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
        [RequestSizeLimit(200_000_000)] // 200 MB
        public async Task<IActionResult> AnalyzeEkg([FromForm] IFormFileCollection files)
        {
            if (files == null || files.Count == 0)
                return BadRequest(new { error = "Hech qanday fayl yuborilmadi." });

            var allowedExts = new[]
            {
                ".jpg", ".jpeg", ".png", ".bmp", ".pdf",
                
            };

            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);

            var firstFile = files.First();
            var ext = Path.GetExtension(firstFile.FileName).ToLowerInvariant();

            if (!allowedExts.Contains(ext))
                return BadRequest(new { error = $"Yaroqsiz fayl turi: {ext}" });

            string fileId;

            // 🔹 1. Rasm yoki PDF faylni to‘g‘ridan-to‘g‘ri yuborish
           
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
            
           

            // 🔹 3. OpenAI modeliga so‘rov yuborish
            var prompt = @"Siz tajribali kardiolog shifokorsiz. Quyidagi EKG grafigini tahlil qiling va natijani faqat quyidagi JSON formatida RETURN qiling. Hech qanday izoh, sharh yoki qo‘shimcha matn yozmang — faqat toza JSON. Barcha matnlar o‘zbek tilida bo‘lsin. Agar rasm yetarli sifatda bo‘lmasa yoki o‘lchovlarni aniq hisoblash mumkin bo‘lmasa, tegishli maydonda ""not measurable"" yoki ""estimate"" deb qaytaring.
JSON shabloni:
{
  ""digital_measurements"": {
    ""HR"": ""Yurak urish tezligi (bpm) va qisqa izoh"",
    ""PR_interval"": ""PR interval (ms)"",
    ""QRS_duration"": ""QRS davomiyligi (ms)"",
    ""QT_interval"": ""QT interval (ms)"",
    ""QTc_Bazett"": ""QTc (Bazett) (ms)"",
    ""QRS_axis"": ""QRS o‘qi (gradus bilan)""
  },
  ""automatic_analysis"": ""EKG signali asosida yurak ritmi, o‘tkazuvchanlik, interval va o‘qlar tahlili, ishemik belgilar, aritmiyalar hamda digital_measurements dagi parametrlarning normal yoki patologik holati haqida to‘liq tibbiy izoh. Agar aniqlansa, quyidagi klinik holatlar haqida ham batafsil ma’lumot bering:\n\n• Giperkalemiya (Kaliy ortiq) – T to‘lqinlar baland va o‘tkir shaklda\n• Gipokalemiya (Kaliy kam) – T to‘lqin tekis, U to‘lqin paydo bo‘ladi\n• Gipokaltsemiya (Kaltsiy kam) – QT oralig‘i uzayadi\n• Giperkaltsemiya (Kaltsiy ko‘p) – QT oralig‘i qisqaradi\n• Perikardit – yurak atrofidagi qop yallig‘lanadi (ST ko‘tarilishi, PR pastlash)\n• Perikard effuziyasi – yurak atrofida suyuqlik to‘planadi (voltaj pasayadi)\n• Digoksin ta’siri – ST segment “kupa” shaklida pastga egilgan\n• Antiaritmiklar (amiodaron va h.k.) – QT oralig‘i uzayadi\n• Intoksikatsiyalar (alkogol, kokain) – ritm buzilishi yoki ST o‘zgarishlar\n• Stress, charchoq, vegetativ disfunktsiyada sinus taxikardiya yoki ritm o‘zgarishlari\n• Sinus taxikardiya – yurak urishi >100/min\n• Sinus bradikardiya – yurak urishi <60/min\n• Ekstrasistoliyalar – “qo‘shimcha” urishlar\n• Atrial fibrillyatsiya (AFib) – yuqori bo‘lmachalar notekis uradi\n• Atrial flutter – arrali ritm\n• Ventrikulyar taxikardiya (VT) – xavfli tez ritm\n• Ventrikulyar fibrillyatsiya (VF) – yurak mushaklari tartibsiz “qaltiraydi”\n• Miokard ishemiyasi – ST pastlash yoki T inversiyasi\n• O‘tkir miokard infarkti – ST ko‘tarilishi (yangi infarkt)\n• Eski infarkt (Q to‘lqinli) – avvalgi zararlanish izi\n• Subendokardial ishemiya – ichki qatlam shikastlanishi\n\nHar bir aniqlangan o‘zgarish klinik jihatdan asoslanib, yurak mushaklari faoliyati va bemor holatiga ta’siri bilan izohlanishi shart."",
  ""automatic_analysis_bool"": ""xulosaning jiddiylik darajasi (1 = yengil, 2 = o‘rtacha, 3 = og‘ir)"",
  ""AI_recommendations"": ""Oddiy tilda bemor uchun tavsiya: tekshiruv zarurati, dam olish, jismoniy yuklamani kamaytirish, yoki shifokor ko‘rigiga murojaat qilish va agarda kasallik aniqlansa shu kasallik davolash usuli haqida."",
  ""final_summary"": ""Tibbiy asosli yakuniy tashxis va qisqa tahlil natijasi, asosiy klinik xulosa bilan.""
}
Qo‘shimcha talablar:
- Har bir parametr uchun birliklar (bpm, ms, gradus) aniq yozilsin.
- Raqamli qiymatlar va ularning tibbiy bahosi (normal/patologik) alohida yozilsin.
- Elektrolit, perikard, ishemiya yoki aritmiya belgilaridan biri aniqlansa, u alohida tibbiy izoh bilan tushuntirilsin (sababi, EKG belgisi, klinik ahamiyati).
- Model javobi faqat JSON bo‘lsin, hech qanday matn tashqarida bo‘lmasin.";
            var isImage = ext is ".jpg" or ".jpeg" or ".png" or ".bmp";
            var body = new
            {
                model = "gpt-4o",
                input = new object[]
    {
        new
        {
            role = "user",
            content = isImage
                ? new object[]
                {
                    new { type = "input_text", text = prompt },
                    new { type = "input_image", file_id = fileId }
                }
                : new object[]
                {
                    new { type = "input_text", text = prompt },
                    new { type = "input_file", file_id = fileId }
                }
        }
    },
            };

            var json = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
            var response = await client.PostAsync("https://api.openai.com/v1/responses", json);
            var respText = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                return BadRequest(new { error = "OpenAI API xatosi", raw = respText });

            using var docResp = JsonDocument.Parse(respText);
            var output = docResp.RootElement
                .GetProperty("output")[0]
                .GetProperty("content")[0]
                .GetProperty("text")
                .GetString();

            try
            {
                var parsed = JsonDocument.Parse(output);
                return Ok(parsed.RootElement);
            }
            catch
            {
                // Agar AI noto‘g‘ri formatda JSON qaytarsa
                return Ok(new { raw_result = output });
            }
        }
    }
}
