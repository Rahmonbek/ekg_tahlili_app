using EkgAnalyzerApi.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <summary>
    /// 1. `lab_analyses.analysis_date_source` — tahlil sanasi qayerdan olingani
    ///    (`user` | `document`). Statistika, dinamika va klinik qoidalar tahlil
    ///    KIRITILGAN vaqtni emas, tahlilning O'Z sanasini ishlatishi kerak:
    ///    foydalanuvchi sanani kiritmasa, u fayldan olinadi (Excel «Дата:»
    ///    katagi yoki AI hujjatdan o'qigan sana). Mavjud sanalardan faqat
    ///    yuklangan kundan farq qiladigani `user` (forma ilgari bugungi kunni
    ///    o'zi qo'yardi).
    ///
    /// 2. Eski 87 ta ko'rsatkich ustuni o'chiriladi — qiymatlar
    ///    `20261101000000_LabAnalysisValues` da `lab_analysis_values` ga
    ///    ko'chirilgan. Ehtiyot: o'chirishdan oldin ko'chirish yana bir bor
    ///    (idempotent) bajariladi va birorta qiymat ko'chmagan bo'lsa migratsiya
    ///    XATO bilan to'xtaydi — hech narsa o'chirilmaydi.
    /// </summary>
    [DbContext(typeof(MedDataDB))]
    [Migration("20261103000000_LabAnalysisDateSource")]
    public partial class LabAnalysisDateSource : Migration
    {
        private static readonly string[] LegacyColumns =
        {
            "hb", "rbc", "wbc", "plt", "hct", "mcv", "mch", "mchc",
            "esr", "glucose", "cholesterol", "alt", "ast", "bilirubin_total", "bilirubin_direct", "creatinine",
            "urea", "total_protein", "albumin", "calcium", "sodium", "potassium", "iron", "tsh",
            "free_t4", "insulin", "urine_volume", "urine_density", "urine_ph", "urine_protein", "urine_glucose", "urine_ketones",
            "urine_bilirubin", "urobilinogen", "urine_rbc", "urine_wbc", "daily_protein", "daily_creatinine", "daily_calcium", "daily_sodium",
            "triglycerides", "hdl", "ldl", "vldl", "atherogenic_index", "hba1c", "c_peptide", "crp",
            "ggt", "alp", "amylase", "lipase", "ldh", "ck", "ck_mb", "uric_acid",
            "magnesium", "phosphorus", "chloride", "ferritin", "tibc", "transferrin", "bilirubin_indirect", "globulin",
            "free_t3", "t3_total", "t4_total", "vitamin_d", "vitamin_b12", "folate", "prothrombin_time", "prothrombin_index",
            "inr", "aptt", "fibrinogen", "thrombin_time", "d_dimer", "neutrophils", "lymphocytes", "monocytes",
            "eosinophils", "basophils", "rdw", "mpv", "pdw", "pct", "reticulocytes",
        };

        private static string S(string v) => "'" + v.Replace("'", "''") + "'";

        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── 1. Sana manbai ──
            // Yuklash formasi sanani avtomatik BUGUN qilib qo'yardi — yuklangan
            // kunga teng sana tasdiqlanmagan hisoblanadi (NULL): keyingi AI
            // tahlilda yoki `repair_lab_dates.py` bilan fayldagi sana olinadi.
            // Yuklangan kundan farq qilsa — foydalanuvchi ataylab kiritgan.
            migrationBuilder.Sql(@"
                ALTER TABLE lab_analyses ADD COLUMN IF NOT EXISTS analysis_date_source varchar(16);
                UPDATE lab_analyses SET analysis_date_source = 'user'
                 WHERE analysis_date IS NOT NULL AND analysis_date_source IS NULL
                   AND (analysis_date AT TIME ZONE 'Asia/Tashkent')::date
                       <> (created_at AT TIME ZONE 'Asia/Tashkent')::date;");

            // ── 2. Eski ustunlar: oxirgi ko'chirish → tekshiruv → o'chirish ──
            foreach (var col in LegacyColumns)
            {
                migrationBuilder.Sql($@"
                    DO $$
                    DECLARE lost integer;
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                                       WHERE table_name = 'lab_analyses' AND column_name = {S(col)}) THEN
                            RETURN;
                        END IF;

                        INSERT INTO lab_analysis_values
                            (lab_analysis_id, value_type_id, patient_id, measured_at, value, unit)
                        SELECT la.id, vt.id, la.patient_id, COALESCE(la.analysis_date, la.created_at),
                               la.{col}, vt.measure
                          FROM lab_analyses la
                          JOIN lab_value_types vt ON vt.column_name = {S(col)}
                         WHERE la.{col} IS NOT NULL AND la.patient_id IS NOT NULL
                        ON CONFLICT (lab_analysis_id, value_type_id) DO NOTHING;

                        SELECT COUNT(*) INTO lost
                          FROM lab_analyses la
                          JOIN lab_value_types vt ON vt.column_name = {S(col)}
                         WHERE la.{col} IS NOT NULL AND la.patient_id IS NOT NULL
                           AND NOT EXISTS (SELECT 1 FROM lab_analysis_values v
                                            WHERE v.lab_analysis_id = la.id AND v.value_type_id = vt.id);
                        IF lost > 0 THEN
                            RAISE EXCEPTION 'lab_analyses.{col}: % ta qiymat lab_analysis_values ga ko''chmagan — ustun o''chirilmadi', lost;
                        END IF;

                        ALTER TABLE lab_analyses DROP COLUMN {col};
                    END $$;");
            }
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Eski ustunlar qaytarilmaydi: qiymatlar `lab_analysis_values` da,
            // ularni o'qiydigan kod ham yo'q.
            migrationBuilder.Sql("ALTER TABLE lab_analyses DROP COLUMN IF EXISTS analysis_date_source;");
        }
    }
}
