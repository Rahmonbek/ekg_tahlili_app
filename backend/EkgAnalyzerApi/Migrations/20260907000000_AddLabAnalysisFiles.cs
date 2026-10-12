using System;
using EkgAnalyzerApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <summary>
    /// Laboratoriya tahliliga bir nechta fayl biriktirish (`lab_analysis_files`).
    ///
    /// Qo'lda yozilgan — sababi `20260906000000_AddCombinedAnalyses` da:
    /// EF snapshot eskirgan. `[DbContext]`/`[Migration]` atributlari SHART.
    ///
    /// Mavjud yozuvlarning yagona fayli ham shu jadvalga ko'chiriladi —
    /// shunda o'qish kodi bitta manbaga tayanadi (eski/yangi farqi yo'q).
    /// `lab_analyses.analyse_file_link` o'chirilmaydi: u birinchi fayl
    /// sifatida to'ldirilib turadi.
    /// </summary>
    [DbContext(typeof(MedDataDB))]
    [Migration("20260907000000_AddLabAnalysisFiles")]
    public partial class AddLabAnalysisFiles : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "lab_analysis_files",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    lab_analysis_id = table.Column<int>(type: "integer", nullable: false),
                    file_link = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    original_filename = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    file_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    position = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_analysis_files", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_analysis_files_lab_analyses_lab_analysis_id",
                        column: x => x.lab_analysis_id,
                        principalTable: "lab_analyses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_lab_analysis_files_lab_analysis_id",
                table: "lab_analysis_files",
                column: "lab_analysis_id");

            // Takroriy yuklash tekshiruvi xesh bo'yicha qidiradi (T-096)
            migrationBuilder.CreateIndex(
                name: "IX_lab_analysis_files_file_hash",
                table: "lab_analysis_files",
                column: "file_hash");

            // Mavjud tahlillarning yagona fayli — birinchi (position = 0) fayl
            migrationBuilder.Sql(@"
                INSERT INTO lab_analysis_files
                       (lab_analysis_id, file_link, original_filename, file_hash, position, created_at)
                SELECT id, analyse_file_link, original_filename, file_hash, 0, created_at
                  FROM lab_analyses
                 WHERE analyse_file_link IS NOT NULL
                   AND analyse_file_link <> '';
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "lab_analysis_files");
        }
    }
}
