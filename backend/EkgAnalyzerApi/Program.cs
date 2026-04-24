using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.AspNetCore.RateLimiting;
using EkgAnalyzerApi.Middleware;


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
builder.Services.AddScoped<TokenService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ClinicService>();;
builder.Services.AddScoped<PythonApiProxyService>();
builder.Services.AddScoped<AuditLogService>();
builder.Services.AddScoped<ParasitologyAnalyseService>();
builder.Services.AddScoped<DashboardService>();
builder.Services.AddScoped<PdfReportService>();     // PDF hisobot generatsiyasi
builder.Services.AddSingleton<EncryptionService>(); // AES-256 shifrlash

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
    var key = Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]);
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
        policy.WithOrigins("http://localhost:3000", "https://nmed.uz") // Aniq manzillar
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials(); // Endi xatolik bermaydi
    });
});

builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(5000); // HTTP
    options.ListenAnyIP(5001, listenOptions => listenOptions.UseHttps());
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
if (app.Environment.IsDevelopment())
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
app.Run();
