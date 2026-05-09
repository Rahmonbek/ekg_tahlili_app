using MailKit.Net.Smtp;
using MimeKit;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

public interface IEmailService
{
    Task SendVerificationCodeAsync(string to, string code);
}

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendVerificationCodeAsync(string to, string code)
    {
        var host     = _config["Smtp:Host"]     ?? "smtp.gmail.com";
        var port     = int.Parse(_config["Smtp:Port"] ?? "587");
        var username = _config["Smtp:Username"] ?? "";
        var password = _config["Smtp:Password"] ?? "";
        var fromName = _config["Smtp:FromName"] ?? "NMED";

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(fromName, username));
        message.To.Add(MailboxAddress.Parse(to));
        message.Subject = "Email tasdiqlash kodi";
        message.Body = new BodyBuilder
        {
            HtmlBody = GetHtmlTemplate(code),
            TextBody = $"Tasdiqlash kodi: {code}"
        }.ToMessageBody();

        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
        using var client = new SmtpClient();

        await client.ConnectAsync(host, port, MailKit.Security.SecureSocketOptions.StartTls, cts.Token);
        await client.AuthenticateAsync(username, password, cts.Token);
        await client.SendAsync(message, cts.Token);
        await client.DisconnectAsync(true, cts.Token);
    }

    private string GetHtmlTemplate(string code)
    {
        return $@"
<!DOCTYPE html>
<html>
<head>
  <meta charset='UTF-8'>
</head>
<body style='margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,sans-serif;'>
  <table width='100%' cellpadding='0' cellspacing='0'>
    <tr>
      <td align='center'>
        <table width='480' cellpadding='0' cellspacing='0' style='background:#ffffff;margin-top:40px;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.1);'>
          <tr>
            <td style='padding:24px;text-align:center;'>
              <h2 style='margin:0;color:#0f766e;'>NMED platformasi</h2>
              <p style='color:#555;font-size:14px;'>Email tasdiqlash</p>
            </td>
          </tr>

          <tr>
            <td style='padding:24px;text-align:center;'>
              <p style='font-size:16px;color:#333;'>
                Quyidagi tasdiqlash kodini kiriting:
              </p>

              <div style='margin:20px 0;
                          font-size:32px;
                          letter-spacing:6px;
                          font-weight:bold;
                          color:#0f766e;
                          background:#ecfeff;
                          padding:14px 20px;
                          border-radius:8px;
                          display:inline-block;'>
                {code}
              </div>

              <p style='font-size:13px;color:#777;'>
                Kod 10 daqiqa davomida amal qiladi.<br/>
                Agar siz bu so'rovni yubormagan bo'lsangiz, xatni e'tiborsiz qoldiring.
              </p>
            </td>
          </tr>

          <tr>
            <td style='padding:16px;text-align:center;background:#f9fafb;border-top:1px solid #eee;font-size:12px;color:#999;'>
              &copy; {DateTime.Now.Year} NMED. Barcha huquqlar himoyalangan.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";
    }
}
