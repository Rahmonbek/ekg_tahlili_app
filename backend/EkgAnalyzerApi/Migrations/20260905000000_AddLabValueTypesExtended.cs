using EkgAnalyzerApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <summary>
    /// Laboratoriya tahlilida aniqlanishi mumkin bo'lgan qo'shimcha
    /// ko'rsatkichlar (kalit so'zlar) qo'shadi — lipid paneli, koagulyatsiya
    /// (gemostaz), qon formulasi (leykotsitar), qalqonsimon bez, vitaminlar,
    /// fermentlar va boshqalar. Jami 47 ta yangi ustun.
    ///
    /// Ikki qism:
    ///  1. `lab_analyses` jadvaliga har bir ko'rsatkich uchun `numeric`
    ///     ustun qo'shiladi (AI aniqlagan qiymat shu ustunga yoziladi —
    ///     dinamika grafigi shu ustunlarni o'qiydi).
    ///  2. `lab_value_types` jadvaliga metama'lumot qatori qo'shiladi
    ///     (nomlar, o'lchov birligi, erkak/ayol norma chegaralari).
    ///     Frontend ko'rsatkichlarni AYNAN shu jadvaldan o'qiydi
    ///     (data-driven), shuning uchun qatorlar qo'shilishi bilanoq ular
    ///     natija sahifasida va dinamikada ko'rina boshlaydi.
    ///
    /// Idempotent: ustun `ADD COLUMN IF NOT EXISTS` bilan, qator esa
    /// `WHERE NOT EXISTS` bilan qo'shiladi — mavjudlari TAKRORLANMAYDI.
    /// Chegaralar kattalar uchun keng qabul qilingan boshlang'ich
    /// qiymatlar; klinika ularni keyin `UPDATE` bilan moslashtirishi mumkin.
    /// </summary>
    [DbContext(typeof(MedDataDB))]
    [Migration("20260905000000_AddLabValueTypesExtended")]
    public partial class AddLabValueTypesExtended : Migration
    {
        /// <summary>column_name, uz, ru, en, o'lchov, erkak min/max, ayol min/max</summary>
        private static readonly (string Col, string Uz, string Ru, string En, string Unit,
            double? MinM, double? MaxM, double? MinF, double? MaxF)[] Rows =
        {
            // ── Lipid paneli ──
            ("triglycerides", "Triglitseridlar", "Триглицериды", "Triglycerides", "mmol/L", null, 1.7, null, 1.7),
            ("hdl", "HDL xolesterin (yuqori zichlik)", "ЛПВП (HDL) холестерин", "HDL cholesterol", "mmol/L", 1.0, null, 1.2, null),
            ("ldl", "LDL xolesterin (past zichlik)", "ЛПНП (LDL) холестерин", "LDL cholesterol", "mmol/L", null, 3.0, null, 3.0),
            ("vldl", "VLDL xolesterin (juda past zichlik)", "ЛПОНП (VLDL) холестерин", "VLDL cholesterol", "mmol/L", 0.1, 1.0, 0.1, 1.0),
            ("atherogenic_index", "Aterogenlik koeffitsienti", "Коэффициент атерогенности", "Atherogenic index", null, null, 3.0, null, 3.0),
            // ── Uglevod almashinuvi ──
            ("hba1c", "Glikirlangan gemoglobin (HbA1c)", "Гликированный гемоглобин (HbA1c)", "Glycated hemoglobin (HbA1c)", "%", 4.0, 5.6, 4.0, 5.6),
            ("c_peptide", "S-peptid", "С-пептид", "C-peptide", "ng/mL", 1.1, 4.4, 1.1, 4.4),
            // ── Yallig'lanish ──
            ("crp", "C-reaktiv oqsil (CRP)", "С-реактивный белок (СРБ)", "C-reactive protein (CRP)", "mg/L", null, 5.0, null, 5.0),
            // ── Fermentlar ──
            ("ggt", "Gamma-glutamiltransferaza (GGT)", "Гамма-ГТ (ГГТ)", "Gamma-GT (GGT)", "U/L", null, 55.0, null, 38.0),
            ("alp", "Ishqoriy fosfataza (ALP)", "Щелочная фосфатаза", "Alkaline phosphatase (ALP)", "U/L", 40.0, 130.0, 40.0, 130.0),
            ("amylase", "Amilaza", "Амилаза", "Amylase", "U/L", 28.0, 100.0, 28.0, 100.0),
            ("lipase", "Lipaza", "Липаза", "Lipase", "U/L", 13.0, 60.0, 13.0, 60.0),
            ("ldh", "Laktatdegidrogenaza (LDH)", "Лактатдегидрогеназа (ЛДГ)", "Lactate dehydrogenase (LDH)", "U/L", 125.0, 220.0, 125.0, 220.0),
            ("ck", "Kreatinkinaza (KFK)", "Креатинкиназа (КФК)", "Creatine kinase (CK)", "U/L", 39.0, 308.0, 26.0, 192.0),
            ("ck_mb", "Kreatinkinaza-MB (KFK-MB)", "КФК-МВ", "CK-MB", "U/L", null, 25.0, null, 25.0),
            // ── Buyrak / elektrolit / almashinuv ──
            ("uric_acid", "Siydik kislotasi", "Мочевая кислота", "Uric acid", "µmol/L", 202.0, 416.0, 142.0, 339.0),
            ("magnesium", "Magniy", "Магний", "Magnesium", "mmol/L", 0.66, 1.07, 0.66, 1.07),
            ("phosphorus", "Fosfor", "Фосфор", "Phosphorus", "mmol/L", 0.81, 1.45, 0.81, 1.45),
            ("chloride", "Xlor", "Хлор", "Chloride", "mmol/L", 98.0, 107.0, 98.0, 107.0),
            // ── Temir almashinuvi ──
            ("ferritin", "Ferritin", "Ферритин", "Ferritin", "µg/L", 30.0, 400.0, 13.0, 150.0),
            ("tibc", "Umumiy temir bog'lash qobiliyati (TIBC)", "ОЖСС (TIBC)", "Total iron-binding capacity", "µmol/L", 45.0, 72.0, 45.0, 72.0),
            ("transferrin", "Transferrin", "Трансферрин", "Transferrin", "g/L", 2.0, 3.6, 2.0, 3.6),
            // ── Bilirubin / oqsil ──
            ("bilirubin_indirect", "To'g'ri bo'lmagan bilirubin", "Непрямой билирубин", "Indirect bilirubin", "µmol/L", null, 17.0, null, 17.0),
            ("globulin", "Globulinlar", "Глобулины", "Globulins", "g/L", 20.0, 35.0, 20.0, 35.0),
            // ── Qalqonsimon bez ──
            ("free_t3", "Erkin T3 (FT3)", "Свободный T3 (FT3)", "Free T3 (FT3)", "pmol/L", 3.1, 6.8, 3.1, 6.8),
            ("t3_total", "Umumiy T3", "Общий T3", "Total T3", "nmol/L", 1.3, 3.1, 1.3, 3.1),
            ("t4_total", "Umumiy T4", "Общий T4", "Total T4", "nmol/L", 66.0, 181.0, 66.0, 181.0),
            // ── Vitaminlar ──
            ("vitamin_d", "Vitamin D (25-OH)", "Витамин D (25-OH)", "Vitamin D (25-OH)", "ng/mL", 30.0, 100.0, 30.0, 100.0),
            ("vitamin_b12", "Vitamin B12", "Витамин B12", "Vitamin B12", "pg/mL", 187.0, 883.0, 187.0, 883.0),
            ("folate", "Foliy kislotasi", "Фолиевая кислота", "Folate", "ng/mL", 3.1, 20.5, 3.1, 20.5),
            // ── Koagulyatsiya (gemostaz) ──
            ("prothrombin_time", "Protrombin vaqti (PV)", "Протромбиновое время (ПВ)", "Prothrombin time (PT)", "sekund", 11.0, 14.0, 11.0, 14.0),
            ("prothrombin_index", "Protrombin indeksi (PTI)", "Протромбиновый индекс (ПТИ)", "Prothrombin index", "%", 70.0, 130.0, 70.0, 130.0),
            ("inr", "Xalqaro normallashgan nisbat (INR)", "МНО (INR)", "INR", null, 0.8, 1.2, 0.8, 1.2),
            ("aptt", "Faollashgan qisman tromboplastin vaqti (aPTT)", "АЧТВ (aPTT)", "aPTT", "sekund", 25.0, 35.0, 25.0, 35.0),
            ("fibrinogen", "Fibrinogen", "Фибриноген", "Fibrinogen", "g/L", 2.0, 4.0, 2.0, 4.0),
            ("thrombin_time", "Trombin vaqti", "Тромбиновое время", "Thrombin time", "sekund", 14.0, 21.0, 14.0, 21.0),
            ("d_dimer", "D-dimer", "D-димер", "D-dimer", "mg/L", null, 0.5, null, 0.5),
            // ── Qon formulasi (leykotsitar) ──
            ("neutrophils", "Neytrofillar", "Нейтрофилы", "Neutrophils", "%", 40.0, 70.0, 40.0, 70.0),
            ("lymphocytes", "Limfotsitlar", "Лимфоциты", "Lymphocytes", "%", 20.0, 40.0, 20.0, 40.0),
            ("monocytes", "Monotsitlar", "Моноциты", "Monocytes", "%", 2.0, 10.0, 2.0, 10.0),
            ("eosinophils", "Eozinofillar", "Эозинофилы", "Eosinophils", "%", 1.0, 6.0, 1.0, 6.0),
            ("basophils", "Bazofillar", "Базофилы", "Basophils", "%", 0.0, 1.0, 0.0, 1.0),
            // ── Qizil qon / trombotsit indekslari ──
            ("rdw", "Eritrositlar taqsimlanish kengligi (RDW)", "RDW (ширина распред. эритроцитов)", "RDW", "%", 11.5, 14.5, 11.5, 14.5),
            ("mpv", "O'rtacha trombotsit hajmi (MPV)", "MPV (средний объём тромбоцитов)", "MPV", "fL", 7.5, 11.5, 7.5, 11.5),
            ("pdw", "Trombotsitlar taqsimlanish kengligi (PDW)", "PDW (ширина распред. тромбоцитов)", "PDW", "%", 10.0, 18.0, 10.0, 18.0),
            ("pct", "Trombokrit (PCT)", "Тромбокрит (PCT)", "Plateletcrit (PCT)", "%", 0.15, 0.4, 0.15, 0.4),
            ("reticulocytes", "Retikulotsitlar", "Ретикулоциты", "Reticulocytes", "%", 0.5, 2.5, 0.5, 2.5),
        };

        protected override void Up(MigrationBuilder migrationBuilder)
        {
            foreach (var r in Rows)
            {
                // 1) Ustun — mavjud bo'lmasa qo'shiladi (idempotent)
                migrationBuilder.Sql(
                    $"ALTER TABLE lab_analyses ADD COLUMN IF NOT EXISTS {r.Col} numeric;");

                // 2) Metama'lumot qatori — column_name bo'yicha mavjud
                //    bo'lmasa qo'shiladi (TAKRORLANMAYDI)
                migrationBuilder.Sql($@"
                    INSERT INTO lab_value_types
                        (name_uz, name_ru, name_en, measure,
                         normal_min_male, normal_max_male,
                         normal_min_female, normal_max_female,
                         column_name, created_at, updated_at)
                    SELECT {S(r.Uz)}, {S(r.Ru)}, {S(r.En)}, {S(r.Unit)},
                           {D(r.MinM)}, {D(r.MaxM)}, {D(r.MinF)}, {D(r.MaxF)},
                           {S(r.Col)}, NOW(), NOW()
                    WHERE NOT EXISTS (
                        SELECT 1 FROM lab_value_types WHERE column_name = {S(r.Col)}
                    );");
            }
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            foreach (var r in Rows)
            {
                migrationBuilder.Sql(
                    $"DELETE FROM lab_value_types WHERE column_name = {S(r.Col)};");
                migrationBuilder.Sql(
                    $"ALTER TABLE lab_analyses DROP COLUMN IF EXISTS {r.Col};");
            }
        }

        /// <summary>Matnli SQL literal — bitta tirnoq ikkilanadi; null bo'lsa NULL.</summary>
        private static string S(string value) =>
            value == null ? "NULL" : "'" + value.Replace("'", "''") + "'";

        /// <summary>Sonli SQL literal — InvariantCulture (nuqtali kasr); null bo'lsa NULL.</summary>
        private static string D(double? value) =>
            value.HasValue
                ? value.Value.ToString(System.Globalization.CultureInfo.InvariantCulture)
                : "NULL";
    }
}
