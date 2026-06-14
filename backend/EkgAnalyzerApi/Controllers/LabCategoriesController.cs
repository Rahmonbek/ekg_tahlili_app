using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

[ApiController]
[Route("api/lac-categories")]
[Authorize]
public class LabCategoriesController : ControllerBase
{
    private readonly MedDataDB _context;

    public LabCategoriesController(MedDataDB context)
    {
        _context = context;
    }


    [HttpGet("get-all-lab-categories")]
    public async Task<IActionResult> GetAllLabCategories()
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        var labBigCategories = await _context.LabBigCategories
      .Include(b => b.Categories)
      .OrderBy(b => b.Id) // BigCategory-larni Id bo'yicha tartiblash
      .Select(b => new LabBigCategoryDto
      {
          Id = b.Id,
          NameUz = b.NameUz,
          NameRu = b.NameRu,
          NameEn = b.NameEn,
          Categories = b.Categories
              .OrderBy(c => c.NameUz) // Categories-larni NameUz bo'yicha tartiblash
              .Select(c => new LabCategoryDto
              {
                  Id = c.Id,
                  NameUz = c.NameUz,
                  NameRu = c.NameRu,
                  NameEn = c.NameEn
              }).ToList()
      })
      .ToListAsync();

        return Ok(labBigCategories);
    }
}