using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace EkgAnalyzerApi.Models
{
    [Table("lab_analyses")]
    public class LabAnalyses
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }
        
        [Column("clinic_id")]
        public int? ClinicId { get; set; }
        public Clinic Clinic { get; set; } = null!;

        [Column("created_doctor_id")]
        public int CreatedDoctorId { get; set; }
        [ForeignKey(nameof(CreatedDoctorId))]
        public Doctor CreatedDoctor { get; set; } = null!;

        [Column("patcient_id")]
        public int PatcientId { get; set; }
        [ForeignKey(nameof(PatcientId))]
        public Patcient Patcient { get; set; } = null!;

        [Column("status")]
        public int? Status { get; set; } = 0;

        [Column("analyse_file_link")]
        public string? AnalyseFileLink { get; set; }
       
        [Column("ai_answer_data", TypeName = "text")]
        public string? AIAnswerData { get; set; }

        [Column("hb")]
        public decimal? hb { get; set; }   // g/L

        [Column("rbc")]
        public decimal? rbc { get; set; }  // x10^12/L

        [Column("wbc")]
        public decimal? wbc { get; set; }  // x10^9/L

        [Column("plt")]
        public decimal? plt { get; set; }  // x10^9/L

        [Column("hct")]
        public decimal? hct { get; set; }  // %

        [Column("mcv")]
        public decimal? mcv { get; set; }  // fL

        [Column("mch")]
        public decimal? mch { get; set; }  // pg

        [Column("mchc")]
        public decimal? mchc { get; set; } // g/L

        [Column("esr")]
        public decimal? esr { get; set; }  // mm/hour
        [Column("glucose")]
        public decimal? glucose { get; set; } // mmol/L

        [Column("cholesterol")]
        public decimal? cholesterol { get; set; } // mmol/L

        [Column("alt")]
        public decimal? alt { get; set; } // U/L

        [Column("ast")]
        public decimal? ast { get; set; } // U/L

        [Column("bilirubin_total")]
        public decimal? bilirubin_total { get; set; } // µmol/L

        [Column("bilirubin_direct")]
        public decimal? bilirubin_direct { get; set; } // µmol/L

        [Column("creatinine")]
        public decimal? creatinine { get; set; } // µmol/L

        [Column("urea")]
        public decimal? urea { get; set; } // mmol/L

        [Column("total_protein")]
        public decimal? total_protein { get; set; } // g/L

        [Column("albumin")]
        public decimal? albumin { get; set; } // g/L

        [Column("calcium")]
        public decimal? calcium { get; set; } // mmol/L

        [Column("sodium")]
        public decimal? sodium { get; set; } // mmol/L

        [Column("potassium")]
        public decimal? potassium { get; set; } // mmol/L

        [Column("iron")]
        public decimal? iron { get; set; } // µmol/L

        [Column("tsh")]
        public decimal? tsh { get; set; } // µIU/mL

        [Column("free_t4")]
        public decimal? free_t4 { get; set; } // pmol/L

        [Column("insulin")]
        public decimal? insulin { get; set; } // µIU/mL
        [Column("urine_volume")]
        public decimal? urine_volume { get; set; } // mL

        [Column("urine_density")]
        public decimal? urine_density { get; set; } // 1.010–1.025

        [Column("urine_ph")]
        public decimal? urine_ph { get; set; } // 0–14

        [Column("urine_protein")]
        public decimal? urine_protein { get; set; } // g/L

        [Column("urine_glucose")]
        public decimal? urine_glucose { get; set; } // mmol/L

        [Column("urine_ketones")]
        public decimal? urine_ketones { get; set; } // mmol/L

        [Column("urine_bilirubin")]
        public decimal? urine_bilirubin { get; set; } // µmol/L

        [Column("urobilinogen")]
        public decimal? urobilinogen { get; set; } // µmol/L

        [Column("urine_rbc")]
        public decimal? urine_rbc { get; set; } // count per field

        [Column("urine_wbc")]
        public decimal? urine_wbc { get; set; } // count per field

        [Column("daily_protein")]
        public decimal? daily_protein { get; set; } // mg/24h

        [Column("daily_creatinine")]
        public decimal? daily_creatinine { get; set; } // mmol/24h

        [Column("daily_calcium")]
        public decimal? daily_calcium { get; set; } // mmol/24h

        [Column("daily_sodium")]
        public decimal? daily_sodium { get; set; } // mmol/24h

        [Column("created_at")]
        public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; } = DateTime.UtcNow;
        public List<LabAnalyseCategories>? Categories { get; set; }
    }
}