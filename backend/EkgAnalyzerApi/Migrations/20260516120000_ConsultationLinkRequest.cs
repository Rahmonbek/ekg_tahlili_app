using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <inheritdoc />
    public partial class ConsultationLinkRequest : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "ALTER TABLE consultations ALTER COLUMN patient_id DROP NOT NULL;");

            migrationBuilder.Sql(
                "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS is_link_request boolean NOT NULL DEFAULT FALSE;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "ALTER TABLE consultations DROP COLUMN IF EXISTS is_link_request;");

            migrationBuilder.AlterColumn<int>(
                name: "patient_id",
                table: "consultations",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);
        }
    }
}
