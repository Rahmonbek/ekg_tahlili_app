using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <inheritdoc />
    public partial class ClinicAddress : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "district_id",
                table: "clinic_details",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_clinic_details_district_id",
                table: "clinic_details",
                column: "district_id");

            migrationBuilder.AddForeignKey(
                name: "FK_clinic_details_districts_district_id",
                table: "clinic_details",
                column: "district_id",
                principalTable: "districts",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_clinic_details_districts_district_id",
                table: "clinic_details");

            migrationBuilder.DropIndex(
                name: "IX_clinic_details_district_id",
                table: "clinic_details");

            migrationBuilder.DropColumn(
                name: "district_id",
                table: "clinic_details");
        }
    }
}
