using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <inheritdoc />
    public partial class FixedAddAnalysisDate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "analysis_date",
                table: "smad_analyses",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "created_at",
                table: "parasitology_analysis_doctors",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_viewed",
                table: "parasitology_analysis_doctors",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "updated_at",
                table: "parasitology_analysis_doctors",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "analysis_date",
                table: "parasitology_analyses",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "analysis_date",
                table: "lab_analyses",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "analysis_date",
                table: "holter_analyses",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "analysis_date",
                table: "ecg_analyses",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "analysis_date",
                table: "smad_analyses");

            migrationBuilder.DropColumn(
                name: "created_at",
                table: "parasitology_analysis_doctors");

            migrationBuilder.DropColumn(
                name: "is_viewed",
                table: "parasitology_analysis_doctors");

            migrationBuilder.DropColumn(
                name: "updated_at",
                table: "parasitology_analysis_doctors");

            migrationBuilder.DropColumn(
                name: "analysis_date",
                table: "parasitology_analyses");

            migrationBuilder.DropColumn(
                name: "analysis_date",
                table: "lab_analyses");

            migrationBuilder.DropColumn(
                name: "analysis_date",
                table: "holter_analyses");

            migrationBuilder.DropColumn(
                name: "analysis_date",
                table: "ecg_analyses");
        }
    }
}
