using EkgAnalyzerApi.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <summary>
    /// Kompleks AI xulosasi tarjimalari keshi (`ai_translations`) — boshqa
    /// tahlil jadvallaridagi bilan bir xil (`20260831040000_AddAiTranslations`).
    /// Ustun faqat Python tarjima endpointi tomonidan o'qiladi/yoziladi,
    /// shuning uchun EF modeliga qo'shilmaydi.
    /// </summary>
    [DbContext(typeof(MedDataDB))]
    [Migration("20260909000000_AddCombinedAiTranslations")]
    public partial class AddCombinedAiTranslations : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "ALTER TABLE combined_analyses ADD COLUMN IF NOT EXISTS ai_translations text NULL;");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE combined_analyses DROP COLUMN IF EXISTS ai_translations;");
        }
    }
}
