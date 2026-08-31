using EkgAnalyzerApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    [DbContext(typeof(MedDataDB))]
    [Migration("20260831030000_AddAiLanguage")]
    /// <summary>
    /// Sun'iy intellekt xulosasi qaysi tilda yaratilganini saqlaydi (T-059).
    ///
    /// Tahlil yaratilayotganda "AI tahlil tilini tanlang" maydoni bor va
    /// tanlangan til promptga uzatiladi — javob o'sha tilda saqlanadi.
    /// Lekin til <b>hech qayerda qayd etilmasdi</b>.
    ///
    /// Oqibati: hamshira tahlilni o'zbek tilida yaratsa, keyin rus tilli
    /// kardiolog uni ochganda interfeys rus tilida bo'lsa ham AI matni
    /// o'zbekcha chiqadi va buning sababi tushunarsiz qoladi — shifokor
    /// tarjima buzilgan deb o'ylaydi.
    ///
    /// Ustun bo'sh bo'lishi mumkin: migratsiyadan oldingi yozuvlarda til
    /// ma'lum emas va uni taxmin qilish noto'g'ri bo'lardi.
    /// </summary>
    public partial class AddAiLanguage : Migration
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
                    $"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS ai_lang varchar(5) NULL;");
            }
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            foreach (var table in Tables)
            {
                migrationBuilder.Sql($"ALTER TABLE {table} DROP COLUMN IF EXISTS ai_lang;");
            }
        }
    }
}
