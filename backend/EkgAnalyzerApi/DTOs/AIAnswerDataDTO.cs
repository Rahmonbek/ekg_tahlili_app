using System.Text.Json.Serialization;

namespace EkgAnalyzerApi.DTOs;

/// <summary>
/// Python AI API dan kelgan ai_answer_data JSON ni parse qilish uchun DTO.
/// Barcha modullar (EKG, Lab, Holter, SMAD) uchun universal schema.
/// </summary>
public class AIAnswerDataDTO
{
    /// <summary>
    /// Raqamli o'lchov natijalari (faqat EKG uchun).
    /// Kalitlar: HR, PR_interval, QRS_duration, QT_interval, QTc_Bazett va h.k.
    /// </summary>
    [JsonPropertyName("digital_measurements")]
    public Dictionary<string, object>? DigitalMeasurements { get; set; }

    /// <summary>
    /// AI tahlil matni — batafsil avtomatik xulosa.
    /// </summary>
    [JsonPropertyName("automatic_analysis")]
    public string? AutomaticAnalysis { get; set; }

    /// <summary>
    /// Holat jiddiyligi darajasi: 1 = yengil, 2 = o'rtacha, 3 = og'ir.
    /// Python tomonda int yoki string sifatida kelishi mumkin.
    /// </summary>
    [JsonPropertyName("automatic_analysis_bool")]
    public object? AutomaticAnalysisBool { get; set; }

    /// <summary>
    /// AI tavsiyalari (faqat EKG uchun).
    /// </summary>
    [JsonPropertyName("AI_recommendations")]
    public string? AIRecommendations { get; set; }

    /// <summary>
    /// Yakuniy tibbiy xulosa.
    /// </summary>
    [JsonPropertyName("final_summary")]
    public string? FinalSummary { get; set; }

    /// <summary>
    /// Parse bo'lmagan xom javob (agar GPT JSON formatda qaytarmasa).
    /// </summary>
    [JsonPropertyName("raw")]
    public string? Raw { get; set; }
}
