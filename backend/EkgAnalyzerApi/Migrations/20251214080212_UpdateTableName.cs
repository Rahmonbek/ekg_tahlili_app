using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <inheritdoc />
    public partial class UpdateTableName : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_varification_codes_clinics_ClinicId",
                table: "varification_codes");

            migrationBuilder.DropIndex(
                name: "IX_varification_codes_ClinicId",
                table: "varification_codes");

            migrationBuilder.DropColumn(
                name: "ClinicId",
                table: "varification_codes");

            migrationBuilder.DropColumn(
                name: "clinic_id",
                table: "patients");

            migrationBuilder.AddColumn<bool>(
                name: "gender",
                table: "patients",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "phone",
                table: "patients",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "ClinicId",
                table: "clinic_phone_numbers",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_users_clinic_id",
                table: "users",
                column: "clinic_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_clinic_phone_numbers_ClinicId",
                table: "clinic_phone_numbers",
                column: "ClinicId");

            migrationBuilder.CreateIndex(
                name: "IX_clinic_details_clinic_id",
                table: "clinic_details",
                column: "clinic_id",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_clinic_details_clinics_clinic_id",
                table: "clinic_details",
                column: "clinic_id",
                principalTable: "clinics",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_clinic_phone_numbers_clinics_ClinicId",
                table: "clinic_phone_numbers",
                column: "ClinicId",
                principalTable: "clinics",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_users_clinics_clinic_id",
                table: "users",
                column: "clinic_id",
                principalTable: "clinics",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_clinic_details_clinics_clinic_id",
                table: "clinic_details");

            migrationBuilder.DropForeignKey(
                name: "FK_clinic_phone_numbers_clinics_ClinicId",
                table: "clinic_phone_numbers");

            migrationBuilder.DropForeignKey(
                name: "FK_users_clinics_clinic_id",
                table: "users");

            migrationBuilder.DropIndex(
                name: "IX_users_clinic_id",
                table: "users");

            migrationBuilder.DropIndex(
                name: "IX_clinic_phone_numbers_ClinicId",
                table: "clinic_phone_numbers");

            migrationBuilder.DropIndex(
                name: "IX_clinic_details_clinic_id",
                table: "clinic_details");

            migrationBuilder.DropColumn(
                name: "gender",
                table: "patients");

            migrationBuilder.DropColumn(
                name: "phone",
                table: "patients");

            migrationBuilder.DropColumn(
                name: "ClinicId",
                table: "clinic_phone_numbers");

            migrationBuilder.AddColumn<int>(
                name: "ClinicId",
                table: "varification_codes",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "clinic_id",
                table: "patients",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_varification_codes_ClinicId",
                table: "varification_codes",
                column: "ClinicId");

            migrationBuilder.AddForeignKey(
                name: "FK_varification_codes_clinics_ClinicId",
                table: "varification_codes",
                column: "ClinicId",
                principalTable: "clinics",
                principalColumn: "id");
        }
    }
}
