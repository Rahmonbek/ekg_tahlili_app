using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <inheritdoc />
    public partial class LabAnalyseEdit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_lab_categories_lab_big_categories_BigCategoryId",
                table: "lab_categories");

            migrationBuilder.RenameColumn(
                name: "BigCategoryId",
                table: "lab_categories",
                newName: "big_category_id");

            migrationBuilder.RenameIndex(
                name: "IX_lab_categories_BigCategoryId",
                table: "lab_categories",
                newName: "IX_lab_categories_big_category_id");

            migrationBuilder.AddForeignKey(
                name: "FK_lab_categories_lab_big_categories_big_category_id",
                table: "lab_categories",
                column: "big_category_id",
                principalTable: "lab_big_categories",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_lab_categories_lab_big_categories_big_category_id",
                table: "lab_categories");

            migrationBuilder.RenameColumn(
                name: "big_category_id",
                table: "lab_categories",
                newName: "BigCategoryId");

            migrationBuilder.RenameIndex(
                name: "IX_lab_categories_big_category_id",
                table: "lab_categories",
                newName: "IX_lab_categories_BigCategoryId");

            migrationBuilder.AddForeignKey(
                name: "FK_lab_categories_lab_big_categories_BigCategoryId",
                table: "lab_categories",
                column: "BigCategoryId",
                principalTable: "lab_big_categories",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
