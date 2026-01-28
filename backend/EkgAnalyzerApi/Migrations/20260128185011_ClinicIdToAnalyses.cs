using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <inheritdoc />
    public partial class ClinicIdToAnalyses : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "clinic_id",
                table: "medical_diagnoses",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "clinic_id",
                table: "lab_analyses",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "clinic_id",
                table: "ecg_analyses",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_medical_diagnoses_clinic_id",
                table: "medical_diagnoses",
                column: "clinic_id");

            migrationBuilder.CreateIndex(
                name: "IX_lab_analyses_clinic_id",
                table: "lab_analyses",
                column: "clinic_id");

            migrationBuilder.CreateIndex(
                name: "IX_ecg_analyses_clinic_id",
                table: "ecg_analyses",
                column: "clinic_id");

            migrationBuilder.AddForeignKey(
                name: "FK_ecg_analyses_clinics_clinic_id",
                table: "ecg_analyses",
                column: "clinic_id",
                principalTable: "clinics",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_lab_analyses_clinics_clinic_id",
                table: "lab_analyses",
                column: "clinic_id",
                principalTable: "clinics",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_medical_diagnoses_clinics_clinic_id",
                table: "medical_diagnoses",
                column: "clinic_id",
                principalTable: "clinics",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ecg_analyses_clinics_clinic_id",
                table: "ecg_analyses");

            migrationBuilder.DropForeignKey(
                name: "FK_lab_analyses_clinics_clinic_id",
                table: "lab_analyses");

            migrationBuilder.DropForeignKey(
                name: "FK_medical_diagnoses_clinics_clinic_id",
                table: "medical_diagnoses");

            migrationBuilder.DropIndex(
                name: "IX_medical_diagnoses_clinic_id",
                table: "medical_diagnoses");

            migrationBuilder.DropIndex(
                name: "IX_lab_analyses_clinic_id",
                table: "lab_analyses");

            migrationBuilder.DropIndex(
                name: "IX_ecg_analyses_clinic_id",
                table: "ecg_analyses");

            migrationBuilder.DropColumn(
                name: "clinic_id",
                table: "medical_diagnoses");

            migrationBuilder.DropColumn(
                name: "clinic_id",
                table: "lab_analyses");

            migrationBuilder.DropColumn(
                name: "clinic_id",
                table: "ecg_analyses");
        }
    }
}
