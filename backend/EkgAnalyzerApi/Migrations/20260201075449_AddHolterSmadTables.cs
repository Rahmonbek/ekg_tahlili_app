using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <inheritdoc />
    public partial class AddHolterSmadTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "holter_analyses",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    clinic_id = table.Column<int>(type: "integer", nullable: true),
                    created_doctor_id = table.Column<int>(type: "integer", nullable: false),
                    patcient_id = table.Column<int>(type: "integer", nullable: false),
                    main_doctor_id = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: true),
                    analyse_file_link = table.Column<string>(type: "text", nullable: true),
                    ai_answer_data = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_holter_analyses", x => x.id);
                    table.ForeignKey(
                        name: "FK_holter_analyses_clinics_clinic_id",
                        column: x => x.clinic_id,
                        principalTable: "clinics",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_holter_analyses_doctors_created_doctor_id",
                        column: x => x.created_doctor_id,
                        principalTable: "doctors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_holter_analyses_doctors_main_doctor_id",
                        column: x => x.main_doctor_id,
                        principalTable: "doctors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_holter_analyses_patcients_patcient_id",
                        column: x => x.patcient_id,
                        principalTable: "patcients",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "smad_analyses",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    clinic_id = table.Column<int>(type: "integer", nullable: true),
                    created_doctor_id = table.Column<int>(type: "integer", nullable: false),
                    patcient_id = table.Column<int>(type: "integer", nullable: false),
                    main_doctor_id = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: true),
                    analyse_file_link = table.Column<string>(type: "text", nullable: true),
                    ai_answer_data = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_smad_analyses", x => x.id);
                    table.ForeignKey(
                        name: "FK_smad_analyses_clinics_clinic_id",
                        column: x => x.clinic_id,
                        principalTable: "clinics",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_smad_analyses_doctors_created_doctor_id",
                        column: x => x.created_doctor_id,
                        principalTable: "doctors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_smad_analyses_doctors_main_doctor_id",
                        column: x => x.main_doctor_id,
                        principalTable: "doctors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_smad_analyses_patcients_patcient_id",
                        column: x => x.patcient_id,
                        principalTable: "patcients",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_holter_analyses_clinic_id",
                table: "holter_analyses",
                column: "clinic_id");

            migrationBuilder.CreateIndex(
                name: "IX_holter_analyses_created_doctor_id",
                table: "holter_analyses",
                column: "created_doctor_id");

            migrationBuilder.CreateIndex(
                name: "IX_holter_analyses_main_doctor_id",
                table: "holter_analyses",
                column: "main_doctor_id");

            migrationBuilder.CreateIndex(
                name: "IX_holter_analyses_patcient_id",
                table: "holter_analyses",
                column: "patcient_id");

            migrationBuilder.CreateIndex(
                name: "IX_smad_analyses_clinic_id",
                table: "smad_analyses",
                column: "clinic_id");

            migrationBuilder.CreateIndex(
                name: "IX_smad_analyses_created_doctor_id",
                table: "smad_analyses",
                column: "created_doctor_id");

            migrationBuilder.CreateIndex(
                name: "IX_smad_analyses_main_doctor_id",
                table: "smad_analyses",
                column: "main_doctor_id");

            migrationBuilder.CreateIndex(
                name: "IX_smad_analyses_patcient_id",
                table: "smad_analyses",
                column: "patcient_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "holter_analyses");

            migrationBuilder.DropTable(
                name: "smad_analyses");
        }
    }
}
