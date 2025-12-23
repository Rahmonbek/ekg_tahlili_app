using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <inheritdoc />
    public partial class updateECGAnalyses1 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_ecg_analyses_created_doctor_id",
                table: "ecg_analyses",
                column: "created_doctor_id");

            migrationBuilder.CreateIndex(
                name: "IX_ecg_analyses_patcient_id",
                table: "ecg_analyses",
                column: "patcient_id");

            migrationBuilder.AddForeignKey(
                name: "FK_ecg_analyses_doctors_created_doctor_id",
                table: "ecg_analyses",
                column: "created_doctor_id",
                principalTable: "doctors",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ecg_analyses_patcients_patcient_id",
                table: "ecg_analyses",
                column: "patcient_id",
                principalTable: "patcients",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ecg_analyses_doctors_created_doctor_id",
                table: "ecg_analyses");

            migrationBuilder.DropForeignKey(
                name: "FK_ecg_analyses_patcients_patcient_id",
                table: "ecg_analyses");

            migrationBuilder.DropIndex(
                name: "IX_ecg_analyses_created_doctor_id",
                table: "ecg_analyses");

            migrationBuilder.DropIndex(
                name: "IX_ecg_analyses_patcient_id",
                table: "ecg_analyses");
        }
    }
}
