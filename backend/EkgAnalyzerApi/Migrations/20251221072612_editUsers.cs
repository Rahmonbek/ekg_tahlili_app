using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <inheritdoc />
    public partial class editUsers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_users_clinics_clinic_id",
                table: "users");

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
                name: "FK_users_clinics_clinic_id",
                table: "users");

            migrationBuilder.AddForeignKey(
                name: "FK_users_clinics_clinic_id",
                table: "users",
                column: "clinic_id",
                principalTable: "clinics",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
