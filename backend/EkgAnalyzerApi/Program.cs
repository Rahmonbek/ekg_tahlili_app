using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.Services;
using EkgAnalyzerApi.Hubs;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.AspNetCore.RateLimiting;
using EkgAnalyzerApi.Middleware;
using System.Net;


var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<HolterAnalyseService>();
builder.Services.AddScoped<SmadAnalyseService>();
builder.Services.AddScoped<PatcientService>();
builder.Services.AddScoped<LabAnalyseService>();
builder.Services.AddScoped<DoctorService>();
builder.Services.AddScoped<ECGAnalyseService>();
builder.Services.AddScoped<MedicalDiagnoseService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddHttpClient<ISmsService, EskizSmsService>();
builder.Services.AddScoped<TokenService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ClinicService>();;
builder.Services.AddScoped<PythonApiProxyService>();
builder.Services.AddScoped<AuditLogService>();
builder.Services.AddScoped<ParasitologyAnalyseService>();
builder.Services.AddScoped<DashboardService>();
builder.Services.AddScoped<PdfReportService>();     // PDF hisobot generatsiyasi
builder.Services.AddSingleton<EncryptionService>(); // AES-256 shifrlash
builder.Services.AddSingleton<IVideoCallConnectionService, VideoCallConnectionService>();
builder.Services.AddSingleton<AnalysisProgressTracker>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<AnalysisProgressTracker>());
builder.Services.AddScoped<IOnlineConsultationService, OnlineConsultationService>();
builder.Services.AddSingleton<IConsultationConnectionService, ConsultationConnectionService>();
builder.Services.AddHostedService<ConsultationExpiryService>();
builder.Services.AddSignalR();

// Python API proxy uchun HttpClient
builder.Services.AddHttpClient("PythonApi", client =>
{
    client.BaseAddress = new Uri(builder.Configuration["PythonApi:BaseUrl"] ?? "http://127.0.0.1:8000");
    client.Timeout = TimeSpan.FromMinutes(5); // AI tahlil uzoq davom etishi mumkin
});
// DbContext ulash
builder.Services.AddDbContext<MedDataDB>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})

.AddJwtBearer(options =>
{
    // C6 talabi: production da HTTPS majburiy, faqat dev da o'chiriladi
    options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
    options.SaveToken = true;
    var jwtKey = builder.Configuration["Jwt:Key"];
    if (string.IsNullOrWhiteSpace(jwtKey))
    {
        throw new InvalidOperationException("Jwt:Key sozlanmagan. Productionda Jwt__Key environment variable orqali kiriting.");
    }
    var key = Encoding.UTF8.GetBytes(jwtKey);
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidateAudience = true,
        ValidAudience = builder.Configuration["Jwt:Audience"],
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
    // SignalR WebSocket ulanishlari token ni query string dan o'qiydi
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                context.Token = accessToken;
            return Task.CompletedTask;
        }
    };
});
builder.Services.AddRateLimiter(options => {
    options.RejectionStatusCode = 429; // Too Many Requests

    // Login/Register — 5 ta so'rov / 1 daqiqa (brute-force himoya)
    options.AddSlidingWindowLimiter("strict", opt => {
        opt.Window = TimeSpan.FromMinutes(1);
        opt.SegmentsPerWindow = 2;
        opt.PermitLimit = 5;
    });

    // AI tahlil endpointlar — 10 ta so'rov / 1 daqiqa
    options.AddSlidingWindowLimiter("ai-analysis", opt => {
        opt.Window = TimeSpan.FromMinutes(1);
        opt.SegmentsPerWindow = 2;
        opt.PermitLimit = 10;
    });

    // Umumiy API — 100 ta so'rov / 1 daqiqa
    options.AddSlidingWindowLimiter("general", opt => {
        opt.Window = TimeSpan.FromMinutes(1);
        opt.SegmentsPerWindow = 4;
        opt.PermitLimit = 100;
    });
});
builder.Services.AddAuthorization();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        var allowedOrigins =
            builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?? builder.Configuration["Cors:AllowedOrigins"]?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            ?? builder.Configuration["AllowedOrigins"]?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            ?? new[] { "http://localhost:3000", "https://nmed.uz" };

        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

builder.WebHost.ConfigureKestrel(options =>
{
    var bindAddress = builder.Configuration["Kestrel:BindAddress"] ?? "0.0.0.0";
    var httpPort = builder.Configuration.GetValue<int?>("Kestrel:HttpPort") ?? 5000;
    var enableHttpsEndpoint = builder.Configuration.GetValue("Kestrel:EnableHttpsEndpoint", builder.Environment.IsDevelopment());
    var httpsPort = builder.Configuration.GetValue<int?>("Kestrel:HttpsPort") ?? 5001;

    var bindIp = bindAddress is "*" or "0.0.0.0"
        ? IPAddress.Any
        : IPAddress.Parse(bindAddress);

    options.Listen(bindIp, httpPort);

    if (enableHttpsEndpoint)
    {
        options.Listen(bindIp, httpsPort, listenOptions => listenOptions.UseHttps());
    }
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<MedDataDB>();
        if (context.Database.GetPendingMigrations().Any())
        {
            context.Database.Migrate();
        }
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Migration bajarishda xatolik yuz berdi. Server noto'g'ri holatda ishga tushgan bo'lishi mumkin.");
    }
}
if (app.Environment.IsDevelopment() || app.Configuration.GetValue("Swagger:Enabled", false))
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseRouting();
app.UseCors("AllowAll");
app.UseRateLimiter(); // TT 4.1.6.3 — IP asosida so'rovlar cheklovi
app.UseAuthentication();
app.UseStaticFiles();
app.UseAuthorization();
app.UseAuditLogging(); // TT 4.1.6 — audit log middleware
app.MapControllers();
app.MapHub<VideoCallHub>("/hubs/videocall");
app.MapHub<EkgAnalyzerApi.Hubs.ConsultationHub>("/hubs/consultation");
app.MapHub<AnalysisHub>("/hubs/analysis");
app.Run();
