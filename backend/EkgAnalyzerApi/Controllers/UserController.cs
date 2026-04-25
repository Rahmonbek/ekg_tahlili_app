using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

[ApiController]
[Route("api/user")]
public class UserController : ControllerBase
{
    private readonly UserService _userService;
    private readonly MedDataDB _context;

    public UserController(UserService userService, MedDataDB context)
    {
        _userService = userService;
        _context = context;
    }


    [HttpGet("get-user-by-token")]
    [Authorize]
    public async Task<IActionResult> GetUser()
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var userId = int.Parse(userIdClaim.Value);

        var user = await _userService.GetUserByIdAsync(userId);
        if (user == null)
            return NotFound(new { message = "user not found" });

        return Ok(user);
    }

    /// <summary>
    /// Admin onboarding uchun profil to'ldirilganligini tekshirish.
    /// profileComplete: true → shifokor ma'lumotlari to'ldirilgan
    /// clinicComplete:  true → klinika asosiy ma'lumotlari to'ldirilgan
    /// </summary>
    [HttpGet("onboarding-status")]
    [Authorize]
    public async Task<IActionResult> GetOnboardingStatus()
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var userId = int.Parse(userIdClaim.Value);

        var user = await _context.Users
            .Include(u => u.Doctor)
            .Include(u => u.Clinic).ThenInclude(c => c!.ClinicDetail)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
            return NotFound();

        // Shifokor ma'lumotlari to'liq: ismi va familiyasi kiritilgan bo'lsa
        var doctor = user.Doctor;
        var profileComplete = doctor != null
            && !string.IsNullOrWhiteSpace(doctor.FirstName)
            && !string.IsNullOrWhiteSpace(doctor.LastName);

        // Klinika ma'lumotlari to'liq: nomi va tafsilotlari bo'lsa
        var clinic = user.Clinic;
        var clinicComplete = clinic != null
            && !string.IsNullOrWhiteSpace(clinic.ClinicName)
            && clinic.ClinicDetail != null
            && !string.IsNullOrWhiteSpace(clinic.ClinicDetail.Address);

        return Ok(new
        {
            profileComplete,
            clinicComplete,
            clinicIsActive = clinic?.IsActive ?? false,
            roleId = user.RoleId
        });
    }
}