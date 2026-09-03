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
    /// Kompleks (ko'p tahlilli) AI xulosasi uchun ikkita jadval.
    ///
    /// Qo'lda yozilgan: EF snapshot eskirgan, `dotnet ef migrations add`
    /// allaqachon qo'llangan o'zgarishlarni qayta bajarishga urinardi —
    /// loyihadagi boshqa migratsiyalar ham shu sababdan qo'lda yozilgan
    /// (`20260904000000_AddAccountSyncMeta`).
    ///
    /// `[DbContext]`/`[Migration]` atributlari SHART — busiz
    /// `Database.Migrate()` migratsiyani jimgina o'tkazib yuboradi.
    /// </summary>
    [DbContext(typeof(MedDataDB))]
    [Migration("20260906000000_AddCombinedAnalyses")]
    public partial class AddCombinedAnalyses : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "combined_analyses",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    patient_id = table.Column<int>(type: "integer", nullable: false),
                    clinic_id = table.Column<int>(type: "integer", nullable: false),
                    created_doctor_id = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    mode = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false, defaultValue: "summary"),
                    ai_answer_data = table.Column<string>(type: "jsonb", nullable: true),
                    ai_lang = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: true),
                    model_used = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    input_tokens = table.Column<int>(type: "integer", nullable: true),
                    output_tokens = table.Column<int>(type: "integer", nullable: true),
                    source_fingerprint = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_combined_analyses", x => x.id);
                    table.ForeignKey(
                        name: "FK_combined_analyses_patients_patient_id",
                        column: x => x.patient_id,
                        principalTable: "patients",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_combined_analyses_doctors_created_doctor_id",
                        column: x => x.created_doctor_id,
                        principalTable: "doctors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "combined_analysis_items",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    combined_analysis_id = table.Column<int>(type: "integer", nullable: false),
                    analysis_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    analysis_id = table.Column<int>(type: "integer", nullable: false),
                    snapshot_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    snapshot_severity = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_combined_analysis_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_combined_analysis_items_combined_analyses_combined_analysi~",
                        column: x => x.combined_analysis_id,
                        principalTable: "combined_analyses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_combined_analyses_patient_id",
                table: "combined_analyses",
                column: "patient_id");

            migrationBuilder.CreateIndex(
                name: "IX_combined_analyses_source_fingerprint",
                table: "combined_analyses",
                column: "source_fingerprint");

            migrationBuilder.CreateIndex(
                name: "IX_combined_analyses_created_doctor_id",
                table: "combined_analyses",
                column: "created_doctor_id");

            migrationBuilder.CreateIndex(
                name: "IX_combined_analysis_items_analysis_type_analysis_id",
                table: "combined_analysis_items",
                columns: new[] { "analysis_type", "analysis_id" });

            // Bitta xulosada bitta tahlil ikki marta bo'lmasligi kafolati
            migrationBuilder.CreateIndex(
                name: "IX_combined_analysis_items_unique",
                table: "combined_analysis_items",
                columns: new[] { "combined_analysis_id", "analysis_type", "analysis_id" },
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "combined_analysis_items");
            migrationBuilder.DropTable(name: "combined_analyses");
        }
    }
}
