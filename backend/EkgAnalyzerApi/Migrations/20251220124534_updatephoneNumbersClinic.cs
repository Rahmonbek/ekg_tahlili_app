using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <inheritdoc />
    public partial class updatephoneNumbersClinic : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_clinic_phone_numbers_clinics_ClinicId",
                table: "clinic_phone_numbers");

            migrationBuilder.RenameColumn(
                name: "ClinicId",
                table: "clinic_phone_numbers",
                newName: "clinic_id");

            migrationBuilder.RenameIndex(
                name: "IX_clinic_phone_numbers_ClinicId",
                table: "clinic_phone_numbers",
                newName: "IX_clinic_phone_numbers_clinic_id");

            migrationBuilder.AlterColumn<int>(
                name: "role_id",
                table: "users",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "clinic_id",
                table: "clinic_phone_numbers",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_users_role_id",
                table: "users",
                column: "role_id");

            migrationBuilder.AddForeignKey(
                name: "FK_clinic_phone_numbers_clinics_clinic_id",
                table: "clinic_phone_numbers",
                column: "clinic_id",
                principalTable: "clinics",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_users_roles_role_id",
                table: "users",
                column: "role_id",
                principalTable: "roles",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_clinic_phone_numbers_clinics_clinic_id",
                table: "clinic_phone_numbers");

            migrationBuilder.DropForeignKey(
                name: "FK_users_roles_role_id",
                table: "users");

            migrationBuilder.DropIndex(
                name: "IX_users_role_id",
                table: "users");

            migrationBuilder.RenameColumn(
                name: "clinic_id",
                table: "clinic_phone_numbers",
                newName: "ClinicId");

            migrationBuilder.RenameIndex(
                name: "IX_clinic_phone_numbers_clinic_id",
                table: "clinic_phone_numbers",
                newName: "IX_clinic_phone_numbers_ClinicId");

            migrationBuilder.AlterColumn<int>(
                name: "role_id",
                table: "users",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<int>(
                name: "ClinicId",
                table: "clinic_phone_numbers",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddForeignKey(
                name: "FK_clinic_phone_numbers_clinics_ClinicId",
                table: "clinic_phone_numbers",
                column: "ClinicId",
                principalTable: "clinics",
                principalColumn: "id");
        }
    }
}
