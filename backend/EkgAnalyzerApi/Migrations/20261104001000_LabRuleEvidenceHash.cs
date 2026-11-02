using EkgAnalyzerApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <summary>
    /// Xavf signallari: dalil barmoq izi va xato hisoblagichi (L-10, L-11, L-19).
    ///
    ///  * `lab_rule_signals.evidence_hash` — SHA-256 (holat + daraja + asosiy
    ///    tahlil + dalil qiymatlari/sanalari/chegaralari), `LabRuleEngine.EvidenceHash`.
    ///    Xesh o'zgarsa shifokor qarori `pending` ga qaytadi va izohi tozalanadi
    ///    (ilgari faqat tahlil ID yoki holat o'zgarsa — K 5.6 → 6.3 "tasdiqlangan"
    ///    bo'lib qolardi). Xesh bir xil bo'lsa — qaror saqlanadi. Eski qatorlarda
    ///    NULL: birinchi qayta hisobda avvalgi shart ishlatiladi.
    ///  * `lab_rule_patient_state.error_count` — ketma-ket xatolar soni: bir
    ///    bemorning xatosi siklni band qilmasin (3 dan keyin ma'lumot
    ///    o'zgarguncha qayta urinilmaydi).
    /// </summary>
    [DbContext(typeof(MedDataDB))]
    [Migration("20261104001000_LabRuleEvidenceHash")]
    public partial class LabRuleEvidenceHash : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE lab_rule_signals ADD COLUMN IF NOT EXISTS evidence_hash text;
                ALTER TABLE lab_rule_patient_state ADD COLUMN IF NOT EXISTS error_count integer NOT NULL DEFAULT 0;");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE lab_rule_patient_state DROP COLUMN IF EXISTS error_count;
                ALTER TABLE lab_rule_signals DROP COLUMN IF EXISTS evidence_hash;");
        }
    }
}
