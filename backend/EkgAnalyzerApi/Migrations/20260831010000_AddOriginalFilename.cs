using EkgAnalyzerApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    [DbContext(typeof(MedDataDB))]
    [Migration("20260831010000_AddOriginalFilename")]
    /// <summary>
    /// Yuklangan faylning asl nomini alohida ustunga ko'chiradi (T-101).
    ///
    /// Nima uchun kerak: ilgari asl nom faylning o'zida saqlanardi va yo'lga
    /// tushardi. Bazadagi haqiqiy misollar:
    ///
    ///   /uploads/smad_analyse_files/битураев_б_смад.pdf
    ///   /uploads/lab_analyse_files/поверхностный_антиген_вируса_гепатита_в,_hbsag.pdf
    ///
    /// Birinchisi bemorning familiyasini, ikkinchisi qanday tahlil
    /// topshirilganini (gepatit B) yo'lning o'zida oshkor qiladi. Bunday yo'l
    /// server jurnaliga, brauzer tarixiga, proksi keshiga va "havolani
    /// nusxalash" orqali chatga tushadi.
    ///
    /// Ikkinchi muammo — taxmin qilinadigan nomlar: `ecg_92.png`, `ecg_95.png`.
    ///
    /// Endi diskdagi nom UUID, asl nom esa shu ustunda. Foydalanuvchi faylni
    /// yuklab olganda unga asl nom bilan beriladi, ya'ni qulaylik yo'qolmaydi.
    /// </summary>
    public partial class AddOriginalFilename : Migration
    {
        private static readonly string[] Tables =
        {
            "ecg_analyses",
            "lab_analyses",
            "holter_analyses",
            "smad_analyses",
            "medical_diagnoses",
        };

        protected override void Up(MigrationBuilder migrationBuilder)
        {
            foreach (var table in Tables)
            {
                migrationBuilder.Sql(
                    $"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS original_filename varchar(255) NULL;");
            }
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            foreach (var table in Tables)
            {
                migrationBuilder.Sql(
                    $"ALTER TABLE {table} DROP COLUMN IF EXISTS original_filename;");
            }
        }
    }
}
