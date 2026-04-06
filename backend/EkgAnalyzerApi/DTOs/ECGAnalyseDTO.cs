using EkgAnalyzerApi.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.DTOs;


public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
}
public class ECGAnalyseDTO
{
    public int Id { get; set; }

    public int CreatedDoctorId { get; set; }

    public int PatcientId { get; set; }

    public int? Status { get; set; } = 0;

    public string? AnalyseFileLink { get; set; }

    public string? GeneratedFileLink { get; set; }
    public string? GeneratedShortFileLink { get; set; }

    public string? AIAnswerData { get; set; }
    public DoctorForECGData? CreatedDoctor { get; set; }
    public PatcientForECG? Patcient { get; set; }
    public ClinicForECG? Clinic { get; set; }
    public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<DoctorForECGData>? Doctors { get; set; }
    public List<Complaints>? Complaints { get; set; }
}

public class ClinicForECG
{
    public int? Id { get; set; }
    public string? ClinicName { get; set; }
    public string? ClinicLogo { get; set; }
    public Districts? District { get; set; }
    public string? Address { get; set; }
    public List<string>? PhoneNumbers { get; set; }
}

    public class DoctorForECGData
{
    public int? Id { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string SureName { get; set; }
    public string Phone { get; set; }
    public RolesDTO Role { get; set; }
    public List<PositionDto>? Positions { get; set; }



}

public class PatcientForECG
{
    public int? Id { get; set; }
    public DateOnly BirthDate { get; set; }
    public bool Gender { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? SureName { get; set; }
    public string? Passport { get; set; }
}