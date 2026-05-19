using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <inheritdoc />
    public partial class AddLinkRequestColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS is_link_request boolean NOT NULL DEFAULT FALSE;");
            migrationBuilder.Sql(
                "ALTER TABLE consultations ALTER COLUMN patient_id DROP NOT NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "ALTER TABLE consultations DROP COLUMN IF EXISTS is_link_request;");
        }
    }
}
