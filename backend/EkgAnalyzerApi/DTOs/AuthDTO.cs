namespace EkgAnalyzerApi.DTOs;

public class RegisterDto
{
    public string Email { get; set; } = default!;
    public string Password { get; set; } = default!;
}

public class VerifyCodeDto
{
    public string Email { get; set; } = default!;
    public string Code { get; set; } = default!;
}

public class LoginDto
{
    public string Email { get; set; } = default!;
    public string Password { get; set; } = default!;
}

public class ChangePasswordDto
{
    public string Email { get; set; } = default!;
    public string NewPassword { get; set; } = default!;
    public string Code { get; set; } = default!;
}
