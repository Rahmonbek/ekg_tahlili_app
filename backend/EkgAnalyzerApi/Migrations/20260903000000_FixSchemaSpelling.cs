using EkgAnalyzerApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <summary>
    /// Baza sxemasidagi imlo xatolarini tuzatadi (T-068).
    ///
    /// | Edi | Bo'ldi |
    /// |---|---|
    /// | `varification_codes` (jadval) | `verification_codes` |
    /// | `patcients` (jadval) | `patients` |
    /// | `patcient_id` (6 jadvalda) | `patient_id` |
    /// | `clinic_details.bank_accaunt` | `bank_account` |
    /// | `doctors.surename`, `patients.surename` | `sure_name` |
    ///
    /// Nima uchun faqat baza nomlari
    /// ------------------------------
    /// Taskda uch qatlamni birdaniga o'zgartirish taklif qilingan
    /// (`Patcient.cs` → `Patient.cs`, API maydonlari, frontend). Bu
    /// **buzuvchi o'zgarish**: JSON javob maydonlari C# xossa
    /// nomlaridan olinadi, ya'ni `patcientId` → `patientId` tashqi
    /// integratorlarning kodini to'xtatadi. Bunday qaror loyiha
    /// egasiniki.
    ///
    /// Shu sababli taskning **4-bandi** tanlandi (u yerda "kam xavfli
    /// yondashuv" deb atalgan), lekin teskari yo'nalishda: baza nomlari
    /// **tuzatildi**, C# xossa nomlari esa `[Column]` atributlari
    /// orqali eski holicha qoldi. Natijada:
    ///
    /// * baza sxemasi toza — yangi dasturchi `verification_codes` deb
    ///   yozib xato olmaydi;
    /// * API shartnomasi **umuman o'zgarmaydi**;
    /// * C# nomlarini keyinroq, alohida va rejalashtirilgan holda
    ///   o'zgartirish mumkin.
    ///
    /// `RenameColumn` chet el kalitlari, indekslar va cheklovlarni
    /// avtomatik ko'chiradi — PostgreSQL `ALTER TABLE ... RENAME`
    /// buni sxema darajasida bajaradi.
    /// </summary>
    [DbContext(typeof(MedDataDB))]
    [Migration("20260903000000_FixSchemaSpelling")]
    public partial class FixSchemaSpelling : Migration
    {
        private static readonly string[] AnalysisTables =
        {
            "ecg_analyses", "holter_analyses", "smad_analyses",
            "lab_analyses", "medical_diagnoses", "parasitology_analyses",
        };

        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "ALTER TABLE IF EXISTS varification_codes RENAME TO verification_codes;");
            migrationBuilder.Sql(
                "ALTER TABLE IF EXISTS patcients RENAME TO patients;");

            foreach (var table in AnalysisTables)
            {
                migrationBuilder.Sql(
                    $"ALTER TABLE IF EXISTS {table} RENAME COLUMN patcient_id TO patient_id;");
            }

            migrationBuilder.Sql(
                "ALTER TABLE IF EXISTS clinic_details RENAME COLUMN bank_accaunt TO bank_account;");
            migrationBuilder.Sql(
                "ALTER TABLE IF EXISTS doctors RENAME COLUMN surename TO sure_name;");
            migrationBuilder.Sql(
                "ALTER TABLE IF EXISTS patients RENAME COLUMN surename TO sure_name;");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "ALTER TABLE IF EXISTS patients RENAME COLUMN sure_name TO surename;");
            migrationBuilder.Sql(
                "ALTER TABLE IF EXISTS doctors RENAME COLUMN sure_name TO surename;");
            migrationBuilder.Sql(
                "ALTER TABLE IF EXISTS clinic_details RENAME COLUMN bank_account TO bank_accaunt;");

            foreach (var table in AnalysisTables)
            {
                migrationBuilder.Sql(
                    $"ALTER TABLE IF EXISTS {table} RENAME COLUMN patient_id TO patcient_id;");
            }

            migrationBuilder.Sql(
                "ALTER TABLE IF EXISTS patients RENAME TO patcients;");
            migrationBuilder.Sql(
                "ALTER TABLE IF EXISTS verification_codes RENAME TO varification_codes;");
        }
    }
}
