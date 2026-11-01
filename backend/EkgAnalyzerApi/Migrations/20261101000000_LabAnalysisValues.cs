using EkgAnalyzerApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EkgAnalyzerApi.Migrations
{
    /// <summary>
    /// Laboratoriya ko'rsatkichlarini "har bir qiymat — alohida qator"
    /// ko'rinishiga o'tkazadi (2026-11-01, loyiha egasi bilan kelishilgan).
    ///
    /// Ilgari har bir ko'rsatkich `lab_analyses` jadvalida alohida ustun edi
    /// (87 ta, ko'pi NULL). Yangi ko'rsatkich uchun migratsiya va 9 joyda kod
    /// kerak edi, ko'rsatkichlar bo'yicha statistika esa har biri uchun alohida
    /// SQL talab qilardi. Endi:
    ///
    ///  1. `lab_value_types` — ko'rsatkichlar katalogi (yagona manba):
    ///     `category`, `value_kind` (numeric | qualitative | code),
    ///     `sort_order`, `ai_hint` (AI promptidagi tavsif) ustunlari va
    ///     `column_name` bo'yicha UNIQUE indeks qo'shiladi. Klinika arxivi
    ///     tahlilidan topilgan 50 ta yangi ko'rsatkich (troponin, NT-proBNP,
    ///     HBsAg, gormonlar, onkomarkerlar, qon guruhi…) — faqat QATOR
    ///     sifatida, ustun qo'shilmaydi.
    ///  2. `lab_analysis_values` — bitta tahlilning bitta ko'rsatkichi = bitta
    ///     qator. `patient_id` va `measured_at` statistika va dinamika
    ///     so'rovlari JOIN siz ishlashi uchun nusxalanadi. `unit_mismatch`
    ///     qatorlar saqlanadi, lekin baholanmaydi (statistikada chiqarib
    ///     tashlanishi SHART). `flag`: -1 past, 0 normal, 1 yuqori.
    ///  3. Mavjud 87 ta ustundagi qiymatlar yangi jadvalga ko'chiriladi
    ///     (asl birlik/qiymat `ai_answer_data` dan olinadi). Birligi mos
    ///     kelmagan (ustunga yozilmagan) JSON qiymatlari ham ko'chiriladi.
    ///
    /// Eski ustunlar HOZIRCHA o'chirilmaydi (zaxira): ularga hech kim
    /// yozmaydi va hech kim o'qimaydi. Ko'chirish tekshirilgach, keyingi
    /// migratsiyada `DROP COLUMN` qilinadi.
    ///
    /// Idempotent: `IF NOT EXISTS`, `WHERE NOT EXISTS`, `ON CONFLICT DO NOTHING`.
    /// </summary>
    [DbContext(typeof(MedDataDB))]
    [Migration("20261101000000_LabAnalysisValues")]
    public partial class LabAnalysisValues : Migration
    {
        /// <summary>Yangi ko'rsatkichlar: column_name, uz, ru, en, o'lchov, erkak min/max, ayol min/max.</summary>
        private static readonly (string Col, string Uz, string Ru, string En, string Unit,
            double? MinM, double? MaxM, double? MinF, double? MaxF)[] NewTypes =
        {
            // ── Yurak markerlari ──
            ("troponin_i", "Troponin I", "Тропонин I", "Troponin I", "ng/mL", null, 0.1, null, 0.1),
            ("ck_mb_mass", "KFK-MB (massa)", "КФК-МВ (масса)", "CK-MB (mass)", "ng/mL", null, 5.0, null, 5.0),
            ("myoglobin", "Mioglobin", "Миоглобин", "Myoglobin", "ng/mL", null, 70.0, null, 70.0),
            ("nt_probnp", "NT-proBNP", "NT-proBNP", "NT-proBNP", "pg/mL", null, 125.0, null, 125.0),
            ("st2", "ST2", "ST2", "ST2", "ng/mL", null, 35.0, null, 35.0),
            // ── Yallig'lanish va revmoproba ──
            ("procalcitonin", "Prokalsitonin", "Прокальцитонин", "Procalcitonin", "ng/mL", null, 0.1, null, 0.1),
            ("rheumatoid_factor", "Revmatoid omil (RF)", "Ревматоидный фактор (РФ)", "Rheumatoid factor (RF)", "IU/mL", null, 30.0, null, 30.0),
            ("aslo", "Antistreptolizin-O (ASLO)", "Антистрептолизин-О (АСЛО)", "Antistreptolysin O (ASLO)", "IU/mL", null, 200.0, null, 200.0),
            // ── Infeksiya markerlari (sifat natijasi) ──
            ("hbsag", "HBsAg (gepatit B)", "HBsAg (гепатит B)", "HBsAg (hepatitis B)", null, null, 0.99, null, 0.99),
            ("anti_hcv", "Anti-HCV (gepatit C)", "Анти-HCV (гепатит C)", "Anti-HCV (hepatitis C)", null, null, 0.99, null, 0.99),
            ("rw", "RW (sifilis)", "RW (сифилис)", "RW (syphilis)", null, null, 0.99, null, 0.99),
            ("hiv", "OIV (HIV 1/2)", "ВИЧ (HIV 1/2)", "HIV 1/2", null, null, 0.99, null, 0.99),
            ("h_pylori", "Helicobacter pylori", "Helicobacter pylori", "Helicobacter pylori", null, null, 0.99, null, 0.99),
            // ── Qalqonsimon bez (qo'shimcha) ──
            ("anti_tpo", "TPO ga antitanalar (AT-TPO)", "Антитела к ТПО (АТ-ТПО)", "Anti-TPO antibodies", "IU/mL", null, 30.0, null, 30.0),
            ("anti_tg", "Tireoglobulinga antitanalar (AT-TG)", "Антитела к тиреоглобулину (АТ-ТГ)", "Anti-thyroglobulin antibodies", "IU/mL", null, 100.0, null, 100.0),
            ("thyroglobulin", "Tireoglobulin", "Тиреоглобулин", "Thyroglobulin", "ng/mL", 3.5, 77.0, 3.5, 77.0),
            ("calcitonin", "Kalsitonin", "Кальцитонин", "Calcitonin", "pg/mL", null, 8.4, null, 5.0),
            // ── Gormonlar ──
            ("prolactin", "Prolaktin", "Пролактин", "Prolactin", "ng/mL", 4.0, 15.2, 4.8, 23.3),
            ("testosterone", "Testosteron", "Тестостерон", "Testosterone", "nmol/L", 8.6, 29.0, 0.29, 1.67),
            ("estradiol", "Estradiol", "Эстрадиол", "Estradiol", "pg/mL", null, null, null, null),
            ("progesterone", "Progesteron", "Прогестерон", "Progesterone", "nmol/L", null, null, null, null),
            ("fsh", "Follikulostimullovchi gormon (FSG)", "Фолликулостимулирующий гормон (ФСГ)", "Follicle-stimulating hormone (FSH)", "mIU/mL", 1.4, 14.0, null, null),
            ("lh", "Lyuteinlovchi gormon (LG)", "Лютеинизирующий гормон (ЛГ)", "Luteinizing hormone (LH)", "mIU/mL", 1.5, 9.0, null, null),
            ("hcg", "Xorionik gonadotropin (XGCh)", "Хорионический гонадотропин (ХГЧ)", "Human chorionic gonadotropin (hCG)", "mIU/mL", null, 5.0, null, 5.0),
            ("cortisol", "Kortizol", "Кортизол", "Cortisol", "nmol/L", 138.0, 690.0, 138.0, 690.0),
            ("acth", "Adrenokortikotrop gormon (AKTG)", "Адренокортикотропный гормон (АКТГ)", "ACTH", "pg/mL", 7.2, 63.3, 7.2, 63.3),
            ("renin", "Renin", "Ренин", "Renin", "µIU/mL", null, null, null, null),
            ("aldosterone", "Aldosteron", "Альдостерон", "Aldosterone", "pg/mL", null, null, null, null),
            ("amh", "Antimyuller gormoni (AMG)", "Антимюллеров гормон (АМГ)", "Anti-Mullerian hormone (AMH)", "ng/mL", null, null, null, null),
            ("ige_total", "Umumiy immunoglobulin E (IgE)", "Иммуноглобулин E общий (IgE)", "Total immunoglobulin E (IgE)", "IU/mL", null, 100.0, null, 100.0),
            // ── Onkomarkerlar ──
            ("psa_total", "PSA umumiy", "ПСА общий", "Total PSA", "ng/mL", null, 4.0, null, null),
            ("psa_free", "PSA erkin", "ПСА свободный", "Free PSA", "ng/mL", null, null, null, null),
            ("ca125", "CA-125", "СА-125", "CA-125", "U/mL", null, null, null, 35.0),
            ("he4", "HE4", "HE4", "HE4", "pmol/L", null, null, null, null),
            ("roma_index", "ROMA indeksi", "Индекс ROMA", "ROMA index", "%", null, null, null, null),
            // ── Uglevod va almashinuv (qo'shimcha) ──
            ("glucose_postprandial", "Glyukoza (ovqatdan keyin)", "Глюкоза (после еды)", "Glucose (postprandial)", "mmol/L", null, 7.8, null, 7.8),
            ("homa_ir", "HOMA-IR indeksi", "Индекс HOMA-IR", "HOMA-IR index", null, null, 2.7, null, 2.7),
            ("homocysteine", "Gomotsistein", "Гомоцистеин", "Homocysteine", "µmol/L", 5.0, 15.0, 5.0, 15.0),
            ("cystatin_c", "Sistatin C", "Цистатин C", "Cystatin C", "mg/L", 0.51, 1.09, 0.51, 1.09),
            // ── Qon formulasi - mutlaq sonlar ──
            ("neutrophils_abs", "Neytrofillar (mutlaq soni)", "Нейтрофилы (абс.)", "Neutrophils (absolute)", "×10⁹/L", 2.0, 7.0, 2.0, 7.0),
            ("lymphocytes_abs", "Limfotsitlar (mutlaq soni)", "Лимфоциты (абс.)", "Lymphocytes (absolute)", "×10⁹/L", 0.8, 4.0, 0.8, 4.0),
            ("monocytes_abs", "Monotsitlar (mutlaq soni)", "Моноциты (абс.)", "Monocytes (absolute)", "×10⁹/L", 0.12, 1.2, 0.12, 1.2),
            ("eosinophils_abs", "Eozinofillar (mutlaq soni)", "Эозинофилы (абс.)", "Eosinophils (absolute)", "×10⁹/L", 0.02, 0.5, 0.02, 0.5),
            ("basophils_abs", "Bazofillar (mutlaq soni)", "Базофилы (абс.)", "Basophils (absolute)", "×10⁹/L", 0.0, 0.1, 0.0, 0.1),
            ("rdw_sd", "RDW-SD", "RDW-SD", "RDW-SD", "fL", 35.0, 56.0, 35.0, 56.0),
            // ── Qon guruhi (kod) ──
            ("blood_group", "Qon guruhi", "Группа крови", "Blood group", null, null, null, null, null),
            ("rh_factor", "Rezus omil", "Резус-фактор", "Rh factor", null, null, null, null, null),
            // ── Nechiporenko sinamasi ──
            ("nechiporenko_wbc", "Nechiporenko - leykotsitlar (1 mL da)", "Нечипоренко - лейкоциты (в 1 мл)", "Nechiporenko - leukocytes (per mL)", null, null, 2000.0, null, 2000.0),
            ("nechiporenko_rbc", "Nechiporenko - eritrotsitlar (1 mL da)", "Нечипоренко - эритроциты (в 1 мл)", "Nechiporenko - erythrocytes (per mL)", null, null, 1000.0, null, 1000.0),
            ("nechiporenko_casts", "Nechiporenko - silindrlar (1 mL da)", "Нечипоренко - цилиндры (в 1 мл)", "Nechiporenko - casts (per mL)", null, null, 20.0, null, 20.0),
        };

        /// <summary>
        /// Barcha 137 ko'rsatkich uchun katalog metama'lumoti:
        /// column_name, category, value_kind, sort_order, ai_hint.
        /// </summary>
        private static readonly (string Col, string Category, string Kind, int Sort, string Hint)[] Meta =
        {
            // ── cbc ──
            ("hb", "cbc", "numeric", 10, "Gemoglobin – qonda kislorod tashuvchi oqsil (g/L)"),
            ("rbc", "cbc", "numeric", 20, "Qizil qon hujayralari soni (x10¹²/L)"),
            ("wbc", "cbc", "numeric", 30, "Oq qon hujayralari soni (x10⁹/L)"),
            ("plt", "cbc", "numeric", 40, "Qon trombotsitlari soni (x10⁹/L)"),
            ("hct", "cbc", "numeric", 50, "Gematokrit – qondagi qizil qon hujayralari foizi (%)"),
            ("mcv", "cbc", "numeric", 60, "O'rtacha eritrosit hajmi (fL)"),
            ("mch", "cbc", "numeric", 70, "O'rtacha gemoglobin miqdori eritrositda (pg)"),
            ("mchc", "cbc", "numeric", 80, "O'rtacha gemoglobin kontsentratsiyasi eritrositda (g/L)"),
            ("rdw", "cbc", "numeric", 90, "Eritrositlar taqsimlanish kengligi RDW (%)"),
            ("rdw_sd", "cbc", "numeric", 100, "Eritrositlar taqsimlanish kengligi RDW-SD (fL). RDW-CV (%) - rdw"),
            ("mpv", "cbc", "numeric", 110, "O'rtacha trombotsit hajmi MPV (fL)"),
            ("pdw", "cbc", "numeric", 120, "Trombotsitlar taqsimlanish kengligi PDW (%)"),
            ("pct", "cbc", "numeric", 130, "Trombokrit PCT (%)"),
            ("neutrophils", "cbc", "numeric", 140, "Neytrofillar (%)"),
            ("lymphocytes", "cbc", "numeric", 150, "Limfotsitlar (%)"),
            ("monocytes", "cbc", "numeric", 160, "Monotsitlar (%)"),
            ("eosinophils", "cbc", "numeric", 170, "Eozinofillar (%)"),
            ("basophils", "cbc", "numeric", 180, "Bazofillar (%)"),
            ("neutrophils_abs", "cbc", "numeric", 190, "Neytrofillar mutlaq soni NEU# (x10⁹/L). Foizi (NEU%) - neutrophils"),
            ("lymphocytes_abs", "cbc", "numeric", 200, "Limfotsitlar mutlaq soni LYM# (x10⁹/L). Foizi - lymphocytes"),
            ("monocytes_abs", "cbc", "numeric", 210, "Monotsitlar mutlaq soni MON# (x10⁹/L). Foizi - monocytes"),
            ("eosinophils_abs", "cbc", "numeric", 220, "Eozinofillar mutlaq soni EOS# (x10⁹/L). Foizi - eosinophils"),
            ("basophils_abs", "cbc", "numeric", 230, "Bazofillar mutlaq soni BAS# (x10⁹/L). Foizi - basophils"),
            ("reticulocytes", "cbc", "numeric", 240, "Retikulotsitlar (%)"),
            ("esr", "cbc", "numeric", 250, "Erythrocyte Sedimentation Rate – qizil qon hujayralari cho'kishi (mm/soat)"),
            // ── carb ──
            ("glucose", "carb", "numeric", 260, "Qonda glyukoza darajasi (mmol/L)"),
            ("glucose_postprandial", "carb", "numeric", 270, "Ovqatdan keyingi glyukoza (mmol/L). Och qoringa o'lchangani - glucose"),
            ("hba1c", "carb", "numeric", 280, "Glikirlangan gemoglobin HbA1c (%)"),
            ("insulin", "carb", "numeric", 290, "Qondagi insulin (µIU/mL)"),
            ("c_peptide", "carb", "numeric", 300, "S-peptid (ng/mL)"),
            ("homa_ir", "carb", "numeric", 310, "HOMA-IR insulinrezistentlik indeksi (birliksiz)"),
            // ── lipid ──
            ("cholesterol", "lipid", "numeric", 320, "Qonda xolesterol darajasi (mmol/L)"),
            ("triglycerides", "lipid", "numeric", 330, "Triglitseridlar (mmol/L)"),
            ("hdl", "lipid", "numeric", 340, "HDL (yuqori zichlikli) xolesterin (mmol/L)"),
            ("ldl", "lipid", "numeric", 350, "LDL (past zichlikli) xolesterin (mmol/L)"),
            ("vldl", "lipid", "numeric", 360, "VLDL (juda past zichlikli) xolesterin (mmol/L)"),
            ("atherogenic_index", "lipid", "numeric", 370, "Aterogenlik koeffitsienti (nisbat)"),
            // ── liver ──
            ("alt", "liver", "numeric", 380, "Alanin aminotransferaza – jigar fermenti (U/L)"),
            ("ast", "liver", "numeric", 390, "Aspartat aminotransferaza – jigar/miya fermenti (U/L)"),
            ("ggt", "liver", "numeric", 400, "Gamma-glutamiltransferaza GGT (U/L)"),
            ("alp", "liver", "numeric", 410, "Ishqoriy fosfataza ALP (U/L)"),
            ("bilirubin_total", "liver", "numeric", 420, "Jami bilirubin – jigar funksiyasi (µmol/L)"),
            ("bilirubin_direct", "liver", "numeric", 430, "To'g'ridan-to'g'ri bilirubin (µmol/L)"),
            ("bilirubin_indirect", "liver", "numeric", 440, "To'g'ri bo'lmagan (indirekt) bilirubin (µmol/L)"),
            // ── protein ──
            ("total_protein", "protein", "numeric", 450, "Jami oqsillar (g/L)"),
            ("albumin", "protein", "numeric", 460, "Albumin oqsili (g/L)"),
            ("globulin", "protein", "numeric", 470, "Globulinlar (g/L)"),
            // ── kidney ──
            ("creatinine", "kidney", "numeric", 480, "Kreatinin – buyrak funksiyasi (µmol/L)"),
            ("urea", "kidney", "numeric", 490, "Mochevina – buyrak funksiyasi (mmol/L)"),
            ("uric_acid", "kidney", "numeric", 500, "Siydik kislotasi (µmol/L)"),
            ("cystatin_c", "kidney", "numeric", 510, "Sistatin C (mg/L)"),
            // ── enzyme ──
            ("amylase", "enzyme", "numeric", 520, "Amilaza (U/L)"),
            ("lipase", "enzyme", "numeric", 530, "Lipaza (U/L)"),
            ("ldh", "enzyme", "numeric", 540, "Laktatdegidrogenaza LDH (U/L)"),
            ("ck", "enzyme", "numeric", 550, "Kreatinkinaza KFK (U/L)"),
            ("ck_mb", "enzyme", "numeric", 560, "Kreatinkinaza-MB KFK-MB (U/L)"),
            // ── electrolyte ──
            ("sodium", "electrolyte", "numeric", 570, "Qondagi natriy (mmol/L)"),
            ("potassium", "electrolyte", "numeric", 580, "Qondagi kaliy (mmol/L)"),
            ("chloride", "electrolyte", "numeric", 590, "Xlor (mmol/L)"),
            ("calcium", "electrolyte", "numeric", 600, "Qondagi kalsiy (mmol/L)"),
            ("magnesium", "electrolyte", "numeric", 610, "Magniy (mmol/L)"),
            ("phosphorus", "electrolyte", "numeric", 620, "Fosfor (mmol/L)"),
            // ── iron ──
            ("iron", "iron", "numeric", 630, "Qondagi temir (µmol/L)"),
            ("ferritin", "iron", "numeric", 640, "Ferritin (µg/L)"),
            ("tibc", "iron", "numeric", 650, "Umumiy temir bog'lash qobiliyati TIBC (µmol/L)"),
            ("transferrin", "iron", "numeric", 660, "Transferrin (g/L)"),
            // ── inflammation ──
            ("crp", "inflammation", "numeric", 670, "C-reaktiv oqsil CRP (mg/L)"),
            ("procalcitonin", "inflammation", "numeric", 680, "Prokalsitonin (ng/mL)"),
            ("rheumatoid_factor", "inflammation", "numeric", 690, "Revmatoid omil RF (IU/mL)"),
            ("aslo", "inflammation", "numeric", 700, "Antistreptolizin-O ASLO (IU/mL)"),
            // ── cardiac ──
            ("troponin_i", "cardiac", "numeric", 710, "Troponin I (ng/mL)"),
            ("ck_mb_mass", "cardiac", "numeric", 720, "KFK-MB massa konsentratsiyasi, ng/mL da (U/L da bo'lsa - ck_mb)"),
            ("myoglobin", "cardiac", "numeric", 730, "Mioglobin (ng/mL)"),
            ("nt_probnp", "cardiac", "numeric", 740, "NT-proBNP - yurak yetishmovchiligi markeri (pg/mL)"),
            ("st2", "cardiac", "numeric", 750, "ST2 - yurak yetishmovchiligi markeri (ng/mL)"),
            // ── coagulation ──
            ("prothrombin_time", "coagulation", "numeric", 760, "Protrombin vaqti PV (sekund)"),
            ("prothrombin_index", "coagulation", "numeric", 770, "Protrombin indeksi PTI (%)"),
            ("inr", "coagulation", "numeric", 780, "Xalqaro normallashgan nisbat INR (nisbat)"),
            ("aptt", "coagulation", "numeric", 790, "Faollashgan qisman tromboplastin vaqti aPTT (sekund)"),
            ("fibrinogen", "coagulation", "numeric", 800, "Fibrinogen (g/L)"),
            ("thrombin_time", "coagulation", "numeric", 810, "Trombin vaqti (sekund)"),
            ("d_dimer", "coagulation", "numeric", 820, "D-dimer (mg/L)"),
            // ── thyroid ──
            ("tsh", "thyroid", "numeric", 830, "Tiroid stimulyator gormoni (µIU/mL)"),
            ("free_t4", "thyroid", "numeric", 840, "Bepul tiroksin T4 (pmol/L)"),
            ("free_t3", "thyroid", "numeric", 850, "Erkin T3 FT3 (pmol/L)"),
            ("t4_total", "thyroid", "numeric", 860, "Umumiy T4 (nmol/L)"),
            ("t3_total", "thyroid", "numeric", 870, "Umumiy T3 (nmol/L)"),
            ("anti_tpo", "thyroid", "numeric", 880, "Tireoperoksidazaga antitanalar AT-TPO (IU/mL)"),
            ("anti_tg", "thyroid", "numeric", 890, "Tireoglobulinga antitanalar AT-TG (IU/mL)"),
            ("thyroglobulin", "thyroid", "numeric", 900, "Tireoglobulin TG (ng/mL)"),
            ("calcitonin", "thyroid", "numeric", 910, "Kalsitonin CT (pg/mL)"),
            // ── hormone ──
            ("prolactin", "hormone", "numeric", 920, "Prolaktin (ng/mL)"),
            ("testosterone", "hormone", "numeric", 930, "Testosteron (nmol/L)"),
            ("estradiol", "hormone", "numeric", 940, "Estradiol (pg/mL)"),
            ("progesterone", "hormone", "numeric", 950, "Progesteron (nmol/L)"),
            ("fsh", "hormone", "numeric", 960, "Follikulostimullovchi gormon FSG (mIU/mL)"),
            ("lh", "hormone", "numeric", 970, "Lyuteinlovchi gormon LG (mIU/mL)"),
            ("hcg", "hormone", "numeric", 980, "Xorionik gonadotropin XGCh / hCG (mIU/mL)"),
            ("cortisol", "hormone", "numeric", 990, "Kortizol (nmol/L)"),
            ("acth", "hormone", "numeric", 1000, "Adrenokortikotrop gormon AKTG (pg/mL)"),
            ("renin", "hormone", "numeric", 1010, "Renin (µIU/mL)"),
            ("aldosterone", "hormone", "numeric", 1020, "Aldosteron (pg/mL)"),
            ("amh", "hormone", "numeric", 1030, "Antimyuller gormoni AMG (ng/mL)"),
            // ── vitamin ──
            ("vitamin_d", "vitamin", "numeric", 1040, "Vitamin D 25-OH (ng/mL)"),
            ("vitamin_b12", "vitamin", "numeric", 1050, "Vitamin B12 (pg/mL)"),
            ("folate", "vitamin", "numeric", 1060, "Foliy kislotasi (ng/mL)"),
            ("homocysteine", "vitamin", "numeric", 1070, "Gomotsistein (µmol/L)"),
            // ── immunology ──
            ("ige_total", "immunology", "numeric", 1080, "Umumiy immunoglobulin E IgE (IU/mL)"),
            // ── infection ──
            ("hbsag", "infection", "qualitative", 1090, "HBsAg - gepatit B antigeni. SIFAT: 0 = manfiy, 1 = musbat yoki shubhali; faylda indeks (COI, S/CO) son bo'lsa - o'sha son; asl yozuv `text` ga"),
            ("anti_hcv", "infection", "qualitative", 1100, "Anti-HCV - gepatit C antitanasi. SIFAT: 0 = manfiy, 1 = musbat yoki shubhali; faylda indeks (COI, S/CO) son bo'lsa - o'sha son; asl yozuv `text` ga"),
            ("rw", "infection", "qualitative", 1110, "RW / sifilis testi (Anti-TP). SIFAT: 0 = manfiy, 1 = musbat yoki shubhali; faylda indeks (COI, S/CO) son bo'lsa - o'sha son; asl yozuv `text` ga"),
            ("hiv", "infection", "qualitative", 1120, "OIV / HIV 1/2 testi. SIFAT: 0 = manfiy, 1 = musbat yoki shubhali; faylda indeks (COI, S/CO) son bo'lsa - o'sha son; asl yozuv `text` ga"),
            ("h_pylori", "infection", "qualitative", 1130, "Helicobacter pylori testi. SIFAT: 0 = manfiy, 1 = musbat yoki shubhali; faylda indeks (COI, S/CO) son bo'lsa - o'sha son; asl yozuv `text` ga"),
            // ── tumor ──
            ("psa_total", "tumor", "numeric", 1140, "Prostata spetsifik antigeni PSA umumiy (ng/mL)"),
            ("psa_free", "tumor", "numeric", 1150, "PSA erkin (ng/mL)"),
            ("ca125", "tumor", "numeric", 1160, "Uglevod antigeni CA-125 (U/mL)"),
            ("he4", "tumor", "numeric", 1170, "HE4 - tuxumdon saratoni markeri (pmol/L)"),
            ("roma_index", "tumor", "numeric", 1180, "ROMA indeksi (%) - pre- yoki postmenopauza ekanini `text` ga yoz"),
            // ── blood_group ──
            ("blood_group", "blood_group", "code", 1190, "Qon guruhi: 1 = O(I), 2 = A(II), 3 = B(III), 4 = AB(IV); asl yozuv `text` ga"),
            ("rh_factor", "blood_group", "code", 1200, "Rezus omil: 1 = Rh+ (musbat), 0 = Rh- (manfiy); asl yozuv `text` ga"),
            // ── urine ──
            ("urine_volume", "urine", "numeric", 1210, "Peshob hajmi (mL)"),
            ("urine_density", "urine", "numeric", 1220, "Peshob zichligi (1.010–1.025)"),
            ("urine_ph", "urine", "numeric", 1230, "Peshob pH (0–14)"),
            ("urine_protein", "urine", "numeric", 1240, "Peshobdagi oqsillar (g/L)"),
            ("urine_glucose", "urine", "numeric", 1250, "Peshobdagi glyukoza (mmol/L)"),
            ("urine_ketones", "urine", "numeric", 1260, "Peshobdagi keton tanqalari (mmol/L)"),
            ("urine_bilirubin", "urine", "numeric", 1270, "Peshobdagi bilirubin (µmol/L)"),
            ("urobilinogen", "urine", "numeric", 1280, "Peshobdagi urobilinogen (µmol/L)"),
            ("urine_rbc", "urine", "numeric", 1290, "Peshobdagi qizil qon hujayralari soni (count/field)"),
            ("urine_wbc", "urine", "numeric", 1300, "Peshobdagi oq qon hujayralari soni (count/field)"),
            // ── nechiporenko ──
            ("nechiporenko_wbc", "nechiporenko", "numeric", 1310, "Nechiporenko sinamasi: 1 mL peshobdagi leykotsitlar"),
            ("nechiporenko_rbc", "nechiporenko", "numeric", 1320, "Nechiporenko sinamasi: 1 mL peshobdagi eritrotsitlar"),
            ("nechiporenko_casts", "nechiporenko", "numeric", 1330, "Nechiporenko sinamasi: 1 mL peshobdagi silindrlar"),
            // ── urine_daily ──
            ("daily_protein", "urine_daily", "numeric", 1340, "24 soatlik peshobdagi protein (mg/24h)"),
            ("daily_creatinine", "urine_daily", "numeric", 1350, "24 soatlik kreatinin (mmol/24h)"),
            ("daily_calcium", "urine_daily", "numeric", 1360, "24 soatlik kalsiy (mmol/24h)"),
            ("daily_sodium", "urine_daily", "numeric", 1370, "24 soatlik natriy (mmol/24h)"),
        };

        /// <summary>Ma'lumoti yangi jadvalga ko'chiriladigan eski ustunlar.</summary>
        private static readonly string[] LegacyColumns =
        {
            "hb", "rbc", "wbc", "plt", "hct", "mcv", "mch", "mchc",
            "esr", "glucose", "cholesterol", "alt", "ast", "bilirubin_total", "bilirubin_direct", "creatinine",
            "urea", "total_protein", "albumin", "calcium", "sodium", "potassium", "iron", "tsh",
            "free_t4", "insulin", "urine_volume", "urine_density", "urine_ph", "urine_protein", "urine_glucose", "urine_ketones",
            "urine_bilirubin", "urobilinogen", "urine_rbc", "urine_wbc", "daily_protein", "daily_creatinine", "daily_calcium", "daily_sodium",
            "triglycerides", "hdl", "ldl", "vldl", "atherogenic_index", "hba1c", "c_peptide", "crp",
            "ggt", "alp", "amylase", "lipase", "ldh", "ck", "ck_mb", "uric_acid",
            "magnesium", "phosphorus", "chloride", "ferritin", "tibc", "transferrin", "bilirubin_indirect", "globulin",
            "free_t3", "t3_total", "t4_total", "vitamin_d", "vitamin_b12", "folate", "prothrombin_time", "prothrombin_index",
            "inr", "aptt", "fibrinogen", "thrombin_time", "d_dimer", "neutrophils", "lymphocytes", "monocytes",
            "eosinophils", "basophils", "rdw", "mpv", "pdw", "pct", "reticulocytes",
        };

        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── 1. Katalog ustunlari ──
            migrationBuilder.Sql(@"
                ALTER TABLE lab_value_types ADD COLUMN IF NOT EXISTS category varchar(32);
                ALTER TABLE lab_value_types ADD COLUMN IF NOT EXISTS value_kind varchar(16) NOT NULL DEFAULT 'numeric';
                ALTER TABLE lab_value_types ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
                ALTER TABLE lab_value_types ADD COLUMN IF NOT EXISTS ai_hint text;
                CREATE UNIQUE INDEX IF NOT EXISTS ux_lab_value_types_column_name
                    ON lab_value_types (column_name);");

            // ── 2. Yangi ko'rsatkichlar (faqat qator) ──
            foreach (var r in NewTypes)
            {
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

            // ── 3. Katalog metama'lumoti ──
            foreach (var m in Meta)
            {
                migrationBuilder.Sql($@"
                    UPDATE lab_value_types
                       SET category = {S(m.Category)}, value_kind = {S(m.Kind)},
                           sort_order = {m.Sort}, ai_hint = {S(m.Hint)}
                     WHERE column_name = {S(m.Col)};");
            }

            // ── 4. Qiymatlar jadvali ──
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS lab_analysis_values (
                    id               bigserial    PRIMARY KEY,
                    lab_analysis_id  integer      NOT NULL REFERENCES lab_analyses (id) ON DELETE CASCADE,
                    value_type_id    integer      NOT NULL REFERENCES lab_value_types (id) ON DELETE RESTRICT,
                    patient_id       integer      NOT NULL REFERENCES patients (id) ON DELETE CASCADE,
                    measured_at      timestamptz  NOT NULL,
                    value            numeric,
                    unit             varchar(64),
                    text             varchar(200),
                    original_value   numeric,
                    original_unit    varchar(64),
                    unit_mismatch    boolean      NOT NULL DEFAULT false,
                    flag             smallint,
                    created_at       timestamptz  NOT NULL DEFAULT NOW(),
                    CONSTRAINT ux_lab_analysis_values_analysis_type UNIQUE (lab_analysis_id, value_type_id)
                );
                CREATE INDEX IF NOT EXISTS ix_lab_analysis_values_type_date
                    ON lab_analysis_values (value_type_id, measured_at);
                CREATE INDEX IF NOT EXISTS ix_lab_analysis_values_patient_type_date
                    ON lab_analysis_values (patient_id, value_type_id, measured_at);");

            // ── 5. Eski ustunlardan ko'chirish ──
            foreach (var col in LegacyColumns)
            {
                var cell = $"la.ai_answer_data -> 'digital_measurements' -> {S(col)}";
                migrationBuilder.Sql($@"
                    DO $$
                    BEGIN
                        IF EXISTS (SELECT 1 FROM information_schema.columns
                                   WHERE table_name = 'lab_analyses' AND column_name = {S(col)}) THEN
                            INSERT INTO lab_analysis_values
                                (lab_analysis_id, value_type_id, patient_id, measured_at,
                                 value, unit, original_value, original_unit)
                            SELECT la.id, vt.id, la.patient_id, COALESCE(la.analysis_date, la.created_at),
                                   la.{col}, vt.measure,
                                   CASE WHEN jsonb_typeof({cell} -> 'original' -> 'value') = 'number'
                                        THEN ({cell} -> 'original' ->> 'value')::numeric END,
                                   {cell} -> 'original' ->> 'unit'
                              FROM lab_analyses la
                              JOIN lab_value_types vt ON vt.column_name = {S(col)}
                             WHERE la.{col} IS NOT NULL AND la.patient_id IS NOT NULL
                            ON CONFLICT (lab_analysis_id, value_type_id) DO NOTHING;
                        END IF;
                    END $$;");
            }

            // Birligi mos kelmagani uchun ustunga YOZILMAGAN qiymatlar (JSON da bor)
            migrationBuilder.Sql(@"
                INSERT INTO lab_analysis_values
                    (lab_analysis_id, value_type_id, patient_id, measured_at, value, unit, unit_mismatch)
                SELECT la.id, vt.id, la.patient_id, COALESCE(la.analysis_date, la.created_at),
                       (d.cell ->> 'value')::numeric, d.cell ->> 'unit', true
                  FROM lab_analyses la
                  CROSS JOIN LATERAL jsonb_each(
                        CASE WHEN jsonb_typeof(la.ai_answer_data -> 'digital_measurements') = 'object'
                             THEN la.ai_answer_data -> 'digital_measurements' ELSE '{}'::jsonb END
                  ) AS d(key, cell)
                  JOIN lab_value_types vt ON vt.column_name = d.key
                 WHERE la.patient_id IS NOT NULL
                   AND jsonb_typeof(d.cell) = 'object'
                   AND d.cell ->> 'unit_mismatch' = 'true'
                   AND jsonb_typeof(d.cell -> 'value') = 'number'
                ON CONFLICT (lab_analysis_id, value_type_id) DO NOTHING;");

            // ── 6. Baho (flag) — bemor jinsiga qarab; jinsi noma'lum bo'lsa
            //    ikkala me'yorning birlashmasi (frontend `evaluate` bilan bir xil)
            migrationBuilder.Sql(@"
                UPDATE lab_analysis_values v
                   SET flag = CASE
                        WHEN v.unit_mismatch OR v.value IS NULL THEN NULL
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
                  ) s
                 WHERE s.id = v.id AND v.flag IS NULL;");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP TABLE IF EXISTS lab_analysis_values;");
            foreach (var r in NewTypes)
            {
                migrationBuilder.Sql(
                    $"DELETE FROM lab_value_types WHERE column_name = {S(r.Col)};");
            }
            migrationBuilder.Sql(@"
                DROP INDEX IF EXISTS ux_lab_value_types_column_name;
                ALTER TABLE lab_value_types DROP COLUMN IF EXISTS ai_hint;
                ALTER TABLE lab_value_types DROP COLUMN IF EXISTS sort_order;
                ALTER TABLE lab_value_types DROP COLUMN IF EXISTS value_kind;
                ALTER TABLE lab_value_types DROP COLUMN IF EXISTS category;");
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
