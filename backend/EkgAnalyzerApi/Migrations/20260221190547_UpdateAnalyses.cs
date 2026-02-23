using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <inheritdoc />
    public partial class UpdateAnalyses : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "holter_analyse_doctors",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    holter_analyse_id = table.Column<int>(type: "integer", nullable: false),
                    doctor_id = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_holter_analyse_doctors", x => x.id);
                    table.ForeignKey(
                        name: "FK_holter_analyse_doctors_doctors_doctor_id",
                        column: x => x.doctor_id,
                        principalTable: "doctors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_holter_analyse_doctors_holter_analyses_holter_analyse_id",
                        column: x => x.holter_analyse_id,
                        principalTable: "holter_analyses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "lab_analyse_doctors",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    lab_analyse_id = table.Column<int>(type: "integer", nullable: false),
                    doctor_id = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_analyse_doctors", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_analyse_doctors_doctors_doctor_id",
                        column: x => x.doctor_id,
                        principalTable: "doctors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_lab_analyse_doctors_lab_analyses_lab_analyse_id",
                        column: x => x.lab_analyse_id,
                        principalTable: "lab_analyses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "smad_analyse_doctors",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    smad_analyse_id = table.Column<int>(type: "integer", nullable: false),
                    doctor_id = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_smad_analyse_doctors", x => x.id);
                    table.ForeignKey(
                        name: "FK_smad_analyse_doctors_doctors_doctor_id",
                        column: x => x.doctor_id,
                        principalTable: "doctors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_smad_analyse_doctors_smad_analyses_smad_analyse_id",
                        column: x => x.smad_analyse_id,
                        principalTable: "smad_analyses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_holter_analyse_doctors_doctor_id",
                table: "holter_analyse_doctors",
                column: "doctor_id");

            migrationBuilder.CreateIndex(
                name: "IX_holter_analyse_doctors_holter_analyse_id",
                table: "holter_analyse_doctors",
                column: "holter_analyse_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_analyse_doctors_doctor_id",
                table: "lab_analyse_doctors",
                column: "doctor_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_analyse_doctors_lab_analyse_id",
                table: "lab_analyse_doctors",
                column: "lab_analyse_id");

            migrationBuilder.CreateIndex(
                name: "IX_smad_analyse_doctors_doctor_id",
                table: "smad_analyse_doctors",
                column: "doctor_id");

            migrationBuilder.CreateIndex(
                name: "IX_smad_analyse_doctors_smad_analyse_id",
                table: "smad_analyse_doctors",
                column: "smad_analyse_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "holter_analyse_doctors");

            migrationBuilder.DropTable(
                name: "lab_analyse_doctors");

            migrationBuilder.DropTable(
                name: "smad_analyse_doctors");
        }
    }
}
