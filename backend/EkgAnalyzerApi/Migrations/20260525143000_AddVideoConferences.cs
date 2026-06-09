using EkgAnalyzerApi.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    [DbContext(typeof(MedDataDB))]
    [Migration("20260525143000_AddVideoConferences")]
    public partial class AddVideoConferences : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "video_conferences",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    room_name = table.Column<string>(type: "text", nullable: false),
                    clinic_id = table.Column<int>(type: "integer", nullable: false),
                    patient_id = table.Column<int>(type: "integer", nullable: false),
                    created_by_admin_id = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ended_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_video_conferences", x => x.id);
                    table.ForeignKey(
                        name: "fk_video_conferences_clinics_clinic_id",
                        column: x => x.clinic_id,
                        principalTable: "clinics",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_video_conferences_patcients_patient_id",
                        column: x => x.patient_id,
                        principalTable: "patcients",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_video_conferences_users_created_by_admin_id",
                        column: x => x.created_by_admin_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "video_conference_participants",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    video_conference_id = table.Column<int>(type: "integer", nullable: false),
                    doctor_id = table.Column<int>(type: "integer", nullable: false),
                    invited_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    joined_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_video_conference_participants", x => x.id);
                    table.ForeignKey(
                        name: "fk_video_conference_participants_doctors_doctor_id",
                        column: x => x.doctor_id,
                        principalTable: "doctors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_video_conference_participants_video_conferences_video_conference_id",
                        column: x => x.video_conference_id,
                        principalTable: "video_conferences",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_video_conferences_clinic_id",
                table: "video_conferences",
                column: "clinic_id");

            migrationBuilder.CreateIndex(
                name: "ix_video_conferences_created_by_admin_id",
                table: "video_conferences",
                column: "created_by_admin_id");

            migrationBuilder.CreateIndex(
                name: "ix_video_conferences_patient_id",
                table: "video_conferences",
                column: "patient_id");

            migrationBuilder.CreateIndex(
                name: "ix_video_conferences_room_name",
                table: "video_conferences",
                column: "room_name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_video_conference_participants_doctor_id",
                table: "video_conference_participants",
                column: "doctor_id");

            migrationBuilder.CreateIndex(
                name: "ix_video_conference_participants_video_conference_id_doctor_id",
                table: "video_conference_participants",
                columns: new[] { "video_conference_id", "doctor_id" },
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "video_conference_participants");
            migrationBuilder.DropTable(name: "video_conferences");
        }
    }
}
