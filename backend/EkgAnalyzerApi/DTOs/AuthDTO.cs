namespace EkgAnalyzerApi.DTOs;

public class RegisterDto
{
    public string Username { get; set; } = default!;
    public string Email { get; set; } = default!;
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
    public string Username { get; set; } = default!;
    public string Password { get; set; } = default!;
    // nullable: model binding "field is required" xatoligini oldini oladi
    public string? RecaptchaToken { get; set; }
}
public class VerifyCodeDto
{
    public string Email { get; set; } = default!;
    public string Code { get; set; } = default!;
}

public class EmailDTO
{
    public string Email { get; set; } = default!;
}
public class ChangePasswordDto
{
    public string Email { get; set; } = default!;
    public string Code { get; set; } = default!;
    public string NewPassword { get; set; } = default!;
}
