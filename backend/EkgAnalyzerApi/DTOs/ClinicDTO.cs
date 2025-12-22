using EkgAnalyzerApi.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

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

    public string? MFO { get; set; }

    public string? BankName { get; set; }

    public string? INN { get; set; }

    public string? License { get; set; }

    public string? Address { get; set; }


}

public class ClinicPhoneNumberDTO
{
    public int? Id { get; set; }

    public string PhoneNumber { get; set; }


}
