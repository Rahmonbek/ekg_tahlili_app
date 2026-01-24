using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <inheritdoc />
    public partial class LabAnalyse : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "name_uz",
                table: "complaints",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "name_ru",
                table: "complaints",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "name_en",
                table: "complaints",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.CreateTable(
                name: "lab_analyses",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    created_doctor_id = table.Column<int>(type: "integer", nullable: false),
                    patcient_id = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: true),
                    analyse_file_link = table.Column<string>(type: "text", nullable: true),
                    ai_answer_data = table.Column<string>(type: "text", nullable: true),
                    hb = table.Column<decimal>(type: "numeric", nullable: true),
                    rbc = table.Column<decimal>(type: "numeric", nullable: true),
                    wbc = table.Column<decimal>(type: "numeric", nullable: true),
                    plt = table.Column<decimal>(type: "numeric", nullable: true),
                    hct = table.Column<decimal>(type: "numeric", nullable: true),
                    mcv = table.Column<decimal>(type: "numeric", nullable: true),
                    mch = table.Column<decimal>(type: "numeric", nullable: true),
                    mchc = table.Column<decimal>(type: "numeric", nullable: true),
                    esr = table.Column<decimal>(type: "numeric", nullable: true),
                    glucose = table.Column<decimal>(type: "numeric", nullable: true),
                    cholesterol = table.Column<decimal>(type: "numeric", nullable: true),
                    alt = table.Column<decimal>(type: "numeric", nullable: true),
                    ast = table.Column<decimal>(type: "numeric", nullable: true),
                    bilirubin_total = table.Column<decimal>(type: "numeric", nullable: true),
                    bilirubin_direct = table.Column<decimal>(type: "numeric", nullable: true),
                    creatinine = table.Column<decimal>(type: "numeric", nullable: true),
                    urea = table.Column<decimal>(type: "numeric", nullable: true),
                    total_protein = table.Column<decimal>(type: "numeric", nullable: true),
                    albumin = table.Column<decimal>(type: "numeric", nullable: true),
                    calcium = table.Column<decimal>(type: "numeric", nullable: true),
                    sodium = table.Column<decimal>(type: "numeric", nullable: true),
                    potassium = table.Column<decimal>(type: "numeric", nullable: true),
                    iron = table.Column<decimal>(type: "numeric", nullable: true),
                    tsh = table.Column<decimal>(type: "numeric", nullable: true),
                    free_t4 = table.Column<decimal>(type: "numeric", nullable: true),
                    insulin = table.Column<decimal>(type: "numeric", nullable: true),
                    urine_volume = table.Column<decimal>(type: "numeric", nullable: true),
                    urine_density = table.Column<decimal>(type: "numeric", nullable: true),
                    urine_ph = table.Column<decimal>(type: "numeric", nullable: true),
                    urine_protein = table.Column<decimal>(type: "numeric", nullable: true),
                    urine_glucose = table.Column<decimal>(type: "numeric", nullable: true),
                    urine_ketones = table.Column<decimal>(type: "numeric", nullable: true),
                    urine_bilirubin = table.Column<decimal>(type: "numeric", nullable: true),
                    urobilinogen = table.Column<decimal>(type: "numeric", nullable: true),
                    urine_rbc = table.Column<int>(type: "integer", nullable: true),
                    urine_wbc = table.Column<int>(type: "integer", nullable: true),
                    daily_protein = table.Column<decimal>(type: "numeric", nullable: true),
                    daily_creatinine = table.Column<decimal>(type: "numeric", nullable: true),
                    daily_calcium = table.Column<decimal>(type: "numeric", nullable: true),
                    daily_sodium = table.Column<decimal>(type: "numeric", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_analyses", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_analyses_doctors_created_doctor_id",
                        column: x => x.created_doctor_id,
                        principalTable: "doctors",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_lab_analyses_patcients_patcient_id",
                        column: x => x.patcient_id,
                        principalTable: "patcients",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "lab_big_categories",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name_uz = table.Column<string>(type: "text", nullable: true),
                    name_ru = table.Column<string>(type: "text", nullable: true),
                    name_en = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_big_categories", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lab_categories",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    BigCategoryId = table.Column<int>(type: "integer", nullable: false),
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
                    table.PrimaryKey("PK_lab_categories", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_categories_lab_big_categories_BigCategoryId",
                        column: x => x.BigCategoryId,
                        principalTable: "lab_big_categories",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "lab_analyse_categories",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    lab_analyse_id = table.Column<int>(type: "integer", nullable: false),
                    category_id = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lab_analyse_categories", x => x.id);
                    table.ForeignKey(
                        name: "FK_lab_analyse_categories_lab_analyses_lab_analyse_id",
                        column: x => x.lab_analyse_id,
                        principalTable: "lab_analyses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_lab_analyse_categories_lab_categories_category_id",
                        column: x => x.category_id,
                        principalTable: "lab_categories",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_lab_analyse_categories_category_id",
                table: "lab_analyse_categories",
                column: "category_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_analyse_categories_lab_analyse_id",
                table: "lab_analyse_categories",
                column: "lab_analyse_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_analyses_created_doctor_id",
                table: "lab_analyses",
                column: "created_doctor_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_analyses_patcient_id",
                table: "lab_analyses",
                column: "patcient_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_categories_BigCategoryId",
                table: "lab_categories",
                column: "BigCategoryId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lab_analyse_categories");

            migrationBuilder.DropTable(
                name: "lab_analyses");

            migrationBuilder.DropTable(
                name: "lab_categories");

            migrationBuilder.DropTable(
                name: "lab_big_categories");

            migrationBuilder.AlterColumn<string>(
                name: "name_uz",
                table: "complaints",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "name_ru",
                table: "complaints",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "name_en",
                table: "complaints",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);
        }
    }
}
