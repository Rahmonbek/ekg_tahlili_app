using EkgAnalyzerApi.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace EkgAnalyzerApi.DTOs;

public class UserDTO
{
    public int Id { get; set; }
    public string Email { get; set; }
    public int? ClinicId { get; set; }
    public bool Status { get; set; }


}

public class UserResponseDto
{
    public int Id { get; set; }
    public int? RoleId { get; set; }
    public string Email { get; set; } = default!;
    public RolesDTO? Role { get; set; }
    public DoctorDto? Doctor { get; set; }
    public ClinicDto? Clinic { get; set; }
}

public class DoctorDto
{
    public int Id { get; set; }
    public string FirstName { get; set; } = default!;
    public string LastName { get; set; } = default!;
    public string SureName { get; set; } = default!;
    public string Phone { get; set; } = default!;
    public string? Avatar { get; set; }
    public bool Gender { get; set; } = default!;
    public List<PositionDto> Positions { get; set; } = new();
}


public class PositionDto
{
    public int Id { get; set; }
    public int? RoleId { get; set; }
    public string NameUz { get; set; } = default!;
    public string NameRu { get; set; } = default!;
    public string NameEn { get; set; } = default!;
}

public class RolesDTO
{
    public int Id { get; set; }
    public string NameUz { get; set; } = default!;
    public string NameRu { get; set; } = default!;
    public string NameEn { get; set; } = default!;
}

public class ClinicDto
{
    public int Id { get; set; }
    public string? ClinicName { get; set; }
    public string? ClinicLogo { get; set; }
    /// <summary>SuperAdmin tomonidan faollashtirilgan klinika. false bo'lsa tahlil qilib bo'lmaydi.</summary>
    public bool IsActive { get; set; }
    public ClinicDetailDto? ClinicDetail { get; set; }
}

public class ClinicDetailDto
{
    public int Id { get; set; }
    public string? Address { get; set; }
    public string? BankAccaunt { get; set; }
    public string? BankName { get; set; }
    public string? License { get; set; }

    // System.Text.Json camelCase: INN → "iNN", MFO → "mFO" bo'ladi.
    // Frontend "inn" va "mfo" kutadi — override qilish kerak.
    [JsonPropertyName("inn")]
    public string? INN { get; set; }

    [JsonPropertyName("mfo")]
    public string? MFO { get; set; }
}
