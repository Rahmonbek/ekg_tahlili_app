using EkgAnalyzerApi.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.DTOs;



public class MedicalDiagnoseDTO
{
    public int Id { get; set; }

    public int CreatedDoctorId { get; set; }
    public int MainDoctorId { get; set; }

    public int PatcientId { get; set; }


    public string? DiagnoseFileLink { get; set; }

    public DoctorForECGData? CreatedDoctor { get; set; }
    public DoctorForECGData? MainDoctor { get; set; }
    public PatcientForECG? Patcient { get; set; }
    public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;

    
}
