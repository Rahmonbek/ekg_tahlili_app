namespace EkgAnalyzerApi.Models;

public class User
{

    public int Id { get; set; }
    public string Email { get; set; } = default!;
    public string PasswordHash { get; set; } = default!;
    public string? PasswordPlain { get; set; }
    public int? ClinicId { get; set; }
    public bool Status { get; set; } = false;

    public List<VerificationCode> Codes { get; set; } = new();
}
