using EkgAnalyzerApi.Models;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.DTOs;



public class LabAnalyseDTO
{
    /// <summary>Hujjat raqami (masalan NMED-EKG-00000096).</summary>
    public string? DocumentNumber { get; set; }

    /// <summary>Tahlil aslida o'tkazilgan sana (yozuv yaratilgan sana emas).</summary>
    public DateTime? AnalysisDate { get; set; }

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
    // ── Qo'shimcha ko'rsatkichlar (20260905 migratsiya) ──
    public decimal? triglycerides { get; set; } // mmol/L
    public decimal? hdl { get; set; } // mmol/L
    public decimal? ldl { get; set; } // mmol/L
    public decimal? vldl { get; set; } // mmol/L
    public decimal? atherogenic_index { get; set; } // None
    public decimal? hba1c { get; set; } // %
    public decimal? c_peptide { get; set; } // ng/mL
    public decimal? crp { get; set; } // mg/L
    public decimal? ggt { get; set; } // U/L
    public decimal? alp { get; set; } // U/L
    public decimal? amylase { get; set; } // U/L
    public decimal? lipase { get; set; } // U/L
    public decimal? ldh { get; set; } // U/L
    public decimal? ck { get; set; } // U/L
    public decimal? ck_mb { get; set; } // U/L
    public decimal? uric_acid { get; set; } // µmol/L
    public decimal? magnesium { get; set; } // mmol/L
    public decimal? phosphorus { get; set; } // mmol/L
    public decimal? chloride { get; set; } // mmol/L
    public decimal? ferritin { get; set; } // µg/L
    public decimal? tibc { get; set; } // µmol/L
    public decimal? transferrin { get; set; } // g/L
    public decimal? bilirubin_indirect { get; set; } // µmol/L
    public decimal? globulin { get; set; } // g/L
    public decimal? free_t3 { get; set; } // pmol/L
    public decimal? t3_total { get; set; } // nmol/L
    public decimal? t4_total { get; set; } // nmol/L
    public decimal? vitamin_d { get; set; } // ng/mL
    public decimal? vitamin_b12 { get; set; } // pg/mL
    public decimal? folate { get; set; } // ng/mL
    public decimal? prothrombin_time { get; set; } // sekund
    public decimal? prothrombin_index { get; set; } // %
    public decimal? inr { get; set; } // None
    public decimal? aptt { get; set; } // sekund
    public decimal? fibrinogen { get; set; } // g/L
    public decimal? thrombin_time { get; set; } // sekund
    public decimal? d_dimer { get; set; } // mg/L
    public decimal? neutrophils { get; set; } // %
    public decimal? lymphocytes { get; set; } // %
    public decimal? monocytes { get; set; } // %
    public decimal? eosinophils { get; set; } // %
    public decimal? basophils { get; set; } // %
    public decimal? rdw { get; set; } // %
    public decimal? mpv { get; set; } // fL
    public decimal? pdw { get; set; } // %
    public decimal? pct { get; set; } // %
    public decimal? reticulocytes { get; set; } // %
    public List<DoctorForECGData>? Doctors { get; set; }
    public DoctorForECGData? CreatedDoctor { get; set; }
    public PatcientForECG? Patcient { get; set; }
    public ClinicForECG? Clinic { get; set; }
    public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
    public List<LabCategoryDto>? Categories { get; set; }
}

