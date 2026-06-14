using EkgAnalyzerApi.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace EkgAnalyzerApi.DTOs;


public class ClinicUpsertDto
{
    public int? Id { get; set; }   // optional
    public string ClinicName { get; set; } = null!;
    public IFormFile? ClinicLogo { get; set; } // update payti kelmasligi mumkin
}

public class ClinicPhoneUpsertDto
{
    public int ClinicId { get; set; }
    public List<ClinicPhoneNumberDTO> PhoneNumbers { get; set; }
}

public class ClinicDetailUpsertDto
{
    public int Id { get; set; }

    public int ClinicId { get; set; }
    public int DistrictId { get; set; }

    public string? BankAccaunt { get; set; }

    public string? MFO { get; set; }

    public string? BankName { get; set; }

    public string? INN { get; set; }

    public string? License { get; set; }
    public IFormFile? LicenseFile { get; set; }

    public string? Address { get; set; }

}
public class ClinicDTO
{
    public int Id { get; set; }
    public string? ClinicName { get; set; }
    public string? ClinicLogo { get; set; }
    public ClinicDetailDTO? ClinicDetail { get; set; } = new();
    public UserDTO? User { get; set; } = new();
    public List<ClinicPhoneNumberDTO>? ClinicPhoneNumber { get; set; } = new();
}

public class ClinicDetailDTO
{
    public int Id { get; set; }

    public int ClinicId { get; set; }

    public string? BankAccaunt { get; set; }

    // System.Text.Json camelCase: MFO → "mFO", INN → "iNN" bo'ladi.
    // Frontend "mfo" va "inn" kutadi — override qilish kerak.
    [JsonPropertyName("mfo")]
    public string? MFO { get; set; }

    public string? BankName { get; set; }

    [JsonPropertyName("inn")]
    public string? INN { get; set; }

    public string? License { get; set; }

    public string? Address { get; set; }

    public Districts? District { get; set; }
    public Regions? Region { get; set; }
}

public class ClinicPhoneNumberDTO
{
    public int? Id { get; set; }

    public string PhoneNumber { get; set; }


}
