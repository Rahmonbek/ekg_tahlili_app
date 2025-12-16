using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <inheritdoc />
    public partial class editUserEmail : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "role_name_uz",
                table: "roles",
                newName: "name_uz");

            migrationBuilder.RenameColumn(
                name: "role_name_ru",
                table: "roles",
                newName: "name_ru");

            migrationBuilder.RenameColumn(
                name: "role_name_en",
                table: "roles",
                newName: "name_en");

            migrationBuilder.AlterColumn<string>(
                name: "email",
                table: "users",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "name_uz",
                table: "roles",
                newName: "role_name_uz");

            migrationBuilder.RenameColumn(
                name: "name_ru",
                table: "roles",
                newName: "role_name_ru");

            migrationBuilder.RenameColumn(
                name: "name_en",
                table: "roles",
                newName: "role_name_en");

            migrationBuilder.AlterColumn<string>(
                name: "email",
                table: "users",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);
        }
    }
}
