using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <inheritdoc />
    public partial class AddOnlineConsultationTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "average_rating",
                table: "doctors",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "experience_years",
                table: "doctors",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "total_ratings",
                table: "doctors",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "clinic_consultants",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    clinic_id = table.Column<int>(type: "integer", nullable: false),
                    consultant_doctor_id = table.Column<int>(type: "integer", nullable: false),
                    linked_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    linked_by_consultation_id = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    total_consultations = table.Column<int>(type: "integer", nullable: false),
                    last_consultation_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_clinic_consultants", x => x.id);
                    table.ForeignKey(
                        name: "FK_clinic_consultants_clinics_clinic_id",
                        column: x => x.clinic_id,
                        principalTable: "clinics",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_clinic_consultants_doctors_consultant_doctor_id",
                        column: x => x.consultant_doctor_id,
                        principalTable: "doctors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "consultations",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    clinic_id = table.Column<int>(type: "integer", nullable: false),
                    consultant_doctor_id = table.Column<int>(type: "integer", nullable: false),
                    clinic_consultant_id = table.Column<int>(type: "integer", nullable: true),
                    requested_by_admin_id = table.Column<int>(type: "integer", nullable: false),
                    patient_id = table.Column<int>(type: "integer", nullable: false),
                    is_first_request = table.Column<bool>(type: "boolean", nullable: false),
                    note = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    rejection_reason = table.Column<string>(type: "text", nullable: true),
                    scheduled_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    livekit_room_name = table.Column<string>(type: "text", nullable: true),
                    concluded_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_consultations", x => x.id);
                    table.ForeignKey(
                        name: "FK_consultations_clinic_consultants_clinic_consultant_id",
                        column: x => x.clinic_consultant_id,
                        principalTable: "clinic_consultants",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_consultations_clinics_clinic_id",
                        column: x => x.clinic_id,
                        principalTable: "clinics",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_consultations_doctors_consultant_doctor_id",
                        column: x => x.consultant_doctor_id,
                        principalTable: "doctors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_consultations_patcients_patient_id",
                        column: x => x.patient_id,
                        principalTable: "patcients",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_consultations_users_requested_by_admin_id",
                        column: x => x.requested_by_admin_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "consultant_ratings",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    consultant_doctor_id = table.Column<int>(type: "integer", nullable: false),
                    consultation_id = table.Column<int>(type: "integer", nullable: false),
                    clinic_id = table.Column<int>(type: "integer", nullable: false),
                    score = table.Column<int>(type: "integer", nullable: false),
                    comment = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_consultant_ratings", x => x.id);
                    table.ForeignKey(
                        name: "FK_consultant_ratings_clinics_clinic_id",
                        column: x => x.clinic_id,
                        principalTable: "clinics",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_consultant_ratings_consultations_consultation_id",
                        column: x => x.consultation_id,
                        principalTable: "consultations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_consultant_ratings_doctors_consultant_doctor_id",
                        column: x => x.consultant_doctor_id,
                        principalTable: "doctors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "consultation_analyses",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    consultation_id = table.Column<int>(type: "integer", nullable: false),
                    analysis_type = table.Column<string>(type: "text", nullable: false),
                    analysis_id = table.Column<int>(type: "integer", nullable: false),
                    shared_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_consultation_analyses", x => x.id);
                    table.ForeignKey(
                        name: "FK_consultation_analyses_consultations_consultation_id",
                        column: x => x.consultation_id,
                        principalTable: "consultations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "consultation_conclusions",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    consultation_id = table.Column<int>(type: "integer", nullable: false),
                    diagnosis = table.Column<string>(type: "text", nullable: false),
                    recommendations = table.Column<string>(type: "text", nullable: false),
                    medications = table.Column<string>(type: "text", nullable: true),
                    follow_up_required = table.Column<bool>(type: "boolean", nullable: false),
                    follow_up_note = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_consultation_conclusions", x => x.id);
                    table.ForeignKey(
                        name: "FK_consultation_conclusions_consultations_consultation_id",
                        column: x => x.consultation_id,
                        principalTable: "consultations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_clinic_consultants_clinic_id_consultant_doctor_id",
                table: "clinic_consultants",
                columns: new[] { "clinic_id", "consultant_doctor_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_clinic_consultants_consultant_doctor_id",
                table: "clinic_consultants",
                column: "consultant_doctor_id");

            migrationBuilder.CreateIndex(
                name: "IX_consultant_ratings_clinic_id",
                table: "consultant_ratings",
                column: "clinic_id");

            migrationBuilder.CreateIndex(
                name: "IX_consultant_ratings_consultant_doctor_id",
                table: "consultant_ratings",
                column: "consultant_doctor_id");

            migrationBuilder.CreateIndex(
                name: "IX_consultant_ratings_consultation_id",
                table: "consultant_ratings",
                column: "consultation_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_consultation_analyses_consultation_id",
                table: "consultation_analyses",
                column: "consultation_id");

            migrationBuilder.CreateIndex(
                name: "IX_consultation_conclusions_consultation_id",
                table: "consultation_conclusions",
                column: "consultation_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_consultations_clinic_consultant_id",
                table: "consultations",
                column: "clinic_consultant_id");

            migrationBuilder.CreateIndex(
                name: "IX_consultations_clinic_id",
                table: "consultations",
                column: "clinic_id");

            migrationBuilder.CreateIndex(
                name: "IX_consultations_consultant_doctor_id",
                table: "consultations",
                column: "consultant_doctor_id");

            migrationBuilder.CreateIndex(
                name: "IX_consultations_patient_id",
                table: "consultations",
                column: "patient_id");

            migrationBuilder.CreateIndex(
                name: "IX_consultations_requested_by_admin_id",
                table: "consultations",
                column: "requested_by_admin_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "consultant_ratings");

            migrationBuilder.DropTable(
                name: "consultation_analyses");

            migrationBuilder.DropTable(
                name: "consultation_conclusions");

            migrationBuilder.DropTable(
                name: "consultations");

            migrationBuilder.DropTable(
                name: "clinic_consultants");

            migrationBuilder.DropColumn(
                name: "average_rating",
                table: "doctors");

            migrationBuilder.DropColumn(
                name: "experience_years",
                table: "doctors");

            migrationBuilder.DropColumn(
                name: "total_ratings",
                table: "doctors");
        }
    }
}
