using EkgAnalyzerApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <summary>
    /// `ai_answer_data` ni `text` dan `jsonb` ga o'tkazadi va jiddiylik
    /// darajasi bo'yicha indeks quradi (T-036).
    ///
    /// Muammo
    /// ------
    /// Jiddiylik bo'yicha filtrlash **sakkizta** `LIKE '%…%'` sharti
    /// bilan bajarilardi — chunki JSON matn sifatida saqlangani uchun
    /// bo'shliqlar va tirnoqlar oldindan ma'lum emas:
    ///
    ///     "automatic_analysis_bool": 1     "automatic_analysis_bool":1
    ///     "automatic_analysis_bool": "1"   "automatic_analysis_bool":"1"
    ///     …va har biri uchun `,` va `}` variantlari
    ///
    /// Bu naqsh **indekslanmaydi**: har bir filtr butun jadvalni
    /// skanerlaydi. Bundan tashqari u mo'rt — AI formatlashni ozgina
    /// o'zgartirsa (masalan `"…bool" : 1`, ikki nuqta oldida bo'shliq)
    /// filtr **jimgina** ishlamay qo'yadi: xato chiqmaydi, shunchaki
    /// natija bo'sh bo'ladi.
    ///
    /// Yechim
    /// ------
    /// 1. Ustun turi `jsonb` — baza endi yaroqsiz JSON ni qabul qilmaydi.
    /// 2. Hosila (generated) ustun `ai_severity` — `->>` operatori
    ///    `1` va `"1"` ni bir xil `'1'` matniga keltiradi, ya'ni sakkiz
    ///    shart bitta aniq taqqoslashga aylanadi.
    /// 3. Hosila ustunga B-tree indeks.
    ///
    /// Nima uchun GIN emas
    /// -------------------
    /// Rejada `gin (ai_answer_data jsonb_path_ops)` taklif qilingan. GIN
    /// "shu kalit shu qiymatga tengmi" degan **aniq** so'rov uchun
    /// B-tree dan sekinroq va sezilarli darajada kattaroq. GIN ning
    /// afzalligi ixtiyoriy kalitlar bo'yicha qidiruvda ko'rinadi —
    /// bu yerda esa doim bitta kalit so'raladi.
    /// </summary>
    [DbContext(typeof(MedDataDB))]
    [Migration("20260902000000_AiAnswerDataToJsonb")]
    public partial class AiAnswerDataToJsonb : Migration
    {
        private static readonly string[] Tables =
        {
            "ecg_analyses", "holter_analyses", "smad_analyses", "lab_analyses",
        };

        protected override void Up(MigrationBuilder migrationBuilder)
        {
            foreach (var table in Tables)
            {
                // Bo'sh satr yaroqli JSON emas. Ular `NULL` ga o'tkaziladi:
                // "AI hali javob bermadi" ma'nosini aynan `NULL` bildiradi.
                migrationBuilder.Sql($@"
                    UPDATE {table}
                    SET ai_answer_data = NULL
                    WHERE ai_answer_data IS NOT NULL
                      AND btrim(ai_answer_data) = '';");

                // Yaroqsiz JSON qolgan bo'lsa — uni yo'qotmaymiz, xato
                // obyektiga o'raymiz. Ma'lumotni jimgina o'chirish
                // migratsiyada eng yomon xulq bo'lardi.
                migrationBuilder.Sql($@"
                    UPDATE {table}
                    SET ai_answer_data = json_build_object(
                            'xato', 'yaroqsiz_json',
                            'xom_matn', ai_answer_data)::text
                    WHERE ai_answer_data IS NOT NULL
                      AND NOT (ai_answer_data::jsonb IS NOT NULL);");

                migrationBuilder.Sql($@"
                    ALTER TABLE {table}
                    ALTER COLUMN ai_answer_data TYPE jsonb
                    USING ai_answer_data::jsonb;");

                migrationBuilder.Sql($@"
                    ALTER TABLE {table}
                    ADD COLUMN ai_severity text
                    GENERATED ALWAYS AS (ai_answer_data ->> 'automatic_analysis_bool') STORED;");

                migrationBuilder.Sql($@"
                    CREATE INDEX ix_{table}_ai_severity
                    ON {table} (ai_severity);");
            }
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            foreach (var table in Tables)
            {
                migrationBuilder.Sql($"DROP INDEX IF EXISTS ix_{table}_ai_severity;");
                migrationBuilder.Sql($"ALTER TABLE {table} DROP COLUMN IF EXISTS ai_severity;");
                migrationBuilder.Sql($@"
                    ALTER TABLE {table}
                    ALTER COLUMN ai_answer_data TYPE text
                    USING ai_answer_data::text;");
            }
        }
    }
}
