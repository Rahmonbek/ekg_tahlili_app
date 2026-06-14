namespace EkgAnalyzerApi.DTOs;

public class RegisterDto
{
    public string? Phone { get; set; }
    public string? PhoneNumber { get; set; }
    public string ClinicName { get; set; } = default!;
    public string ClinicInn { get; set; } = default!;
    public int? DistrictId { get; set; }
    public string? BankAccaunt { get; set; }
    public string? MFO { get; set; }
    public string? BankName { get; set; }
    public string? License { get; set; }
    public IFormFile? LicenseFile { get; set; }
    public string? Address { get; set; }
    public string Password { get; set; } = default!;
    // nullable: model binding "field is required" xatoligini oldini oladi
    public string? RecaptchaToken { get; set; }
}
public class VerifyCodeResult
{
    public int UserId { get; set; }
    public bool Success { get; set; }
    public string Message { get; set; } = default!;
    public string? Token { get; set; }
}


public class LoginDto
{
    public string? Phone { get; set; }
    public string? PhoneNumber { get; set; }
    public string Password { get; set; } = default!;
    // nullable: model binding "field is required" xatoligini oldini oladi
    public string? RecaptchaToken { get; set; }
}
public class VerifyCodeDto
{
    public string? Phone { get; set; }
    public string? PhoneNumber { get; set; }
    public string Code { get; set; } = default!;
}

public class PhoneNumberDto
{
    public string? Phone { get; set; }
    public string? PhoneNumber { get; set; }
}
public class ChangePasswordDto
{
    public string? Phone { get; set; }
    public string? PhoneNumber { get; set; }
    public string Code { get; set; } = default!;
    public string NewPassword { get; set; } = default!;
}
