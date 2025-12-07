namespace EkgAnalyzerApi.Models;

public class VerificationCode
{
    public int Id { get; set; }

    public int UserId { get; set; }
   
    public string Code { get; set; } = default!;
    public DateTime ExpiresAt { get; set; }
    public bool IsUsed { get; set; } = false;
}
