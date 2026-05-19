using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <inheritdoc />
    public partial class SeparateConsultantInvitations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "linked_by_consultation_id",
                table: "clinic_consultants");

            migrationBuilder.AddColumn<int>(
                name: "linked_by_invitation_id",
                table: "clinic_consultants",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "consultant_invitations",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    clinic_id = table.Column<int>(type: "integer", nullable: false),
                    consultant_doctor_id = table.Column<int>(type: "integer", nullable: false),
                    invited_by_admin_id = table.Column<int>(type: "integer", nullable: false),
                    note = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    responded_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_consultant_invitations", x => x.id);
                    table.ForeignKey(
                        name: "FK_consultant_invitations_clinics_clinic_id",
                        column: x => x.clinic_id,
                        principalTable: "clinics",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_consultant_invitations_doctors_consultant_doctor_id",
                        column: x => x.consultant_doctor_id,
                        principalTable: "doctors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_consultant_invitations_users_invited_by_admin_id",
                        column: x => x.invited_by_admin_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_clinic_consultants_linked_by_invitation_id",
                table: "clinic_consultants",
                column: "linked_by_invitation_id");

            migrationBuilder.CreateIndex(
                name: "IX_consultant_invitations_clinic_id_consultant_doctor_id_status",
                table: "consultant_invitations",
                columns: new[] { "clinic_id", "consultant_doctor_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_consultant_invitations_consultant_doctor_id",
                table: "consultant_invitations",
                column: "consultant_doctor_id");

            migrationBuilder.CreateIndex(
                name: "IX_consultant_invitations_invited_by_admin_id",
                table: "consultant_invitations",
                column: "invited_by_admin_id");

            migrationBuilder.AddForeignKey(
                name: "FK_clinic_consultants_consultant_invitations_linked_by_invitat~",
                table: "clinic_consultants",
                column: "linked_by_invitation_id",
                principalTable: "consultant_invitations",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.Sql("""
                INSERT INTO clinic_consultants
                    (clinic_id, consultant_doctor_id, linked_at, linked_by_invitation_id, status, total_consultations, last_consultation_at)
                SELECT
                    c.clinic_id,
                    c.consultant_doctor_id,
                    MIN(c.created_at) AS linked_at,
                    NULL AS linked_by_invitation_id,
                    'active' AS status,
                    COUNT(*) FILTER (WHERE c.status IN ('accepted', 'scheduled', 'concluded')) AS total_consultations,
                    MAX(c.created_at) FILTER (WHERE c.status IN ('accepted', 'scheduled', 'concluded')) AS last_consultation_at
                FROM consultations c
                WHERE c.status IN ('accepted', 'scheduled', 'concluded')
                  AND NOT EXISTS (
                      SELECT 1
                      FROM clinic_consultants cc
                      WHERE cc.clinic_id = c.clinic_id
                        AND cc.consultant_doctor_id = c.consultant_doctor_id
                  )
                GROUP BY c.clinic_id, c.consultant_doctor_id;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_clinic_consultants_consultant_invitations_linked_by_invitat~",
                table: "clinic_consultants");

            migrationBuilder.DropTable(
                name: "consultant_invitations");

            migrationBuilder.DropIndex(
                name: "IX_clinic_consultants_linked_by_invitation_id",
                table: "clinic_consultants");

            migrationBuilder.DropColumn(
                name: "linked_by_invitation_id",
                table: "clinic_consultants");

            migrationBuilder.AddColumn<int>(
                name: "linked_by_consultation_id",
                table: "clinic_consultants",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }
    }
}
