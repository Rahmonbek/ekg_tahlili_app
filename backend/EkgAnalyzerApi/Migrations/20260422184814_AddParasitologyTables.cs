using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <inheritdoc />
    public partial class AddParasitologyTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "parasitology_analyses",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    patcient_id = table.Column<int>(type: "integer", nullable: false),
                    clinic_id = table.Column<int>(type: "integer", nullable: true),
                    created_doctor_id = table.Column<int>(type: "integer", nullable: false),
                    file_path = table.Column<string>(type: "text", nullable: true),
                    microscopy_method = table.Column<string>(type: "text", nullable: true),
                    magnification = table.Column<string>(type: "text", nullable: true),
                    egg_count_per_field = table.Column<int>(type: "integer", nullable: true),
                    ai_response = table.Column<string>(type: "text", nullable: true),
                    analysis_status = table.Column<string>(type: "text", nullable: false),
                    jiddiylik_darajasi = table.Column<int>(type: "integer", nullable: true),
                    lang = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_parasitology_analyses", x => x.id);
                    table.ForeignKey(
                        name: "FK_parasitology_analyses_clinics_clinic_id",
                        column: x => x.clinic_id,
                        principalTable: "clinics",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_parasitology_analyses_doctors_created_doctor_id",
                        column: x => x.created_doctor_id,
                        principalTable: "doctors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_parasitology_analyses_patcients_patcient_id",
                        column: x => x.patcient_id,
                        principalTable: "patcients",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "parasitology_analysis_doctors",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    parasitology_analysis_id = table.Column<int>(type: "integer", nullable: false),
                    doctor_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_parasitology_analysis_doctors", x => x.id);
                    table.ForeignKey(
                        name: "FK_parasitology_analysis_doctors_doctors_doctor_id",
                        column: x => x.doctor_id,
                        principalTable: "doctors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_parasitology_analysis_doctors_parasitology_analyses_parasit~",
                        column: x => x.parasitology_analysis_id,
                        principalTable: "parasitology_analyses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "parasitology_results",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    parasitology_analysis_id = table.Column<int>(type: "integer", nullable: false),
                    helminth_type = table.Column<string>(type: "text", nullable: true),
                    helminth_name_uz = table.Column<string>(type: "text", nullable: true),
                    helminth_name_ru = table.Column<string>(type: "text", nullable: true),
                    helminth_name_en = table.Column<string>(type: "text", nullable: true),
                    confidence = table.Column<decimal>(type: "numeric", nullable: true),
                    infection_level = table.Column<string>(type: "text", nullable: true),
                    viloyat = table.Column<string>(type: "text", nullable: true),
                    tuman = table.Column<string>(type: "text", nullable: true),
                    patient_age_group = table.Column<string>(type: "text", nullable: true),
                    patient_gender = table.Column<bool>(type: "boolean", nullable: false),
                    analysis_date = table.Column<DateOnly>(type: "date", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_parasitology_results", x => x.id);
                    table.ForeignKey(
                        name: "FK_parasitology_results_parasitology_analyses_parasitology_ana~",
                        column: x => x.parasitology_analysis_id,
                        principalTable: "parasitology_analyses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_parasitology_analyses_clinic_id",
                table: "parasitology_analyses",
                column: "clinic_id");

            migrationBuilder.CreateIndex(
                name: "IX_parasitology_analyses_created_doctor_id",
                table: "parasitology_analyses",
                column: "created_doctor_id");

            migrationBuilder.CreateIndex(
                name: "IX_parasitology_analyses_patcient_id",
                table: "parasitology_analyses",
                column: "patcient_id");

            migrationBuilder.CreateIndex(
                name: "IX_parasitology_analysis_doctors_doctor_id",
                table: "parasitology_analysis_doctors",
                column: "doctor_id");

            migrationBuilder.CreateIndex(
                name: "IX_parasitology_analysis_doctors_parasitology_analysis_id",
                table: "parasitology_analysis_doctors",
                column: "parasitology_analysis_id");

            migrationBuilder.CreateIndex(
                name: "IX_parasitology_results_parasitology_analysis_id",
                table: "parasitology_results",
                column: "parasitology_analysis_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "parasitology_analysis_doctors");

            migrationBuilder.DropTable(
                name: "parasitology_results");

            migrationBuilder.DropTable(
                name: "parasitology_analyses");
        }
    }
}
