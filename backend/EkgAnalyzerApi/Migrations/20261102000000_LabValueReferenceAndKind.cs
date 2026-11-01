using EkgAnalyzerApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <summary>
    /// `lab_analysis_values` ga laboratoriyaning O'Z referens chegaralari va
    /// sifat natijasi holati qo'shiladi ("NMED laboratoriya klinik qoidalari"
    /// spetsifikatsiyasi, 2026-11-01).
    ///
    ///  * `ref_low` / `ref_high` / `ref_text` — fayldagi me'yor (qiymat bilan
    ///    bir xil birlikda; birlik aylantirilsa — ular ham). Baho (`flag`)
    ///    avval shu chegaralar bilan, bo'lmasa katalog me'yori bilan
    ///    hisoblanadi (`flag_source` = lab | catalog). Sabab: me'yor assayga
    ///    xos — masalan klinikaning erkin T3 me'yori 1.2–4.2 pmol/L, katalogda
    ///    3.1–6.8; katalog bilan solishtirish deyarli hamma natijani "past"
    ///    qilardi. Qoidalar ham "laboratoriya ULN/LLN" ni talab qiladi.
    ///  * `result_kind` — sifat natijasi: NEGATIVE | POSITIVE | EQUIVOCAL |
    ///    INVALID | UNKNOWN. Ilgari "0 = manfiy, 1 = musbat YOKI shubhali"
    ///    deb kodlanardi — spetsifikatsiya buni taqiqlaydi (shubhali natija
    ///    musbatdan farq qiladi). `value` endi faqat laboratoriya bergan
    ///    indeks (COI) bo'lsa to'ldiriladi.
    ///
    /// Mavjud sifat qatorlari asl yozuv (`text`) bo'yicha qayta tasniflanadi.
    /// Idempotent.
    /// </summary>
    [DbContext(typeof(MedDataDB))]
    [Migration("20261102000000_LabValueReferenceAndKind")]
    public partial class LabValueReferenceAndKind : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE lab_analysis_values ADD COLUMN IF NOT EXISTS ref_low numeric;
                ALTER TABLE lab_analysis_values ADD COLUMN IF NOT EXISTS ref_high numeric;
                ALTER TABLE lab_analysis_values ADD COLUMN IF NOT EXISTS ref_text varchar(300);
                ALTER TABLE lab_analysis_values ADD COLUMN IF NOT EXISTS result_kind varchar(16);
                ALTER TABLE lab_analysis_values ADD COLUMN IF NOT EXISTS flag_source varchar(8);");

            // Sifat natijalari asl yozuv bo'yicha. "0/1" kodi soxta son edi —
            // indeks (COI) bo'lmasa `value` tozalanadi.
            migrationBuilder.Sql(@"
                UPDATE lab_analysis_values v
                   SET result_kind = CASE
                           WHEN v.text ~* '(сомнит|shubha|equivoc|\(\+-\)|\(-\+\)|±)' THEN 'EQUIVOCAL'
                           WHEN v.text ~* '(отриц|manfiy|negativ|nonreact|не обнаруж|\(-\))' THEN 'NEGATIVE'
                           WHEN v.text ~* '(полож|musbat|positiv|reactiv|обнаруж|\(\+\))' THEN 'POSITIVE'
                           WHEN v.text IS NULL AND v.value IS NOT NULL AND v.value < 1 THEN 'NEGATIVE'
                           WHEN v.text IS NULL AND v.value IS NOT NULL AND v.value >= 1 THEN 'POSITIVE'
                           ELSE 'UNKNOWN' END,
                       value = CASE WHEN v.text IS NOT NULL AND v.value IN (0, 1) THEN NULL ELSE v.value END
                  FROM lab_value_types t
                 WHERE t.id = v.value_type_id
                   AND t.value_kind = 'qualitative'
                   AND v.result_kind IS NULL;");

            migrationBuilder.Sql(@"
                UPDATE lab_analysis_values v
                   SET flag = CASE v.result_kind
                                  WHEN 'NEGATIVE' THEN 0
                                  WHEN 'POSITIVE' THEN 1
                                  WHEN 'EQUIVOCAL' THEN 1
                                  ELSE NULL END,
                       flag_source = CASE WHEN v.result_kind IN ('NEGATIVE', 'POSITIVE', 'EQUIVOCAL')
                                          THEN 'lab' END
                  FROM lab_value_types t
                 WHERE t.id = v.value_type_id AND t.value_kind = 'qualitative';
                UPDATE lab_analysis_values SET flag_source = 'catalog'
                 WHERE flag IS NOT NULL AND flag_source IS NULL;");

            // Sifat ko'rsatkichlarining katalog chegarasi endi faqat indeks (COI)
            // uchun ma'noli — izohda aytiladi
            migrationBuilder.Sql(@"
                UPDATE lab_value_types
                   SET ai_hint = regexp_replace(ai_hint,
                        'SIFAT: 0 = manfiy, 1 = musbat yoki shubhali; faylda indeks \(COI, S/CO\) son bo''lsa - o''sha son; asl yozuv `text` ga',
                        'SIFAT natijasi: holati `result_kind` ga (NEGATIVE/POSITIVE/EQUIVOCAL/INVALID), asl yozuv `text` ga; `value` faqat faylda indeks (COI, S/CO) son bo''lsa')
                 WHERE value_kind = 'qualitative';");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE lab_analysis_values DROP COLUMN IF EXISTS flag_source;
                ALTER TABLE lab_analysis_values DROP COLUMN IF EXISTS result_kind;
                ALTER TABLE lab_analysis_values DROP COLUMN IF EXISTS ref_text;
                ALTER TABLE lab_analysis_values DROP COLUMN IF EXISTS ref_high;
                ALTER TABLE lab_analysis_values DROP COLUMN IF EXISTS ref_low;");
        }
    }
}
