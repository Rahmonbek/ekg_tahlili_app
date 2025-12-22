using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <inheritdoc />
    public partial class updateECGAnalyses : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_ecg_analyse_doctors_doctor_id",
                table: "ecg_analyse_doctors",
                column: "doctor_id");

            migrationBuilder.CreateIndex(
                name: "IX_ecg_analyse_complaints_complaint_id",
                table: "ecg_analyse_complaints",
                column: "complaint_id");

            migrationBuilder.AddForeignKey(
                name: "FK_ecg_analyse_complaints_complaints_complaint_id",
                table: "ecg_analyse_complaints",
                column: "complaint_id",
                principalTable: "complaints",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ecg_analyse_doctors_doctors_doctor_id",
                table: "ecg_analyse_doctors",
                column: "doctor_id",
                principalTable: "doctors",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ecg_analyse_complaints_complaints_complaint_id",
                table: "ecg_analyse_complaints");

            migrationBuilder.DropForeignKey(
                name: "FK_ecg_analyse_doctors_doctors_doctor_id",
                table: "ecg_analyse_doctors");

            migrationBuilder.DropIndex(
                name: "IX_ecg_analyse_doctors_doctor_id",
                table: "ecg_analyse_doctors");

            migrationBuilder.DropIndex(
                name: "IX_ecg_analyse_complaints_complaint_id",
                table: "ecg_analyse_complaints");
        }
    }
}
