using EkgAnalyzerApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <summary>
    /// "Non-reactive" / "Non reactive" (chiziqcha yoki bo'sh joy bilan)
    /// sifat natijalari MANFIY bo'lib qayta tasniflanadi.
    ///
    /// <c>20261102000000_LabValueReferenceAndKind</c> dagi ifoda faqat
    /// "nonreact" ni manfiy deb tanirdi; chiziqchali yozuv keyingi
    /// "reactiv" shartiga tushib MUSBAT (flag 1) bo'lib qolardi — manfiy
    /// RW yoki OIV natijasi statistikada va INF qoidalarida musbat
    /// hisoblanardi. Python `lab_catalog.classify_qualitative` buni
    /// to'g'ri ajratadi; bu migratsiya allaqachon yozilgan qatorlarni tuzatadi.
    /// </summary>
    [DbContext(typeof(MedDataDB))]
    [Migration("20261104003000_LabFixNonReactiveKind")]
    public partial class LabFixNonReactiveKind : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                UPDATE lab_analysis_values v
                   SET result_kind = 'NEGATIVE',
                       flag = 0,
                       flag_source = 'lab'
                  FROM lab_value_types t
                 WHERE t.id = v.value_type_id
                   AND t.value_kind = 'qualitative'
                   AND v.result_kind = 'POSITIVE'
                   AND v.text ~* 'non[- ]reactiv';");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Ma'lumot tuzatish — qaytarilmaydi (xato holatni tiklash ma'nosiz)
        }
    }
}
