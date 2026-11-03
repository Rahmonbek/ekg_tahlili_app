namespace EkgAnalyzerApi.DTOs;

// SuperAdmin kabineti (`api/superadmin/*`) so'rov modellari.
// Javoblar anonim obyektlar — ular faqat shu kabinet uchun va frontend
// `pages/cabinet/superadmin/` bilan birga o'zgaradi.

/// <summary>Klinika yaratish/tahrirlash. Admin maydonlari faqat yaratishda.</summary>
public class SaClinicUpsertDto
{
    public string ClinicName { get; set; } = default!;
    public bool IsActive { get; set; }
    public string? Inn { get; set; }
    public string? Address { get; set; }
    public int? DistrictId { get; set; }
    public string? BankName { get; set; }
    public string? BankAccount { get; set; }
    public string? Mfo { get; set; }
    public string? License { get; set; }
    public List<string>? Phones { get; set; }

    /// <summary>Yaratishda: klinika admini hisobi (ixtiyoriy).</summary>
    public string? AdminPhone { get; set; }
    public string? AdminPassword { get; set; }
    public string? AdminFirstName { get; set; }
    public string? AdminLastName { get; set; }
}

/// <summary>Xodim (users + doctors) yaratish/tahrirlash.</summary>
public class SaUserUpsertDto
{
    public string Phone { get; set; } = default!;
    public string? Email { get; set; }
    public int RoleId { get; set; }
    public int? ClinicId { get; set; }
    public string FirstName { get; set; } = default!;
    public string? LastName { get; set; }
    public string? SureName { get; set; }
    public bool Gender { get; set; } = true;
    public bool Status { get; set; } = true;

    /// <summary>Yaratishda majburiy, tahrirlashda e'tiborsiz (alohida endpoint).</summary>
    public string? Password { get; set; }
    public bool MustChangePassword { get; set; } = true;
}

public class SaPasswordDto
{
    public string Password { get; set; } = default!;
    public bool MustChangePassword { get; set; } = true;
}

public class SaPatientUpdateDto
{
    public string FirstName { get; set; } = default!;
    public string LastName { get; set; } = default!;
    public string? SureName { get; set; }
    public string? Passport { get; set; }
    public DateOnly? BirthDate { get; set; }
    public bool? Gender { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
}

public class SaAnalysesFilter
{
    /// <summary>ecg | holter | smad | lab | combined | parasitology (bo'sh — hammasi).</summary>
    public string? Type { get; set; }
    public int? ClinicId { get; set; }
    public int? PatientId { get; set; }
    /// <summary>ready | pending | failed</summary>
    public string? Status { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public string? Search { get; set; }
    public bool Deleted { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class SaDeleteDto
{
    public string? Reason { get; set; }
}

/// <summary>Oddiy spravochnik qatori (shikoyat, lavozim, viloyat, tuman, lab guruhlari).</summary>
public class SaDictionaryDto
{
    public string? NameUz { get; set; }
    public string? NameRu { get; set; }
    public string? NameEn { get; set; }
    /// <summary>complaints: yo'nalish (cardio...).</summary>
    public string? Category { get; set; }
    /// <summary>positions: rol; districts: viloyat; lab-categories: katta guruh.</summary>
    public int? ParentId { get; set; }
    /// <summary>positions: tartib.</summary>
    public int? Sort { get; set; }
}

public class SaLabValueTypeDto
{
    public string? NameUz { get; set; }
    public string? NameRu { get; set; }
    public string? NameEn { get; set; }
    public string? Measure { get; set; }
    public double? NormalMinMale { get; set; }
    public double? NormalMaxMale { get; set; }
    public double? NormalMinFemale { get; set; }
    public double? NormalMaxFemale { get; set; }
    public string? ColumnName { get; set; }
    public string? Category { get; set; }
    public string ValueKind { get; set; } = "numeric";
    public int SortOrder { get; set; }
    public string? AiHint { get; set; }
}
