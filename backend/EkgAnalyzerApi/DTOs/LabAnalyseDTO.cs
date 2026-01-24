using EkgAnalyzerApi.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.DTOs;



public class LabAnalyseDTO
{
    public int Id { get; set; }

    public int CreatedDoctorId { get; set; }

    public int PatcientId { get; set; }

    public int? Status { get; set; } = 0;

    public string? AnalyseFileLink { get; set; }

    public string? AIAnswerData { get; set; }

    public decimal? hb { get; set; }   // g/L
    public decimal? rbc { get; set; }  // x10^12/L
    public decimal? wbc { get; set; }  // x10^9/L
    public decimal? plt { get; set; }  // x10^9/L
    public decimal? hct { get; set; }  // %
    public decimal? mcv { get; set; }  // fL
    public decimal? mch { get; set; }  // pg
    public decimal? mchc { get; set; } // g/L
    public decimal? esr { get; set; }  // mm/hour
    public decimal? glucose { get; set; } // mmol/L
    public decimal? cholesterol { get; set; } // mmol/L
    public decimal? alt { get; set; } // U/L
    public decimal? ast { get; set; } // U/L
    public decimal? bilirubin_total { get; set; } // µmol/L
    public decimal? bilirubin_direct { get; set; } // µmol/L
    public decimal? creatinine { get; set; } // µmol/L
    public decimal? urea { get; set; } // mmol/L
    public decimal? total_protein { get; set; } // g/L
    public decimal? albumin { get; set; } // g/L
    public decimal? calcium { get; set; } // mmol/L
    public decimal? sodium { get; set; } // mmol/L
    public decimal? potassium { get; set; } // mmol/L
    public decimal? iron { get; set; } // µmol/L
    public decimal? tsh { get; set; } // µIU/mL
    public decimal? free_t4 { get; set; } // pmol/L
    public decimal? insulin { get; set; } // µIU/mL
    public decimal? urine_volume { get; set; } // mL
    public decimal? urine_density { get; set; } // 1.010–1.025
    public decimal? urine_ph { get; set; } // 0–14
    public decimal? urine_protein { get; set; } // g/L
    public decimal? urine_glucose { get; set; } // mmol/L
    public decimal? urine_ketones { get; set; } // mmol/L
    public decimal? urine_bilirubin { get; set; } // µmol/L
    public decimal? urobilinogen { get; set; } // µmol/L
    public decimal? urine_rbc { get; set; } // count per field
    public decimal? urine_wbc { get; set; } // count per field
    public decimal? daily_protein { get; set; } // mg/24h
    public decimal? daily_creatinine { get; set; } // mmol/24h
    public decimal? daily_calcium { get; set; } // mmol/24h
    public decimal? daily_sodium { get; set; } // mmol/24h
    public DoctorForECGData? CreatedDoctor { get; set; }
    public PatcientForECG? Patcient { get; set; }
    public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
    public List<LabCategoryDto>? Categories { get; set; }
}

