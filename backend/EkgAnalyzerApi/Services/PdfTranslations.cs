namespace EkgAnalyzerApi.Services;

/// <summary>
/// PDF hujjatlar uchun ko'p tilli lug'at (uz/ru/en).
/// Barcha tahlil turlari uchun umumiy kalit-qiymat juftliklari.
/// </summary>
public static class PdfTranslations
{
    public static Dictionary<string, string> Get(string lang) =>
        lang.ToLower() switch
        {
            "ru" => Russian,
            "en" => English,
            _    => Uzbek
        };

    // ──────────────────────────────────────────────────────────────
    // O'ZBEK
    // ──────────────────────────────────────────────────────────────
    private static readonly Dictionary<string, string> Uzbek = new()
    {
        // Sarlavhalar
        ["doc_title"]               = "TIBBIY DIAGNOSTIKA XULOSASI",
        ["ecg_title"]               = "EKG TAHLILI NATIJALARI",
        ["smad_title"]              = "SMAD NATIJALARI (SUTKALI QON BOSIMI)",
        ["holter_title"]            = "HOLTER MONITORING NATIJALARI",
        ["lab_title"]               = "LABORATORIYA TAHLILI NATIJALARI",
        ["parasitology_title"]      = "PARAZITOLOGIK TAHLIL NATIJALARI",

        // Bemor ma'lumotlari bloki
        ["patient_info"]            = "BEMOR MA'LUMOTLARI",
        ["fio"]                     = "Familiya, ism, sharif",
        ["birth_date"]              = "Tug'ilgan sana",
        ["age_suffix"]              = "yosh",
        ["gender"]                  = "Jinsi",
        ["gender_male"]             = "Erkak",
        ["gender_female"]           = "Ayol",
        ["passport"]                = "Passport",
        ["address"]                 = "Manzil",
        ["phone"]                   = "Telefon",

        // Tahlil bloki
        ["analysis_info"]           = "TAHLIL MA'LUMOTLARI",
        ["analysis_date"]           = "Tahlil sanasi",
        ["analysis_type"]           = "Tahlil turi",
        ["device"]                  = "Uskunа",
        ["device_value"]            = "AI yordamida avtomatik tahlil",
        ["created_by"]              = "Kiritgan xodim",
        ["treating_doctors"]        = "Davolovchi shifokor(lar)",
        ["complaints"]              = "Shikoyatlar",

        // Natijalar
        ["results_title"]           = "TAHLIL NATIJALARI",
        ["parameter"]               = "Parametr",
        ["value"]                   = "Qiymat",
        ["normal_range"]            = "Norma",
        ["assessment"]              = "Baho",
        ["normal_ok"]               = "Normal",
        ["borderline"]              = "Chegarada",
        ["above_normal"]            = "Normadan yuqori",
        ["below_normal"]            = "Normadan past",

        // AI xulosa
        ["ai_section_title"]        = "SUN'IY INTELLEKT TAHLILI XULOSASI",
        ["severity"]                = "Jiddiylik darajasi",
        ["severity_mild"]           = "Yengil",
        ["severity_moderate"]       = "O'rtacha",
        ["severity_severe"]         = "Og'ir",
        ["recommendations"]         = "Shifokorga tavsiyalar",
        ["ai_analysis"]             = "Tahlil xulosasi",
        ["final_summary"]           = "Yakuniy xulosa",
        ["not_analyzed"]            = "Tahlil hali amalga oshirilmagan",

        // EKG parametrlar
        ["hr"]                      = "Yurak urish tezligi",
        ["pr_interval"]             = "PR interval",
        ["qrs_duration"]            = "QRS davomiyligi",
        ["qt_interval"]             = "QT interval",
        ["qtc_bazett"]              = "QTc (Bazett)",
        ["st_segment"]              = "ST segment",
        ["sokolow_lyon"]            = "Sokolow-Lyon indeksi",
        ["ecg_image_not_available"] = "EKG grafigi mavjud emas",
        ["ecg_source_file"]         = "Yuklangan manba fayli",

        // Laboratoriya
        ["lab_param_unit"]          = "Birlik",
        ["lab_param_note"]          = "Eslatma",

        // Parazitologiya
        ["para_helminth_type"]      = "Gijja turi",
        ["para_latin_name"]         = "Lotin nomi",
        ["para_confidence"]         = "Ishonch darajasi",
        ["para_level"]              = "Infektsiya darajasi",
        ["para_worm_found"]         = "Gijja topildimi",
        ["para_detected_types"]     = "Aniqlangan turlar",
        ["para_type_name"]          = "Tur nomi",
        ["para_egg_count_short"]    = "Tuxum soni",
        ["para_adult_present"]      = "Voyaga yetgan",
        ["para_morphology"]         = "Tuxum morfologiyasi",
        ["para_total_eggs"]         = "Jami tuxum soni",
        ["para_total_severity"]     = "Jami jiddiylik",
        ["para_image_quality"]      = "Rasm sifati",
        ["para_treatment"]          = "Davolash tavsiyasi",
        ["para_additional_note"]    = "Qo'shimcha izoh",
        ["para_method"]             = "Buyatkovka usuli",
        ["para_magnification"]      = "Kattalashtirish",
        ["para_egg_count"]          = "Ko'rish maydonidagi tuxum soni",
        ["para_image_not_available"]= "Mikroskop rasmi mavjud emas",
        ["para_no_parasites"]       = "Parazitlar aniqlanmadi",

        ["yes"]                     = "Ha",
        ["no"]                      = "Yo'q",

        // SMAD
        ["smad_daytime_systolic"]   = "Kunduzi sistolik",
        ["smad_daytime_diastolic"]  = "Kunduzi diastolik",
        ["smad_night_systolic"]     = "Tunda sistolik",
        ["smad_night_diastolic"]    = "Tunda diastolik",
        ["smad_pulse_pressure"]     = "Impuls bosimi",

        // NMED tasdiqlash
        ["not_assigned"]            = "Belgilanmagan",
        ["nmed_verified"]           = "NMED platformasi orqali rasman tasdiqlangan",
        ["verified_at"]             = "Tasdiqlangan",

        // Shifokor tashxisi
        ["doctor_diagnosis_title"]  = "SHIFOKOR TASHXISI",
        ["diagnosed_by"]            = "Tashxis qo'ygan shifokor",
        ["diagnosed_at"]            = "Tashxis sanasi",

        // Ogohlantirish
        ["disclaimer"] =
            "DIQQAT: Ushbu xulosa sun'iy intellekt tomonidan shakllantirilgan va " +
            "shifokor xulosasini ALMASHTIRMAYDI. Yakuniy tashxis faqat malakali " +
            "shifokor tomonidan qo'yiladi.",

        // Footer
        ["footer_platform"]         = "NMED Milliy tibbiy diagnostika platformasi",
        ["footer_page"]             = "Sahifa",
        ["footer_of"]               = "/",
        ["doc_number_prefix"]       = "Hujjat raqami",

        // Boshqalar
        ["no_info"]                 = "Ma'lumot mavjud emas",
        ["combined_title"]          = "BARCHA TAHLILLAR YIG'MA HISOBOTI",
    };

    // ──────────────────────────────────────────────────────────────
    // РУССКИЙ
    // ──────────────────────────────────────────────────────────────
    private static readonly Dictionary<string, string> Russian = new()
    {
        ["doc_title"]               = "МЕДИЦИНСКОЕ ДИАГНОСТИЧЕСКОЕ ЗАКЛЮЧЕНИЕ",
        ["ecg_title"]               = "РЕЗУЛЬТАТЫ ЭКГ АНАЛИЗА",
        ["smad_title"]              = "РЕЗУЛЬТАТЫ СМАД (СУТОЧНЫЙ МОНИТОРИНГ АД)",
        ["holter_title"]            = "РЕЗУЛЬТАТЫ ХОЛТЕР МОНИТОРИНГА",
        ["lab_title"]               = "РЕЗУЛЬТАТЫ ЛАБОРАТОРНОГО АНАЛИЗА",
        ["parasitology_title"]      = "РЕЗУЛЬТАТЫ ПАРАЗИТОЛОГИЧЕСКОГО АНАЛИЗА",

        ["patient_info"]            = "ДАННЫЕ ПАЦИЕНТА",
        ["fio"]                     = "Фамилия, имя, отчество",
        ["birth_date"]              = "Дата рождения",
        ["age_suffix"]              = "лет",
        ["gender"]                  = "Пол",
        ["gender_male"]             = "Мужской",
        ["gender_female"]           = "Женский",
        ["passport"]                = "Паспорт",
        ["address"]                 = "Адрес",
        ["phone"]                   = "Телефон",

        ["analysis_info"]           = "ДАННЫЕ АНАЛИЗА",
        ["analysis_date"]           = "Дата анализа",
        ["analysis_type"]           = "Тип анализа",
        ["device"]                  = "Оборудование",
        ["device_value"]            = "Автоматический анализ с помощью ИИ",
        ["created_by"]              = "Внесённый сотрудник",
        ["treating_doctors"]        = "Лечащий врач(и)",
        ["complaints"]              = "Жалобы",

        ["results_title"]           = "РЕЗУЛЬТАТЫ АНАЛИЗА",
        ["parameter"]               = "Параметр",
        ["value"]                   = "Значение",
        ["normal_range"]            = "Норма",
        ["assessment"]              = "Оценка",
        ["normal_ok"]               = "Норма",
        ["borderline"]              = "Пограничное",
        ["above_normal"]            = "Выше нормы",
        ["below_normal"]            = "Ниже нормы",

        ["ai_section_title"]        = "ЗАКЛЮЧЕНИЕ ИСКУССТВЕННОГО ИНТЕЛЛЕКТА",
        ["severity"]                = "Степень тяжести",
        ["severity_mild"]           = "Лёгкая",
        ["severity_moderate"]       = "Средняя",
        ["severity_severe"]         = "Тяжёлая",
        ["recommendations"]         = "Рекомендации врачу",
        ["ai_analysis"]             = "Заключение анализа",
        ["final_summary"]           = "Итоговое заключение",
        ["not_analyzed"]            = "Анализ ещё не выполнен",

        ["hr"]                      = "Частота сердечных сокращений",
        ["pr_interval"]             = "Интервал PR",
        ["qrs_duration"]            = "Длительность QRS",
        ["qt_interval"]             = "Интервал QT",
        ["qtc_bazett"]              = "QTc (Bazett)",
        ["st_segment"]              = "Сегмент ST",
        ["sokolow_lyon"]            = "Индекс Соколова-Лайона",
        ["ecg_image_not_available"] = "График ЭКГ недоступен",
        ["ecg_source_file"]         = "Загруженный исходный файл",

        ["lab_param_unit"]          = "Единица",
        ["lab_param_note"]          = "Примечание",

        ["para_helminth_type"]      = "Вид гельминта",
        ["para_latin_name"]         = "Латинское название",
        ["para_confidence"]         = "Уверенность",
        ["para_level"]              = "Уровень инфекции",
        ["para_worm_found"]         = "Обнаружены ли гельминты",
        ["para_detected_types"]     = "Обнаруженные виды",
        ["para_type_name"]          = "Название вида",
        ["para_egg_count_short"]    = "Кол-во яиц",
        ["para_adult_present"]      = "Взрослая особь",
        ["para_morphology"]         = "Морфология яиц",
        ["para_total_eggs"]         = "Общее количество яиц",
        ["para_total_severity"]     = "Общая тяжесть",
        ["para_image_quality"]      = "Качество изображения",
        ["para_treatment"]          = "Рекомендации по лечению",
        ["para_additional_note"]    = "Дополнительное примечание",
        ["para_method"]             = "Метод окраски",
        ["para_magnification"]      = "Увеличение",
        ["para_egg_count"]          = "Яиц в поле зрения",
        ["para_image_not_available"]= "Изображение микроскопа недоступно",
        ["para_no_parasites"]       = "Паразиты не обнаружены",

        ["yes"]                     = "Да",
        ["no"]                      = "Нет",

        ["smad_daytime_systolic"]   = "Дневное систолическое",
        ["smad_daytime_diastolic"]  = "Дневное диастолическое",
        ["smad_night_systolic"]     = "Ночное систолическое",
        ["smad_night_diastolic"]    = "Ночное диастолическое",
        ["smad_pulse_pressure"]     = "Пульсовое давление",

        ["not_assigned"]            = "Не назначен",
        ["nmed_verified"]           = "Официально подтверждено через платформу NMED",
        ["verified_at"]             = "Подтверждено",

        ["doctor_diagnosis_title"]  = "ДИАГНОЗ ВРАЧА",
        ["diagnosed_by"]            = "Диагноз поставил",
        ["diagnosed_at"]            = "Дата диагноза",

        ["disclaimer"] =
            "ВНИМАНИЕ: Данное заключение сформировано искусственным интеллектом и " +
            "НЕ ЗАМЕНЯЕТ заключение врача. Окончательный диагноз ставится только " +
            "квалифицированным врачом.",

        ["footer_platform"]         = "NMED Национальная медицинская диагностическая платформа",
        ["footer_page"]             = "Страница",
        ["footer_of"]               = "/",
        ["doc_number_prefix"]       = "Номер документа",

        ["no_info"]                 = "Информация недоступна",
        ["combined_title"]          = "СВОДНЫЙ ОТЧЁТ ПО ВСЕМ АНАЛИЗАМ",
    };

    // ──────────────────────────────────────────────────────────────
    // ENGLISH
    // ──────────────────────────────────────────────────────────────
    private static readonly Dictionary<string, string> English = new()
    {
        ["doc_title"]               = "MEDICAL DIAGNOSTIC REPORT",
        ["ecg_title"]               = "ECG ANALYSIS RESULTS",
        ["smad_title"]              = "ABPM RESULTS (24-HOUR BLOOD PRESSURE MONITORING)",
        ["holter_title"]            = "HOLTER MONITORING RESULTS",
        ["lab_title"]               = "LABORATORY TEST RESULTS",
        ["parasitology_title"]      = "PARASITOLOGICAL EXAMINATION RESULTS",

        ["patient_info"]            = "PATIENT INFORMATION",
        ["fio"]                     = "Full Name",
        ["birth_date"]              = "Date of Birth",
        ["age_suffix"]              = "years",
        ["gender"]                  = "Gender",
        ["gender_male"]             = "Male",
        ["gender_female"]           = "Female",
        ["passport"]                = "Passport",
        ["address"]                 = "Address",
        ["phone"]                   = "Phone",

        ["analysis_info"]           = "ANALYSIS DETAILS",
        ["analysis_date"]           = "Analysis Date",
        ["analysis_type"]           = "Analysis Type",
        ["device"]                  = "Equipment",
        ["device_value"]            = "Automated AI-assisted analysis",
        ["created_by"]              = "Submitted by",
        ["treating_doctors"]        = "Treating Doctor(s)",
        ["complaints"]              = "Complaints",

        ["results_title"]           = "ANALYSIS RESULTS",
        ["parameter"]               = "Parameter",
        ["value"]                   = "Value",
        ["normal_range"]            = "Normal Range",
        ["assessment"]              = "Assessment",
        ["normal_ok"]               = "Normal",
        ["borderline"]              = "Borderline",
        ["above_normal"]            = "Above Normal",
        ["below_normal"]            = "Below Normal",

        ["ai_section_title"]        = "ARTIFICIAL INTELLIGENCE ANALYSIS REPORT",
        ["severity"]                = "Severity Level",
        ["severity_mild"]           = "Mild",
        ["severity_moderate"]       = "Moderate",
        ["severity_severe"]         = "Severe",
        ["recommendations"]         = "Recommendations for Physician",
        ["ai_analysis"]             = "Analysis Summary",
        ["final_summary"]           = "Final Conclusion",
        ["not_analyzed"]            = "Analysis has not been performed yet",

        ["hr"]                      = "Heart Rate",
        ["pr_interval"]             = "PR Interval",
        ["qrs_duration"]            = "QRS Duration",
        ["qt_interval"]             = "QT Interval",
        ["qtc_bazett"]              = "QTc (Bazett)",
        ["st_segment"]              = "ST Segment",
        ["sokolow_lyon"]            = "Sokolow-Lyon Index",
        ["ecg_image_not_available"] = "ECG chart not available",
        ["ecg_source_file"]         = "Uploaded source file",

        ["lab_param_unit"]          = "Unit",
        ["lab_param_note"]          = "Note",

        ["para_helminth_type"]      = "Helminth Type",
        ["para_latin_name"]         = "Latin Name",
        ["para_confidence"]         = "Confidence",
        ["para_level"]              = "Infection Level",
        ["para_worm_found"]         = "Worms detected",
        ["para_detected_types"]     = "Detected types",
        ["para_type_name"]          = "Type name",
        ["para_egg_count_short"]    = "Egg count",
        ["para_adult_present"]      = "Adult present",
        ["para_morphology"]         = "Egg morphology",
        ["para_total_eggs"]         = "Total egg count",
        ["para_total_severity"]     = "Total severity",
        ["para_image_quality"]      = "Image quality",
        ["para_treatment"]          = "Treatment recommendation",
        ["para_additional_note"]    = "Additional note",
        ["para_method"]             = "Staining Method",
        ["para_magnification"]      = "Magnification",
        ["para_egg_count"]          = "Eggs per Field",
        ["para_image_not_available"]= "Microscope image not available",
        ["para_no_parasites"]       = "No parasites detected",

        ["yes"]                     = "Yes",
        ["no"]                      = "No",

        ["smad_daytime_systolic"]   = "Daytime Systolic",
        ["smad_daytime_diastolic"]  = "Daytime Diastolic",
        ["smad_night_systolic"]     = "Nighttime Systolic",
        ["smad_night_diastolic"]    = "Nighttime Diastolic",
        ["smad_pulse_pressure"]     = "Pulse Pressure",

        ["not_assigned"]            = "Not assigned",
        ["nmed_verified"]           = "Officially verified via NMED platform",
        ["verified_at"]             = "Verified at",

        ["doctor_diagnosis_title"]  = "DOCTOR'S DIAGNOSIS",
        ["diagnosed_by"]            = "Diagnosed by",
        ["diagnosed_at"]            = "Diagnosis date",

        ["disclaimer"] =
            "WARNING: This report was generated by artificial intelligence and does NOT " +
            "REPLACE a physician's opinion. Final diagnosis must be made by a qualified " +
            "medical professional.",

        ["footer_platform"]         = "NMED National Medical Diagnostic Platform",
        ["footer_page"]             = "Page",
        ["footer_of"]               = "/",
        ["doc_number_prefix"]       = "Document No.",

        ["no_info"]                 = "Information not available",
        ["combined_title"]          = "COMBINED REPORT — ALL ANALYSES",
    };
}
