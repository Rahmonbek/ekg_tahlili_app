using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <inheritdoc />
    public partial class ChangeDoctorPosition : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_doctor_position_doctors_doctor_id",
                table: "doctor_position");

            migrationBuilder.DropForeignKey(
                name: "FK_doctor_position_positions_position_id",
                table: "doctor_position");

            migrationBuilder.AlterColumn<int>(
                name: "position_id",
                table: "doctor_position",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "doctor_id",
                table: "doctor_position",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_doctor_position_doctors_doctor_id",
                table: "doctor_position",
                column: "doctor_id",
                principalTable: "doctors",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_doctor_position_positions_position_id",
                table: "doctor_position",
                column: "position_id",
                principalTable: "positions",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
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

            migrationBuilder.AlterColumn<int>(
                name: "position_id",
                table: "doctor_position",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<int>(
                name: "doctor_id",
                table: "doctor_position",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

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
        }
    }
}
