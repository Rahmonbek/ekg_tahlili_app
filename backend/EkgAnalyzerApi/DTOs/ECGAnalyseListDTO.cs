using EkgAnalyzerApi.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.DTOs;

public class ECGAnalyseListDTO
{
    /// <summary>Xatolik holatida foydalanuvchiga ko'rsatiladigan sabab.</summary>
    public string? ErrorReason { get; set; }

    /// <summary>
    /// AI xulosasining qisqartirilgan matni — ro'yxatda ko'rsatish uchun.
    /// Ilgari ro'yxatda jiddiylik chipidan boshqa hech narsa yo'q edi.
    /// </summary>
    public string? AiSummary { get; set; }

    /// <summary>Hujjat raqami — o'chirish tasdiqlash oynasida ko'rsatiladi.</summary>
    public string? DocumentNumber { get; set; }

    /// <summary>AI xulosasi qaysi tilda yaratilgan (T-059).</summary>
    public string? AiLang { get; set; }

    /// <summary>
    /// EKG tasmasining kichik ko'rinishi (eskiz).
    /// </summary>
    /// <remarks>
    /// Bir bemorda bir necha tahlil bo'lsa, ro'yxatda ular deyarli bir xil
    /// ko'rinadi: bir xil ism, bir xil sana. Qaysi biri qaysi fayl ekanini
    /// aniqlashning imkoni yo'q edi (T-097). Eskiz `generated_short_file_link`
    /// dan olinadi — u allaqachon mavjud va sun'iy intellektga yuborish uchun
    /// yaratilgan.
    /// </remarks>
    public string? ThumbnailUrl { get; set; }

    public int Id { get; set; }
    public int? Status { get; set; } = 0;
    public int? AIStatus { get; set; }

    /// <summary>Ichki maydon — AIStatus ni hisoblash uchun. Javobda ko'rsatilmaydi.</summary>
    [System.Text.Json.Serialization.JsonIgnore]
    public string? AIAnswerData { get; set; } // 1: Normal, 2: Average, 3: Danger
    public DateTime? CreatedAt { get; set; }
    public DateTime? AnalysisDate { get; set; }
    public bool? IsViewed { get; set; }
    public bool HasDiagnosis { get; set; }
    public PatcientForECG? Patcient { get; set; }
    public DoctorForECGData? CreatedDoctor { get; set; }
}
