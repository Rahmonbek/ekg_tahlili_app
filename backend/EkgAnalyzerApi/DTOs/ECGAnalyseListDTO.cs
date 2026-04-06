using EkgAnalyzerApi.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.DTOs;

public class ECGAnalyseListDTO
{
    public int Id { get; set; }
    public int? Status { get; set; } = 0;
    public int? AIStatus { get; set; } // 1: Normal, 2: Average, 3: Danger
    public DateTime? CreatedAt { get; set; }
    public bool? IsViewed { get; set; }
    public PatcientForECG? Patcient { get; set; }
    public DoctorForECGData? CreatedDoctor { get; set; }
}
