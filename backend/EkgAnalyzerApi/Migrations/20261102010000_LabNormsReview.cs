using EkgAnalyzerApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <summary>
    /// Katalog me'yorlarini (`lab_value_types`) ishonchli manbalar bilan
    /// solishtirish natijasidagi tuzatishlar (2026-11-02). Bu me'yorlar
    /// ZAXIRA: laboratoriyaning o'z me'yori (`lab_analysis_values.ref_*`)
    /// bo'lsa, baho o'sha bilan qilinadi. Shuning uchun ular umum qabul
    /// qilingan kattalar (18–65, homilador emas) referens intervallari bo'lishi
    /// kerak.
    ///
    /// Jiddiy xatolar (klinik jihatdan chalg'itardi):
    ///  * plt 180–400 → 150–400 ×10⁹/L — trombotsitopeniya &lt;150 (ABIM, Helix);
    ///  * daily_sodium 130–260 → 40–220 mmol/24h — kam tuzli parhez "past"
    ///    deb chiqardi (Helix; ABIM: iste'molga bog'liq);
    ///  * rheumatoid_factor ≤30 → ≤14 IU/mL — 15–30 past-musbat RF normal
    ///    ko'rinardi (Mayo, Roche RF-II);
    ///  * troponin_i ≤0.1 → ≤0.04 ng/mL — 0.1 ko'pchilik assaylar 99-persentilidan
    ///    3–6 baravar yuqori (assayga xos chegara laboratoriya me'yoridan olinadi).
    ///
    /// Aniqlashtirishlar: glyukoza ≤5.5 (ADA: 5.6 — prediabet), ALP ayol
    /// 35–105 (IFCC/Roche), WBC 4–10, mutlaq leykoformula (Helix, ABIM),
    /// SOE pastki chegarasiz, peshob zichligi 1.003–1.030, pH 5–8, peshob
    /// oqsili ≤0.14 g/L va glyukozasi ≤0.8 mmol/L, sutkalik kreatinin, RDW-SD
    /// 37–54, RBC ayol 3.8–5.1, vitamin D ≥20 ng/mL (Endocrine Society 2024,
    /// IOM), CA-125 erkaklar uchun ham ≤35.
    ///
    /// Shu turlar bo'yicha katalog me'yori bilan qo'yilgan baholar
    /// (`flag_source = 'catalog'`) qayta hisoblanadi.
    /// </summary>
    [DbContext(typeof(MedDataDB))]
    [Migration("20261102010000_LabNormsReview")]
    public partial class LabNormsReview : Migration
    {
        /// <summary>column_name, erkak min/max, ayol min/max (null — chegara yo'q).</summary>
        private static readonly (string Col, double? MinM, double? MaxM, double? MinF, double? MaxF)[] Norms =
        {
            // ── Jiddiy xatolar ──
            ("plt", 150.0, 400.0, 150.0, 400.0),
            ("daily_sodium", 40.0, 220.0, 40.0, 220.0),
            ("rheumatoid_factor", null, 14.0, null, 14.0),
            ("troponin_i", null, 0.04, null, 0.04),
            // ── Aniqlashtirishlar ──
            ("glucose", 3.9, 5.5, 3.9, 5.5),
            ("alp", 40.0, 130.0, 35.0, 105.0),
            ("wbc", 4.0, 10.0, 4.0, 10.0),
            ("rbc", 4.3, 5.7, 3.8, 5.1),
            ("neutrophils_abs", 1.8, 7.7, 1.8, 7.7),
            ("lymphocytes_abs", 1.0, 4.0, 1.0, 4.0),
            ("monocytes_abs", 0.1, 1.0, 0.1, 1.0),
            ("rdw_sd", 37.0, 54.0, 37.0, 54.0),
            ("esr", null, 15.0, null, 20.0),
            ("urine_density", 1.003, 1.030, 1.003, 1.030),
            ("urine_ph", 5.0, 8.0, 5.0, 8.0),
            ("urine_protein", null, 0.14, null, 0.14),
            ("urine_glucose", null, 0.8, null, 0.8),
            ("daily_creatinine", 7.1, 17.7, 5.3, 15.9),
            ("vitamin_d", 20.0, 100.0, 20.0, 100.0),
            ("ca125", null, 35.0, null, 35.0),
        };

        protected override void Up(MigrationBuilder migrationBuilder)
        {
            foreach (var n in Norms)
            {
                migrationBuilder.Sql($@"
                    UPDATE lab_value_types
                       SET normal_min_male = {D(n.MinM)}, normal_max_male = {D(n.MaxM)},
                           normal_min_female = {D(n.MinF)}, normal_max_female = {D(n.MaxF)},
                           updated_at = NOW()
                     WHERE column_name = '{n.Col}';");
            }

            // Katalog me'yori bilan qo'yilgan baholar yangi me'yor bo'yicha
            // (jinsi noma'lum bo'lsa — ikkala me'yorning birlashmasi)
            var cols = string.Join(", ", System.Linq.Enumerable.Select(Norms, n => $"'{n.Col}'"));
            migrationBuilder.Sql($@"
                UPDATE lab_analysis_values v
                   SET flag = CASE
                        WHEN s.lo IS NULL AND s.hi IS NULL THEN NULL
                        WHEN s.lo IS NOT NULL AND v.value < s.lo THEN -1
                        WHEN s.hi IS NOT NULL AND v.value > s.hi THEN 1
                        ELSE 0 END
                  FROM (
                        SELECT v2.id,
                               CASE WHEN p.gender IS TRUE THEN t.normal_min_male
                                    WHEN p.gender IS FALSE THEN t.normal_min_female
                                    ELSE LEAST(t.normal_min_male, t.normal_min_female) END AS lo,
                               CASE WHEN p.gender IS TRUE THEN t.normal_max_male
                                    WHEN p.gender IS FALSE THEN t.normal_max_female
                                    ELSE GREATEST(t.normal_max_male, t.normal_max_female) END AS hi
                          FROM lab_analysis_values v2
                          JOIN lab_value_types t ON t.id = v2.value_type_id
                          JOIN patients p ON p.id = v2.patient_id
                         WHERE t.column_name IN ({cols})
                  ) s
                 WHERE s.id = v.id
                   AND v.flag_source = 'catalog'
                   AND v.value IS NOT NULL
                   AND NOT v.unit_mismatch;");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Oldingi qiymatlar `20260905000000_AddLabValueTypesExtended` va
            // `20261101000000_LabAnalysisValues` da; ataylab qaytarilmaydi —
            // ular manbalar bilan solishtirilganda xato chiqqan.
        }

        private static string D(double? value) =>
            value.HasValue
                ? value.Value.ToString(System.Globalization.CultureInfo.InvariantCulture)
                : "NULL";
    }
}
