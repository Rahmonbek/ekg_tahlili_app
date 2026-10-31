using System;
using EkgAnalyzerApi.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <summary>
    /// Bemorning tug'ilgan sanasi va jinsi ixtiyoriy bo'ladi.
    ///
    /// Tahlil yuklash sahifalarida bemor endi passport + tug'ilgan sana
    /// bo'yicha emas, ism/familiya bo'yicha qidiriladi va yangi bemor uchun
    /// faqat ism va familiya majburiy (loyiha egasining qarori). Passport,
    /// telefon va otasining ismi NOT NULL qoladi — ular kiritilmasa bo'sh
    /// satr saqlanadi.
    ///
    /// Qo'lda yozilgan — sababi `20260906000000_AddCombinedAnalyses` da.
    /// </summary>
    [DbContext(typeof(MedDataDB))]
    [Migration("20261031000000_PatientOptionalBirthDateGender")]
    public partial class PatientOptionalBirthDateGender : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<DateOnly>(
                name: "birthdate",
                table: "patients",
                type: "date",
                nullable: true,
                oldClrType: typeof(DateOnly),
                oldType: "date");

            migrationBuilder.AlterColumn<bool>(
                name: "gender",
                table: "patients",
                type: "boolean",
                nullable: true,
                oldClrType: typeof(bool),
                oldType: "boolean");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Qaytarishda NULL qiymatlar NOT NULL ga sig'maydi — "noma'lum"
            // bemorlarga shartli qiymat yoziladi
            migrationBuilder.Sql("UPDATE patients SET birthdate = DATE '1900-01-01' WHERE birthdate IS NULL;");
            migrationBuilder.Sql("UPDATE patients SET gender = TRUE WHERE gender IS NULL;");

            migrationBuilder.AlterColumn<DateOnly>(
                name: "birthdate",
                table: "patients",
                type: "date",
                nullable: false,
                oldClrType: typeof(DateOnly),
                oldType: "date",
                oldNullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "gender",
                table: "patients",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldNullable: true);
        }
    }
}
