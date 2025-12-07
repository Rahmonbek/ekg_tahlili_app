public interface IEmailService
{
    Task SendAsync(string to, string subject, string body);
}

public class EmailService : IEmailService
{
    public Task SendAsync(string to, string subject, string body)
    {
        Console.WriteLine($"Sending Email to {to}: {body}");
        return Task.CompletedTask;
    }
}
