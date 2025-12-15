using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <inheritdoc />
    public partial class AddforeignKeys : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_users_clinics_clinic_id",
                table: "users");

            migrationBuilder.DropIndex(
                name: "IX_users_clinic_id",
                table: "users");

            migrationBuilder.AddColumn<int>(
                name: "UserId1",
                table: "doctors",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_users_clinic_id",
                table: "users",
                column: "clinic_id");

            migrationBuilder.CreateIndex(
                name: "IX_doctors_user_id",
                table: "doctors",
                column: "user_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_doctors_UserId1",
                table: "doctors",
                column: "UserId1",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_doctor_position_doctor_id",
                table: "doctor_position",
                column: "doctor_id");

            migrationBuilder.CreateIndex(
                name: "IX_doctor_position_position_id",
                table: "doctor_position",
                column: "position_id");

            migrationBuilder.AddForeignKey(
                name: "FK_doctor_position_doctors_doctor_id",
                table: "doctor_position",
                column: "doctor_id",
                principalTable: "doctors",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_doctor_position_positions_position_id",
                table: "doctor_position",
                column: "position_id",
                principalTable: "positions",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_doctors_users_UserId1",
                table: "doctors",
                column: "UserId1",
                principalTable: "users",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_doctors_users_user_id",
                table: "doctors",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_users_clinics_clinic_id",
                table: "users",
                column: "clinic_id",
                principalTable: "clinics",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_doctor_position_doctors_doctor_id",
                table: "doctor_position");

            migrationBuilder.DropForeignKey(
                name: "FK_doctor_position_positions_position_id",
                table: "doctor_position");

            migrationBuilder.DropForeignKey(
                name: "FK_doctors_users_UserId1",
                table: "doctors");

            migrationBuilder.DropForeignKey(
                name: "FK_doctors_users_user_id",
                table: "doctors");

            migrationBuilder.DropForeignKey(
                name: "FK_users_clinics_clinic_id",
                table: "users");

            migrationBuilder.DropIndex(
                name: "IX_users_clinic_id",
                table: "users");

            migrationBuilder.DropIndex(
                name: "IX_doctors_user_id",
                table: "doctors");

            migrationBuilder.DropIndex(
                name: "IX_doctors_UserId1",
                table: "doctors");

            migrationBuilder.DropIndex(
                name: "IX_doctor_position_doctor_id",
                table: "doctor_position");

            migrationBuilder.DropIndex(
                name: "IX_doctor_position_position_id",
                table: "doctor_position");

            migrationBuilder.DropColumn(
                name: "UserId1",
                table: "doctors");

            migrationBuilder.CreateIndex(
                name: "IX_users_clinic_id",
                table: "users",
                column: "clinic_id",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_users_clinics_clinic_id",
                table: "users",
                column: "clinic_id",
                principalTable: "clinics",
                principalColumn: "id");
        }
    }
}
