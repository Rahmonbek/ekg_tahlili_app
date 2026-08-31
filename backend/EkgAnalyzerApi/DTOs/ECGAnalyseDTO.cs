using EkgAnalyzerApi.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.DTOs;


public class PagedResult<T>
{
    private int _page = 1;
    private int _pageSize = EkgAnalyzerApi.Services.Paging.DefaultPageSize;

    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }

    /// <summary>
    /// Sahifa raqami. Kiruvchi qiymat xavfsiz oraliqqa keltiriladi —
    /// mijozga hech qachon `page = 0` yoki manfiy qiymat qaytmaydi.
    /// </summary>
    public int Page
    {
        get => _page;
        set => _page = EkgAnalyzerApi.Services.Paging.Normalize(value, _pageSize).Page;
    }

    /// <summary>
    /// Sahifa hajmi. Yuqori chegara <see cref="EkgAnalyzerApi.Services.Paging.MaxPageSize"/>.
    /// </summary>
    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = EkgAnalyzerApi.Services.Paging.Normalize(_page, value).PageSize;
    }

    // PageSize nol bo'lsa (double)/0 = Infinity bo'lib, int ga o'girilganda
    // int.MinValue (-2147483648) qaytarardi — frontend pagination buzilardi.
    public int TotalPages => PageSize <= 0 ? 0 : (int)Math.Ceiling((double)TotalCount / PageSize);
}
public class ECGAnalyseDTO
{
    /// <summary>Hujjat raqami (masalan NMED-EKG-00000096).</summary>
    public string? DocumentNumber { get; set; }

    /// <summary>
    /// AI xulosasi qaysi tilda yaratilgan (`uz`/`ru`/`en`) — T-059.
    /// Interfeys tili boshqa bo'lsa sahifada bu haqda ogohlantiriladi.
    /// </summary>
    public string? AiLang { get; set; }

    /// <summary>Tahlil aslida o'tkazilgan sana (yozuv yaratilgan sana emas).</summary>
    public DateTime? AnalysisDate { get; set; }

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
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? SureName { get; set; }
    public string? Phone { get; set; }
    public RolesDTO? Role { get; set; }
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