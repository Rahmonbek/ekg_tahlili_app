namespace EkgAnalyzerApi.DTOs;

public class ParasitologyAnalyseCreateDto
{
    public int PatcientId { get; set; }
    public int ClinicId { get; set; }
    public int CreatedDoctorId { get; set; }
    public string? MicroscopyMethod { get; set; }
    public string? Magnification { get; set; }
    public int? EggCountPerField { get; set; }
    public int[]? DoctorIds { get; set; }
    public string Lang { get; set; } = "uz";
}

public class ParasitologyResultDto
{
    public int Id { get; set; }
    public string? HelminthType { get; set; }
    public string? HelminthNameUz { get; set; }
    public string? HelminthNameRu { get; set; }
    public string? HelminthNameEn { get; set; }
    public decimal? Confidence { get; set; }
    public string? InfectionLevel { get; set; }
}

public class ParasitologyAnalyseDTO
{
    public int Id { get; set; }
    public int PatcientId { get; set; }
    public int? ClinicId { get; set; }
    public int CreatedDoctorId { get; set; }
    public string? FilePath { get; set; }
    public string? MicroscopyMethod { get; set; }
    public string? Magnification { get; set; }
    public int? EggCountPerField { get; set; }
    public string? AiResponse { get; set; }
    public string AnalysisStatus { get; set; } = "pending";
    public int? JiddiylikDarajasi { get; set; }
    public string? Lang { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public PatcientForECG? Patcient { get; set; }
    public DoctorForECGData? CreatedDoctor { get; set; }
    public ClinicForECG? Clinic { get; set; }
    public List<DoctorForECGData>? Doctors { get; set; }
    public List<ParasitologyResultDto>? Results { get; set; }
}

public class ParasitologyStatisticsDto
{
    public int JamiTahlillar { get; set; }
    public int GijjaTopilgan { get; set; }
    public int Topilmagan { get; set; }
    public List<HelminthStatDto> EngKopTurlar { get; set; } = new();
    public List<ViloyatStatDto> ViloyatlarBoyicha { get; set; } = new();
    public List<YoshGuruhStatDto> YoshGuruhlari { get; set; } = new();
    public List<OylikDinamikaDto> OylikDinamika { get; set; } = new();
}

public class HelminthStatDto
{
    public string? Tur { get; set; }
    public string? UzNomi { get; set; }
    public int Soni { get; set; }
    public decimal Foizi { get; set; }
}

public class ViloyatStatDto
{
    public string? Viloyat { get; set; }
    public int Soni { get; set; }
    public int OgirSoni { get; set; }
}

public class YoshGuruhStatDto
{
    public string? Guruh { get; set; }
    public int Soni { get; set; }
    public decimal Foizi { get; set; }
}

public class OylikDinamikaDto
{
    public string? Oy { get; set; }
    public int Soni { get; set; }
    public int Topilgan { get; set; }
}

public class ParasitologyAnalyseListDTO
{
    public int Id { get; set; }
    public string AnalysisStatus { get; set; } = "pending";
    public int? JiddiylikDarajasi { get; set; }
    public DateTime? CreatedAt { get; set; }
    public PatcientForECG? Patcient { get; set; }
    public DoctorForECGData? CreatedDoctor { get; set; }
}
