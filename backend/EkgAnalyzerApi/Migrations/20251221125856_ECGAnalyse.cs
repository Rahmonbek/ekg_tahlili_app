using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <inheritdoc />
    public partial class ECGAnalyse : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ecg_analyses",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    created_doctor_id = table.Column<int>(type: "integer", nullable: false),
                    patcient_id = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: true),
                    analyse_file_link = table.Column<string>(type: "text", nullable: true),
                    generated_file_link = table.Column<string>(type: "text", nullable: true),
                    ai_answer_data = table.Column<byte[]>(type: "bytea", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ecg_analyses", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "ecg_analyse_complaints",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ecg_analyse_id = table.Column<int>(type: "integer", nullable: false),
                    complaint_id = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ecg_analyse_complaints", x => x.id);
                    table.ForeignKey(
                        name: "FK_ecg_analyse_complaints_ecg_analyses_ecg_analyse_id",
                        column: x => x.ecg_analyse_id,
                        principalTable: "ecg_analyses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ecg_analyse_doctors",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ecg_analyse_id = table.Column<int>(type: "integer", nullable: false),
                    doctor_id = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ecg_analyse_doctors", x => x.id);
                    table.ForeignKey(
                        name: "FK_ecg_analyse_doctors_ecg_analyses_ecg_analyse_id",
                        column: x => x.ecg_analyse_id,
                        principalTable: "ecg_analyses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ecg_analyse_complaints_ecg_analyse_id",
                table: "ecg_analyse_complaints",
                column: "ecg_analyse_id");

            migrationBuilder.CreateIndex(
                name: "IX_ecg_analyse_doctors_ecg_analyse_id",
                table: "ecg_analyse_doctors",
                column: "ecg_analyse_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ecg_analyse_complaints");

            migrationBuilder.DropTable(
                name: "ecg_analyse_doctors");

            migrationBuilder.DropTable(
                name: "ecg_analyses");
        }
    }
}
