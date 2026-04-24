using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <inheritdoc />
    public partial class AddAnalysisDiagnosis : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "analysis_diagnoses",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    analysis_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    analysis_id = table.Column<int>(type: "integer", nullable: false),
                    doctor_id = table.Column<int>(type: "integer", nullable: false),
                    diagnosis_text = table.Column<string>(type: "text", nullable: false),
                    clinic_id = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_analysis_diagnoses", x => x.id);
                    table.ForeignKey(
                        name: "FK_analysis_diagnoses_doctors_doctor_id",
                        column: x => x.doctor_id,
                        principalTable: "doctors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_analysis_diagnoses_analysis_type_analysis_id",
                table: "analysis_diagnoses",
                columns: new[] { "analysis_type", "analysis_id" });

            migrationBuilder.CreateIndex(
                name: "IX_analysis_diagnoses_doctor_id",
                table: "analysis_diagnoses",
                column: "doctor_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "analysis_diagnoses");
        }
    }
}
