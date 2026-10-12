using EkgAnalyzerApi.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <summary>
    /// Kompleks AI xulosasi qanday yaratilganini belgilaydi: shifokor qo'lda
    /// tanlagan (`false`) yoki yangi tahlil tugaganda tizim avtomatik
    /// yaratgan (`true`, <c>AutoCombinedAnalysisWorker</c>).
    ///
    /// Qo'lda yozilgan — sababi `20260906000000_AddCombinedAnalyses` da.
    /// </summary>
    [DbContext(typeof(MedDataDB))]
    [Migration("20260908000000_AddCombinedIsAuto")]
    public partial class AddCombinedIsAuto : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_auto",
                table: "combined_analyses",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "is_auto", table: "combined_analyses");
        }
    }
}
