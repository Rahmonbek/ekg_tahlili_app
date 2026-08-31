using EkgAnalyzerApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    [DbContext(typeof(MedDataDB))]
    [Migration("20260831040000_AddAiTranslations")]
    /// <summary>
    /// AI xulosasining boshqa tillardagi tarjimalarini keshlaydi (T-059).
    ///
    /// Format — til kodi bo'yicha kalitlangan JSON:
    /// <code>
    /// {"ru": {"automatic_analysis": "...", ...},
    ///  "en": {"automatic_analysis": "...", ...}}
    /// </code>
    ///
    /// Nima uchun kesh: tarjima sun'iy intellekt chaqiruvini talab qiladi
    /// va u pullik hamda sekin. Bir marta tarjima qilingan xulosani har
    /// safar qayta so'rash ma'nosiz — matn o'zgarmaydi.
    ///
    /// Nima uchun alohida ustun, `ai_answer_data` ichida emas: asl javob
    /// tibbiy yozuvning bir qismi va unga tegmaslik kerak. Tarjima esa
    /// hosila ma'lumot — uni istalgan vaqtda o'chirib qayta yaratish
    /// mumkin.
    /// </summary>
    public partial class AddAiTranslations : Migration
    {
        private static readonly string[] Tables =
        {
            "ecg_analyses",
            "lab_analyses",
            "holter_analyses",
            "smad_analyses",
        };

        protected override void Up(MigrationBuilder migrationBuilder)
        {
            foreach (var table in Tables)
            {
                migrationBuilder.Sql(
                    $"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS ai_translations text NULL;");
            }
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            foreach (var table in Tables)
            {
                migrationBuilder.Sql($"ALTER TABLE {table} DROP COLUMN IF EXISTS ai_translations;");
            }
        }
    }
}
