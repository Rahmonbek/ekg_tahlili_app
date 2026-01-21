using System.Net.Mail;
using MailKit.Net.Smtp;
using MimeKit;
public interface IEmailService
{
    Task SendAsync(string to, string subject, string body);
}

public class EmailService : IEmailService
{
    public async Task SendAsync(string to, string subject, string body)
    {
        var message = new MimeMessage();
        // Kimdan yuborilayotgani
        message.From.Add(new MailboxAddress("Sizning Saytingiz", "sizning_emailingiz@gmail.com"));
        // Kimga yuborilayotgani
        message.To.Add(new MailboxAddress("", to));
        message.Subject = subject;

        message.Body = new TextPart("plain")
        {
            Text = body
        };

        using (var client = new SmtpClient())
        {
            // Gmail uchun: smtp.gmail.com, port: 587
            await client.ConnectAsync("smtp.gmail.com", 587, MailKit.Security.SecureSocketOptions.StartTls);

            // Muhim: Bu yerda oddiy parol emas, "App Password" ishlatiladi
            await client.AuthenticateAsync("sizning_emailingiz@gmail.com", "maxfiy_app_parol");

            await client.SendAsync(message);
            await client.DisconnectAsync(true);
        }
    }
}
