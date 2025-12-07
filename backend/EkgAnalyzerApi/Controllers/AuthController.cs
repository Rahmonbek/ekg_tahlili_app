using Microsoft.AspNetCore.Mvc;
using EkgAnalyzerApi.DTOs;

[Route("api/auth")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    [HttpGet("get-clinica-by-token")]
    public async Task<IActionResult> getClinicByToken(RegisterDto dto)
    {
        await _authService.RegisterAsync(dto);
        return Ok(new { message = "code_sended" });
    }

   
}
