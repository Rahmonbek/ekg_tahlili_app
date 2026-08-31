using EkgAnalyzerApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <summary>
    /// `lab_value_types` jadvalidagi referens chegaralarini to'ldiradi (T-035).
    ///
    /// Muammo: jadvalda `normal_min_male`, `normal_max_male`,
    /// `normal_min_female`, `normal_max_female` ustunlari **bor edi, lekin
    /// 40 tadan 40 tasi bo'sh** edi. Ya'ni tizim laboratoriya qiymatini
    /// saqlardi, lekin uning normada yoki normadan tashqarida ekanini
    /// ayta olmasdi — shifokor har bir raqamni o'zi eslab solishtirishi
    /// kerak edi.
    ///
    /// Qiymatlar — kattalar uchun keng qabul qilingan referens
    /// diapazonlari. Ular **boshlang'ich nuqta**: har bir laboratoriya
    /// o'z uskunasi va usuliga qarab chegaralarni biroz boshqacha
    /// belgilaydi, shuning uchun bu qatorlar `UPDATE` bilan
    /// o'zgartirilishi mo'ljallangan va migratsiya faqat **bo'sh**
    /// qiymatlarni to'ldiradi (`WHERE normal_min_male IS NULL`).
    ///
    /// Jinsga bog'liq farq bor ko'rsatkichlar: `hb`, `rbc`, `hct`,
    /// `esr`, `creatinine`, `iron`, `daily_creatinine`. Qolganlarida
    /// erkak va ayol chegaralari bir xil.
    ///
    /// Chegarasi qo'yilmaganlar (ataylab): `urine_volume` (sutkalik hajm
    /// suv iste'moliga bog'liq), `urine_ketones`, `urine_bilirubin`,
    /// `urine_glucose`, `urine_protein` — bular normada **umuman
    /// bo'lmasligi** kerak va "0 dan 0 gacha" diapazon foydasiz signal
    /// bergan bo'lardi.
    /// </summary>
    [DbContext(typeof(MedDataDB))]
    [Migration("20260901000000_SeedLabReferenceRanges")]
    public partial class SeedLabReferenceRanges : Migration
    {
        /// <summary>column_name, erkak min/max, ayol min/max</summary>
        private static readonly (string Column, double? MinM, double? MaxM, double? MinF, double? MaxF)[] Ranges =
        {
            // ── Umumiy qon tahlili ──────────────────────────────────
            ("hb",                130,   170,   120,   150),   // g/L
            ("rbc",               4.3,   5.7,   3.9,   5.0),   // ×10¹²/L
            ("wbc",               4.0,   9.0,   4.0,   9.0),   // ×10⁹/L
            ("plt",               180,   400,   180,   400),   // ×10⁹/L
            ("hct",               39,    50,    35,    45),    // %
            ("mcv",               80,    100,   80,    100),   // fL
            ("mch",               27,    34,    27,    34),    // pg
            ("mchc",              320,   360,   320,   360),   // g/L
            ("esr",               1,     15,    2,     20),    // mm/soat

            // ── Biokimyo ────────────────────────────────────────────
            ("glucose",           3.9,   5.6,   3.9,   5.6),   // mmol/L
            ("cholesterol",       null,  5.2,   null,  5.2),   // mmol/L
            ("alt",               null,  41,    null,  33),    // U/L
            ("ast",               null,  40,    null,  32),    // U/L
            ("bilirubin_total",   3.4,   20.5,  3.4,   20.5),  // µmol/L
            ("bilirubin_direct",  null,  5.1,   null,  5.1),   // µmol/L
            ("creatinine",        62,    106,   44,    80),    // µmol/L
            ("urea",              2.5,   7.5,   2.5,   7.5),   // mmol/L
            ("total_protein",     64,    83,    64,    83),    // g/L
            ("albumin",           35,    52,    35,    52),    // g/L
            ("calcium",           2.15,  2.55,  2.15,  2.55),  // mmol/L
            ("sodium",            136,   145,   136,   145),   // mmol/L
            ("potassium",         3.5,   5.1,   3.5,   5.1),   // mmol/L
            ("iron",              11.6,  31.3,  9.0,   30.4),  // µmol/L

            // ── Gormonlar ───────────────────────────────────────────
            ("tsh",               0.4,   4.0,   0.4,   4.0),   // µIU/mL
            ("free_t4",           9.0,   22.0,  9.0,   22.0),  // pmol/L
            ("insulin",           2.6,   24.9,  2.6,   24.9),  // µIU/mL

            // ── Peshob ──────────────────────────────────────────────
            ("urine_density",     1.010, 1.030, 1.010, 1.030),
            ("urine_ph",          5.0,   7.0,   5.0,   7.0),
            ("urobilinogen",      null,  17,    null,  17),    // µmol/L
            ("urine_rbc",         null,  2,     null,  3),     // ko'rish maydonida
            ("urine_wbc",         null,  3,     null,  5),

            // ── Sutkalik peshob ─────────────────────────────────────
            ("daily_protein",     null,  150,   null,  150),   // mg/24 soat
            ("daily_creatinine",  8.8,   17.7,  7.1,   15.9),  // mmol/24 soat
            ("daily_calcium",     2.5,   7.5,   2.5,   6.2),   // mmol/24 soat
            ("daily_sodium",      130,   260,   130,   260),   // mmol/24 soat
        };

        protected override void Up(MigrationBuilder migrationBuilder)
        {
            foreach (var (column, minM, maxM, minF, maxF) in Ranges)
            {
                // Faqat hali to'ldirilmagan qatorlar: klinika o'z
                // chegaralarini kiritgan bo'lsa, ular saqlanib qoladi.
                migrationBuilder.Sql($@"
                    UPDATE lab_value_types
                    SET normal_min_male   = {Sql(minM)},
                        normal_max_male   = {Sql(maxM)},
                        normal_min_female = {Sql(minF)},
                        normal_max_female = {Sql(maxF)}
                    WHERE column_name = '{column}'
                      AND normal_min_male IS NULL
                      AND normal_max_male IS NULL
                      AND normal_min_female IS NULL
                      AND normal_max_female IS NULL;");
            }
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Faqat shu migratsiya qo'ygan qiymatlarni qaytarish mumkin
            // emas (klinika keyin o'zgartirgan bo'lishi mumkin), shuning
            // uchun hech narsa qilinmaydi. Bu ma'lumot to'ldirish
            // migratsiyasi — sxemani o'zgartirmaydi.
        }

        private static string Sql(double? value) =>
            value.HasValue
                ? value.Value.ToString(System.Globalization.CultureInfo.InvariantCulture)
                : "NULL";
    }
}
