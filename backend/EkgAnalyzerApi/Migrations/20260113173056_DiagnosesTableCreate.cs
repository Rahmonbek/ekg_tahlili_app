using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <inheritdoc />
    public partial class DiagnosesTableCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "medical_diagnoses",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    created_doctor_id = table.Column<int>(type: "integer", nullable: false),
                    main_doctor_id = table.Column<int>(type: "integer", nullable: false),
                    patcient_id = table.Column<int>(type: "integer", nullable: false),
                    diagnose_file_link = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_medical_diagnoses", x => x.id);
                    table.ForeignKey(
                        name: "FK_medical_diagnoses_doctors_created_doctor_id",
                        column: x => x.created_doctor_id,
                        principalTable: "doctors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_medical_diagnoses_doctors_main_doctor_id",
                        column: x => x.main_doctor_id,
                        principalTable: "doctors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_medical_diagnoses_patcients_patcient_id",
                        column: x => x.patcient_id,
                        principalTable: "patcients",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_medical_diagnoses_created_doctor_id",
                table: "medical_diagnoses",
                column: "created_doctor_id");

            migrationBuilder.CreateIndex(
                name: "IX_medical_diagnoses_main_doctor_id",
                table: "medical_diagnoses",
                column: "main_doctor_id");

            migrationBuilder.CreateIndex(
                name: "IX_medical_diagnoses_patcient_id",
                table: "medical_diagnoses",
                column: "patcient_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "medical_diagnoses");
        }
    }
}
