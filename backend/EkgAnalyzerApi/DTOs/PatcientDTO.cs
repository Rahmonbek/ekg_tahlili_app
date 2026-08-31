using EkgAnalyzerApi.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.DTOs;

public class PatcientDTO
{
    public string firstname { get; set; } = string.Empty;
    public string lastname { get; set; } = string.Empty;
    public string surename { get; set; } = string.Empty;
    public string passport { get; set; } = string.Empty;
    public string phone { get; set; } = string.Empty;
    public string birthdate { get; set; } = string.Empty;
    public string? address { get; set; }
    public int district_id { get; set; }
    public bool gender { get; set; }

}

public class PatcientDTOResponse
{
    public bool Status { get; set; }
    public string? Message { get; set; }

    public Patcient? Patcients { get; set; }
}

/// <summary>
/// Bemorlar ro'yxatining bitta qatori.
///
/// Nima uchun alohida DTO kerak: ilgari ro'yxat `Patcient` entity'sini
/// to'g'ridan-to'g'ri qaytarardi va `passport` ustunida BAZADAGI SHIFRLANGAN
/// matn (Base64 IV+ciphertext) ketardi — foydalanuvchi ekranda ma'nosiz
/// belgilar ko'rardi. Endi passport serverda deshifrlanadi va DARHOL
/// maskalanadi: to'liq seriya umuman tarmoqqa chiqmaydi.
/// </summary>
public class PatcientListItemDTO
{
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? SureName { get; set; }

    /// <summary>Maskalangan passport, masalan "** ****4567". Hech qachon to'liq emas.</summary>
    public string PassportMasked { get; set; } = string.Empty;

    public DateOnly BirthDate { get; set; }
    public bool Gender { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? RegionName { get; set; }
    public string? DistrictName { get; set; }

    /// <summary>Shu bemorga tegishli (klinika ko'rinishidagi) tahlillar soni.</summary>
    public int AnalysesCount { get; set; }

    /// <summary>Oxirgi tahlil sanasi — ro'yxat shu bo'yicha saralanadi.</summary>
    public DateTime? LastAnalysisAt { get; set; }
}

public class PatcientListDTO
{
    public List<PatcientListItemDTO> data { get; set; } = new List<PatcientListItemDTO>();
    public int TotalCount { get; set; }       // umumiy bemorlar soni
    public int TotalPages { get; set; }       // sahifalar soni
}

/// <summary>
/// Bemor kartasidagi bitta tahlil/xulosa yozuvi (xronologik lenta elementi).
/// </summary>
public class PatientTimelineItemDTO
{
    /// <summary>"ecg" | "holter" | "smad" | "lab" | "diagnose"</summary>
    public string Type { get; set; } = string.Empty;
    public int Id { get; set; }
    public string? DocumentNumber { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? AnalysisDate { get; set; }

    /// <summary>0 = kutmoqda, 1 = AI kutmoqda, 2 = tayyor, 3 = fayl mos emas, -1 = xatolik</summary>
    public int? Status { get; set; }

    /// <summary>AI jiddiylik darajasi: 1/2/3 yoki null (baholanmadi).</summary>
    public int? Severity { get; set; }

    public string? DoctorName { get; set; }
}

/// <summary>
/// Bemor kartasi: shaxsiy ma'lumotlar + barcha tahlillar yagona lentada.
/// Passport bu yerda ham MASKALANGAN.
/// </summary>
public class PatientCardDTO
{
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? SureName { get; set; }
    public string PassportMasked { get; set; } = string.Empty;
    public DateOnly BirthDate { get; set; }
    public bool Gender { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? RegionName { get; set; }
    public string? DistrictName { get; set; }

    public int EcgCount { get; set; }
    public int HolterCount { get; set; }
    public int SmadCount { get; set; }
    public int LabCount { get; set; }
    public int DiagnoseCount { get; set; }

    public List<PatientTimelineItemDTO> Timeline { get; set; } = new();
}
