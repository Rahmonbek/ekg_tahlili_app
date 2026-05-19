using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <inheritdoc />
    public partial class AddConsultationV2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Clear dev data — schema of related tables is incompatible with old data
            migrationBuilder.Sql("DELETE FROM consultation_conclusions;");
            migrationBuilder.Sql("DELETE FROM consultations;");
            migrationBuilder.Sql("DELETE FROM clinic_consultants;");
            migrationBuilder.Sql("DELETE FROM consultant_invitations;");

            migrationBuilder.DropForeignKey(
                name: "FK_clinic_consultants_consultant_invitations_linked_by_invitat~",
                table: "clinic_consultants");

            migrationBuilder.DropForeignKey(
                name: "FK_clinic_consultants_doctors_consultant_doctor_id",
                table: "clinic_consultants");

            migrationBuilder.DropForeignKey(
                name: "FK_consultant_invitations_clinics_clinic_id",
                table: "consultant_invitations");

            migrationBuilder.DropForeignKey(
                name: "FK_consultant_invitations_doctors_consultant_doctor_id",
                table: "consultant_invitations");

            migrationBuilder.DropForeignKey(
                name: "FK_consultant_invitations_users_invited_by_admin_id",
                table: "consultant_invitations");

            migrationBuilder.DropForeignKey(
                name: "FK_consultations_clinic_consultants_clinic_consultant_id",
                table: "consultations");

            migrationBuilder.DropForeignKey(
                name: "FK_consultations_doctors_consultant_doctor_id",
                table: "consultations");

            migrationBuilder.DropForeignKey(
                name: "FK_consultations_users_requested_by_admin_id",
                table: "consultations");

            migrationBuilder.DropTable(
                name: "consultant_ratings");

            migrationBuilder.DropIndex(
                name: "IX_consultant_invitations_clinic_id_consultant_doctor_id_status",
                table: "consultant_invitations");

            migrationBuilder.DropIndex(
                name: "IX_consultant_invitations_consultant_doctor_id",
                table: "consultant_invitations");

            migrationBuilder.DropColumn(
                name: "concluded_at",
                table: "consultations");

            migrationBuilder.DropColumn(
                name: "is_first_request",
                table: "consultations");

            migrationBuilder.DropColumn(
                name: "is_link_request",
                table: "consultations");

            migrationBuilder.DropColumn(
                name: "note",
                table: "consultations");

            migrationBuilder.DropColumn(
                name: "scheduled_at",
                table: "consultations");

            migrationBuilder.DropColumn(
                name: "follow_up_note",
                table: "consultation_conclusions");

            migrationBuilder.DropColumn(
                name: "follow_up_required",
                table: "consultation_conclusions");

            migrationBuilder.DropColumn(
                name: "medications",
                table: "consultation_conclusions");

            migrationBuilder.DropColumn(
                name: "consultant_doctor_id",
                table: "consultant_invitations");

            migrationBuilder.DropColumn(
                name: "created_at",
                table: "consultant_invitations");

            migrationBuilder.DropColumn(
                name: "last_consultation_at",
                table: "clinic_consultants");

            migrationBuilder.RenameColumn(
                name: "requested_by_admin_id",
                table: "consultations",
                newName: "doctor_id");

            migrationBuilder.RenameColumn(
                name: "consultant_doctor_id",
                table: "consultations",
                newName: "created_by_admin_id");

            migrationBuilder.RenameIndex(
                name: "IX_consultations_requested_by_admin_id",
                table: "consultations",
                newName: "IX_consultations_doctor_id");

            migrationBuilder.RenameIndex(
                name: "IX_consultations_consultant_doctor_id",
                table: "consultations",
                newName: "IX_consultations_created_by_admin_id");

            migrationBuilder.RenameColumn(
                name: "recommendations",
                table: "consultation_conclusions",
                newName: "treatment");

            migrationBuilder.RenameColumn(
                name: "updated_at",
                table: "consultant_invitations",
                newName: "invited_at");

            migrationBuilder.RenameColumn(
                name: "invited_by_admin_id",
                table: "consultant_invitations",
                newName: "doctor_id");

            migrationBuilder.RenameIndex(
                name: "IX_consultant_invitations_invited_by_admin_id",
                table: "consultant_invitations",
                newName: "IX_consultant_invitations_doctor_id");

            migrationBuilder.RenameColumn(
                name: "linked_by_invitation_id",
                table: "clinic_consultants",
                newName: "invitation_id");

            migrationBuilder.RenameColumn(
                name: "consultant_doctor_id",
                table: "clinic_consultants",
                newName: "doctor_id");

            migrationBuilder.RenameIndex(
                name: "IX_clinic_consultants_linked_by_invitation_id",
                table: "clinic_consultants",
                newName: "IX_clinic_consultants_invitation_id");

            migrationBuilder.RenameIndex(
                name: "IX_clinic_consultants_consultant_doctor_id",
                table: "clinic_consultants",
                newName: "IX_clinic_consultants_doctor_id");

            migrationBuilder.RenameIndex(
                name: "IX_clinic_consultants_clinic_id_consultant_doctor_id",
                table: "clinic_consultants",
                newName: "IX_clinic_consultants_clinic_id_doctor_id");

            migrationBuilder.AlterColumn<int>(
                name: "patient_id",
                table: "consultations",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "clinic_consultant_id",
                table: "consultations",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "consultation_date",
                table: "consultations",
                type: "date",
                nullable: false,
                defaultValue: new DateOnly(1, 1, 1));

            migrationBuilder.AddColumn<decimal>(
                name: "price_at_creation",
                table: "consultations",
                type: "numeric(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "patient_condition",
                table: "consultation_conclusions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "updated_at",
                table: "consultation_conclusions",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<decimal>(
                name: "price_per_session",
                table: "consultant_invitations",
                type: "numeric(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "current_price",
                table: "clinic_consultants",
                type: "numeric(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateTable(
                name: "consultant_price_history",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    clinic_consultant_id = table.Column<int>(type: "integer", nullable: false),
                    old_price = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    new_price = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    effective_from = table.Column<DateOnly>(type: "date", nullable: false),
                    changed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    changed_by_user_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_consultant_price_history", x => x.id);
                    table.ForeignKey(
                        name: "FK_consultant_price_history_clinic_consultants_clinic_consulta~",
                        column: x => x.clinic_consultant_id,
                        principalTable: "clinic_consultants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_consultant_price_history_users_changed_by_user_id",
                        column: x => x.changed_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_consultant_invitations_clinic_id_doctor_id",
                table: "consultant_invitations",
                columns: new[] { "clinic_id", "doctor_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_consultant_price_history_changed_by_user_id",
                table: "consultant_price_history",
                column: "changed_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_consultant_price_history_clinic_consultant_id",
                table: "consultant_price_history",
                column: "clinic_consultant_id");

            migrationBuilder.AddForeignKey(
                name: "FK_clinic_consultants_consultant_invitations_invitation_id",
                table: "clinic_consultants",
                column: "invitation_id",
                principalTable: "consultant_invitations",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_clinic_consultants_doctors_doctor_id",
                table: "clinic_consultants",
                column: "doctor_id",
                principalTable: "doctors",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_consultant_invitations_clinics_clinic_id",
                table: "consultant_invitations",
                column: "clinic_id",
                principalTable: "clinics",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_consultant_invitations_doctors_doctor_id",
                table: "consultant_invitations",
                column: "doctor_id",
                principalTable: "doctors",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_consultations_clinic_consultants_clinic_consultant_id",
                table: "consultations",
                column: "clinic_consultant_id",
                principalTable: "clinic_consultants",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_consultations_doctors_doctor_id",
                table: "consultations",
                column: "doctor_id",
                principalTable: "doctors",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_consultations_users_created_by_admin_id",
                table: "consultations",
                column: "created_by_admin_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_clinic_consultants_consultant_invitations_invitation_id",
                table: "clinic_consultants");

            migrationBuilder.DropForeignKey(
                name: "FK_clinic_consultants_doctors_doctor_id",
                table: "clinic_consultants");

            migrationBuilder.DropForeignKey(
                name: "FK_consultant_invitations_clinics_clinic_id",
                table: "consultant_invitations");

            migrationBuilder.DropForeignKey(
                name: "FK_consultant_invitations_doctors_doctor_id",
                table: "consultant_invitations");

            migrationBuilder.DropForeignKey(
                name: "FK_consultations_clinic_consultants_clinic_consultant_id",
                table: "consultations");

            migrationBuilder.DropForeignKey(
                name: "FK_consultations_doctors_doctor_id",
                table: "consultations");

            migrationBuilder.DropForeignKey(
                name: "FK_consultations_users_created_by_admin_id",
                table: "consultations");

            migrationBuilder.DropTable(
                name: "consultant_price_history");

            migrationBuilder.DropIndex(
                name: "IX_consultant_invitations_clinic_id_doctor_id",
                table: "consultant_invitations");

            migrationBuilder.DropColumn(
                name: "consultation_date",
                table: "consultations");

            migrationBuilder.DropColumn(
                name: "price_at_creation",
                table: "consultations");

            migrationBuilder.DropColumn(
                name: "patient_condition",
                table: "consultation_conclusions");

            migrationBuilder.DropColumn(
                name: "updated_at",
                table: "consultation_conclusions");

            migrationBuilder.DropColumn(
                name: "price_per_session",
                table: "consultant_invitations");

            migrationBuilder.DropColumn(
                name: "current_price",
                table: "clinic_consultants");

            migrationBuilder.RenameColumn(
                name: "doctor_id",
                table: "consultations",
                newName: "requested_by_admin_id");

            migrationBuilder.RenameColumn(
                name: "created_by_admin_id",
                table: "consultations",
                newName: "consultant_doctor_id");

            migrationBuilder.RenameIndex(
                name: "IX_consultations_doctor_id",
                table: "consultations",
                newName: "IX_consultations_requested_by_admin_id");

            migrationBuilder.RenameIndex(
                name: "IX_consultations_created_by_admin_id",
                table: "consultations",
                newName: "IX_consultations_consultant_doctor_id");

            migrationBuilder.RenameColumn(
                name: "treatment",
                table: "consultation_conclusions",
                newName: "recommendations");

            migrationBuilder.RenameColumn(
                name: "invited_at",
                table: "consultant_invitations",
                newName: "updated_at");

            migrationBuilder.RenameColumn(
                name: "doctor_id",
                table: "consultant_invitations",
                newName: "invited_by_admin_id");

            migrationBuilder.RenameIndex(
                name: "IX_consultant_invitations_doctor_id",
                table: "consultant_invitations",
                newName: "IX_consultant_invitations_invited_by_admin_id");

            migrationBuilder.RenameColumn(
                name: "invitation_id",
                table: "clinic_consultants",
                newName: "linked_by_invitation_id");

            migrationBuilder.RenameColumn(
                name: "doctor_id",
                table: "clinic_consultants",
                newName: "consultant_doctor_id");

            migrationBuilder.RenameIndex(
                name: "IX_clinic_consultants_invitation_id",
                table: "clinic_consultants",
                newName: "IX_clinic_consultants_linked_by_invitation_id");

            migrationBuilder.RenameIndex(
                name: "IX_clinic_consultants_doctor_id",
                table: "clinic_consultants",
                newName: "IX_clinic_consultants_consultant_doctor_id");

            migrationBuilder.RenameIndex(
                name: "IX_clinic_consultants_clinic_id_doctor_id",
                table: "clinic_consultants",
                newName: "IX_clinic_consultants_clinic_id_consultant_doctor_id");

            migrationBuilder.AlterColumn<int>(
                name: "patient_id",
                table: "consultations",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<int>(
                name: "clinic_consultant_id",
                table: "consultations",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<DateTime>(
                name: "concluded_at",
                table: "consultations",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_first_request",
                table: "consultations",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "is_link_request",
                table: "consultations",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "note",
                table: "consultations",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "scheduled_at",
                table: "consultations",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "follow_up_note",
                table: "consultation_conclusions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "follow_up_required",
                table: "consultation_conclusions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "medications",
                table: "consultation_conclusions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "consultant_doctor_id",
                table: "consultant_invitations",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "created_at",
                table: "consultant_invitations",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<DateTime>(
                name: "last_consultation_at",
                table: "clinic_consultants",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "consultant_ratings",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    clinic_id = table.Column<int>(type: "integer", nullable: false),
                    consultant_doctor_id = table.Column<int>(type: "integer", nullable: false),
                    consultation_id = table.Column<int>(type: "integer", nullable: false),
                    comment = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    score = table.Column<int>(type: "integer", nullable: false)
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

            migrationBuilder.CreateIndex(
                name: "IX_consultant_invitations_clinic_id_consultant_doctor_id_status",
                table: "consultant_invitations",
                columns: new[] { "clinic_id", "consultant_doctor_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_consultant_invitations_consultant_doctor_id",
                table: "consultant_invitations",
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

            migrationBuilder.AddForeignKey(
                name: "FK_clinic_consultants_consultant_invitations_linked_by_invitat~",
                table: "clinic_consultants",
                column: "linked_by_invitation_id",
                principalTable: "consultant_invitations",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_clinic_consultants_doctors_consultant_doctor_id",
                table: "clinic_consultants",
                column: "consultant_doctor_id",
                principalTable: "doctors",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_consultant_invitations_clinics_clinic_id",
                table: "consultant_invitations",
                column: "clinic_id",
                principalTable: "clinics",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_consultant_invitations_doctors_consultant_doctor_id",
                table: "consultant_invitations",
                column: "consultant_doctor_id",
                principalTable: "doctors",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_consultant_invitations_users_invited_by_admin_id",
                table: "consultant_invitations",
                column: "invited_by_admin_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_consultations_clinic_consultants_clinic_consultant_id",
                table: "consultations",
                column: "clinic_consultant_id",
                principalTable: "clinic_consultants",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_consultations_doctors_consultant_doctor_id",
                table: "consultations",
                column: "consultant_doctor_id",
                principalTable: "doctors",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_consultations_users_requested_by_admin_id",
                table: "consultations",
                column: "requested_by_admin_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
