using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <inheritdoc />
    public partial class AddIsViewedToAnalyseDoctors : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_viewed",
                table: "smad_analyse_doctors",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "is_viewed",
                table: "medical_diagnoses",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "is_viewed",
                table: "lab_analyse_doctors",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "is_viewed",
                table: "holter_analyse_doctors",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "is_viewed",
                table: "ecg_analyse_doctors",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "is_viewed",
                table: "smad_analyse_doctors");

            migrationBuilder.DropColumn(
                name: "is_viewed",
                table: "medical_diagnoses");

            migrationBuilder.DropColumn(
                name: "is_viewed",
                table: "lab_analyse_doctors");

            migrationBuilder.DropColumn(
                name: "is_viewed",
                table: "holter_analyse_doctors");

            migrationBuilder.DropColumn(
                name: "is_viewed",
                table: "ecg_analyse_doctors");
        }
    }
}
