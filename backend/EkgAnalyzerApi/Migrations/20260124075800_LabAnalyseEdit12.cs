using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <inheritdoc />
    public partial class LabAnalyseEdit12 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "column_name",
                table: "lab_categories");

            migrationBuilder.DropColumn(
                name: "measure",
                table: "lab_categories");

            migrationBuilder.DropColumn(
                name: "normal_max_female",
                table: "lab_categories");

            migrationBuilder.DropColumn(
                name: "normal_max_male",
                table: "lab_categories");

            migrationBuilder.DropColumn(
                name: "normal_min_female",
                table: "lab_categories");

            migrationBuilder.DropColumn(
                name: "normal_min_male",
                table: "lab_categories");

            migrationBuilder.CreateTable(
                name: "lab_value_types",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name_uz = table.Column<string>(type: "text", nullable: true),
                    name_ru = table.Column<string>(type: "text", nullable: true),
                    name_en = table.Column<string>(type: "text", nullable: true),
                    measure = table.Column<string>(type: "text", nullable: true),
                    normal_min_male = table.Column<double>(type: "double precision", nullable: true),
                    normal_max_male = table.Column<double>(type: "double precision", nullable: true),
                    normal_min_female = table.Column<double>(type: "double precision", nullable: true),
                    normal_max_female = table.Column<double>(type: "double precision", nullable: true),
                    column_name = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_value_types", x => x.id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lab_value_types");

            migrationBuilder.AddColumn<string>(
                name: "column_name",
                table: "lab_categories",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "measure",
                table: "lab_categories",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "normal_max_female",
                table: "lab_categories",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "normal_max_male",
                table: "lab_categories",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "normal_min_female",
                table: "lab_categories",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "normal_min_male",
                table: "lab_categories",
                type: "double precision",
                nullable: true);
        }
    }
}
