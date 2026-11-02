using EkgAnalyzerApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <summary>
    /// Jinsi noma'lum bemorlarning katalog me'yori bilan qo'yilgan baholari
    /// qayta hisoblanadi (L-17).
    ///
    /// Jinsi NULL bo'lsa me'yor ikkala jins me'yorining birlashmasi. Avval
    /// SQL dagi <c>LEAST</c>/<c>GREATEST</c> NULL ni tashlab yuborardi: FSG/LG
    /// da ayol me'yori ataylab NULL (siklga bog'liq) — birlashma erkak
    /// 1.4–14 bo'lib qolardi va menopauzadagi ayolning FSG 60 si "yuqori"
    /// chiqardi. Endi: biror jinsning shu tomondagi chegarasi yo'q bo'lsa,
    /// birlashmada ham o'sha tomonda chegara yo'q (Python
    /// `lab_catalog.norm_bounds` va .NET `PatientLabContext` bilan bir xil).
    ///
    /// Faqat sonli ko'rsatkichlar, laboratoriya me'yori yo'q qatorlar
    /// (`flag_source` = 'catalog' yoki NULL) — fayldagi me'yor bilan
    /// qo'yilgan baho o'zgarmaydi. Baho yo'qolsa `flag_source` ham NULL.
    /// </summary>
    [DbContext(typeof(MedDataDB))]
    [Migration("20261104002000_LabFlagsUnknownSexNorms")]
    public partial class LabFlagsUnknownSexNorms : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                UPDATE lab_analysis_values v
                   SET flag = s.new_flag,
                       flag_source = CASE WHEN s.new_flag IS NULL THEN NULL ELSE 'catalog' END
                  FROM (
                        SELECT b.id,
                               CASE
                                   WHEN b.unit_mismatch OR b.value IS NULL THEN NULL
                                   WHEN b.lo IS NULL AND b.hi IS NULL THEN NULL
                                   WHEN b.lo IS NOT NULL AND b.value < b.lo THEN -1
                                   WHEN b.hi IS NOT NULL AND b.value > b.hi THEN 1
                                   ELSE 0 END AS new_flag
                          FROM (
                                SELECT v2.id, v2.value, v2.unit_mismatch,
                                       CASE WHEN t.normal_min_male IS NULL OR t.normal_min_female IS NULL THEN NULL
                                            ELSE LEAST(t.normal_min_male, t.normal_min_female) END AS lo,
                                       CASE WHEN t.normal_max_male IS NULL OR t.normal_max_female IS NULL THEN NULL
                                            ELSE GREATEST(t.normal_max_male, t.normal_max_female) END AS hi
                                  FROM lab_analysis_values v2
                                  JOIN lab_value_types t ON t.id = v2.value_type_id
                                  JOIN patients p ON p.id = v2.patient_id
                                 WHERE p.gender IS NULL
                                   AND COALESCE(t.value_kind, 'numeric') = 'numeric'
                                   AND (v2.flag_source = 'catalog' OR v2.flag_source IS NULL)
                                   AND v2.ref_low IS NULL AND v2.ref_high IS NULL
                          ) b
                  ) s
                 WHERE s.id = v.id
                   AND (v.flag IS DISTINCT FROM s.new_flag
                        OR v.flag_source IS DISTINCT FROM (CASE WHEN s.new_flag IS NULL THEN NULL ELSE 'catalog' END));");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Ataylab qaytarilmaydi: eski baho jinsi noma'lum ayolga erkak
            // me'yorini qo'llardi (xato).
        }
    }
}
