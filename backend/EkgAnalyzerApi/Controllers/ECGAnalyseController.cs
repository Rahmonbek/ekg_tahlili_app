using EkgAnalyzerApi.Data;
using EkgAnalyzerApi.DTOs;
using EkgAnalyzerApi.Models;
using EkgAnalyzerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

[ApiController]
[Route("api/ecg-analyses")]
public class ECGAnalyseController : ControllerBase
{
    private readonly MedDataDB _context;

    public ECGAnalyseController(MedDataDB context)
    {
        _context = context;
    }


    [HttpGet("get-ecg-analyses-by-patcient-id/{id}")]
    public async Task<IActionResult> GetECGAnalysesByPatcientId(int id)
    {
        // 1. Validate User Claim
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            return Unauthorized(new { message = "Token invalid" });

        // 2. Query and Map to DTO in one step
        var results = await _context.ECGAnalyse
            .Where(e => e.PatcientId == id)
            .Select(e => new ECGAnalyseDTO
            {
                Id = e.Id,
                CreatedDoctorId = e.CreatedDoctorId,
                PatcientId = e.PatcientId,
                Status = e.Status,
                AnalyseFileLink = e.AnalyseFileLink,
                GeneratedFileLink = e.GeneratedFileLink,
                AIAnswerData = e.AIAnswerData,
                CreatedAt = e.CreatedAt,
                UpdatedAt = e.UpdatedAt,

                // Accessing through the newly added navigation property: ed.Doctor
                Doctors = e.Doctors.Select(ed => new DoctorForECGData
                {
                    Id = ed.Doctor.Id,
                    FirstName = ed.Doctor.FirstName ?? "",
                    LastName = ed.Doctor.LastName ?? "",
                    SureName = ed.Doctor.SureName ?? "",
                    Phone = ed.Doctor.Phone ?? ""
                }).ToList(),

                // Accessing through the newly added navigation property: ec.Complaint
                Complaints = e.Complaints.Select(ec => new Complaints
                {
                    Id = ec.Complaint.Id,
                    NameUz = ec.Complaint.NameUz,
                    NameRu = ec.Complaint.NameRu,
                    NameEn = ec.Complaint.NameEn,
                    CreatedAt = ec.Complaint.CreatedAt,
                    UpdatedAt = ec.Complaint.UpdatedAt
                }).ToList()
            })
            .ToListAsync();

        return Ok(results);
    }
}