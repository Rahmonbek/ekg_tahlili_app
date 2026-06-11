using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <inheritdoc />
    public partial class AddVideoConferenceLeaveTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "admin_left_at",
                table: "video_conferences",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "left_at",
                table: "video_conference_participants",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "admin_left_at",
                table: "video_conferences");

            migrationBuilder.DropColumn(
                name: "left_at",
                table: "video_conference_participants");
        }
    }
}
