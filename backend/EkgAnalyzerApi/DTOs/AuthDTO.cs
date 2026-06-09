namespace EkgAnalyzerApi.DTOs;

public class RegisterDto
{
    public string? Username { get; set; }
    public string? Phone { get; set; }
    public string? PhoneNumber { get; set; }
    public string ClinicInn { get; set; } = default!;
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
    public string? Username { get; set; }
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
