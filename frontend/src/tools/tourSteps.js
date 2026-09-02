/**
 * Kabinet sahifalari uchun interaktiv qo'llanma (Tour) qadamlari.
 *
 * Har bir qadam CSS selektor bilan bog'lanadi — sahifa kodida tegishli
 * elementga `data-tour="..."` atributi qo'yiladi. Elementi topilmagan qadam
 * `PageTour` tomonidan avtomatik o'tkazib yuboriladi, shuning uchun rolga
 * qarab ko'rinmaydigan tugmalar turni buzmaydi.
 *
 * Matnlar i18n kalitlari orqali — uch tilda (`tour_*` kalitlari).
 */

/**
 * Tahlil ro'yxati sahifalari (EKG / Holter / SMAD / Laboratoriya) uchun umumiy qadamlar.
 *
 * Ataylab funksiya emas, o'zgarmas massiv: `PageTour` uni bog'liqlik sifatida
 * ishlatadi va har renderda yangi massiv yaratilsa cheksiz qayta render bo'ladi.
 */
export const analysisListTour = [
    {
        selector: '[data-tour="analysis-new"]',
        titleKey: 'tour_analysis_new_title',
        titleFallback: 'Yangi tahlil qo\'shish',
        descKey: 'tour_analysis_new_desc',
        descFallback: 'Yangi tahlil yaratish uchun shu tugmani bosing: bemorni tanlaysiz, faylni yuklaysiz va AI tahlilini ishga tushirasiz.',
    },
    {
        selector: '[data-tour="analysis-search"]',
        titleKey: 'tour_analysis_search_title',
        titleFallback: 'Bemorni qidirish',
        descKey: 'tour_analysis_search_desc',
        descFallback: 'Bemorning ismi yoki passport seriyasini yozing. Qidiruv ishga tushishi uchun "Qidirish" tugmasini bosing.',
    },
    {
        selector: '[data-tour="analysis-date"]',
        titleKey: 'tour_analysis_date_title',
        titleFallback: 'Sana bo\'yicha filtr',
        descKey: 'tour_analysis_date_desc',
        descFallback: 'Faqat ma\'lum davrda yuklangan tahlillarni ko\'rish uchun boshlanish va tugash sanasini tanlang.',
    },
    {
        selector: '[data-tour="analysis-status"]',
        titleKey: 'tour_analysis_status_title',
        titleFallback: 'Tahlil holati',
        descKey: 'tour_analysis_status_desc',
        descFallback: 'Holat AI ishining bosqichini bildiradi: "Kutmoqda" — hali yuborilmagan, "AI tahlil qilmoqda" — jarayonda, "Tayyor" — natija bor, "Fayl mos emas" — noto\'g\'ri fayl yuklangan, "Xatolik" — qayta urinish kerak.',
    },
    {
        selector: '[data-tour="analysis-ai-filter"]',
        titleKey: 'tour_analysis_ai_title',
        titleFallback: 'AI xulosasi va ranglar',
        descKey: 'tour_analysis_ai_desc',
        descFallback: 'Yashil — norma, sariq — o\'rtacha (kuzatuv kerak), qizil — xavfli (shoshilinch e\'tibor). "Baholanmadi" kulrang bo\'ladi: AI daraja bermagan, xulosani shifokor o\'qib chiqishi shart.',
    },
    {
        selector: '[data-tour="analysis-table"]',
        titleKey: 'tour_analysis_table_title',
        titleFallback: 'Tahlilni ochish',
        descKey: 'tour_analysis_table_desc',
        descFallback: 'Qatorni bosing — tahlil natijasi, AI xulosasi, tavsiyalar va PDF hujjatni yuklab olish sahifasi ochiladi.',
    },
    {
        selector: '[data-tour="analysis-delete"]',
        titleKey: 'tour_analysis_delete_title',
        titleFallback: 'Tahlilni o\'chirish',
        descKey: 'tour_analysis_delete_desc',
        descFallback: 'Noto\'g\'ri bemorga biriktirilgan yoki xato fayl bilan yaratilgan tahlilni o\'chirish mumkin. Sabab majburiy — yozuv bazadan butunlay o\'chirilmaydi va zarurat bo\'lsa tiklanadi.',
    },
]

/** Asosiy panel (Dashboard). */
export const dashboardTour = [
    {
        selector: '[data-tour="dash-stats"]',
        titleKey: 'tour_dash_stats_title',
        titleFallback: 'Statistika kartochkalari',
        descKey: 'tour_dash_stats_desc',
        descFallback: 'Katta raqam — bugungi ko\'rsatkich, ostidagi "Jami" — butun davr uchun. Kartochkani bosib tegishli ro\'yxatga o\'tasiz.',
    },
    {
        selector: '[data-tour="dash-menu"]',
        titleKey: 'tour_dash_menu_title',
        titleFallback: 'Yon menyu',
        descKey: 'tour_dash_menu_desc',
        descFallback: 'Bo\'limlar shu yerda. Menyu bandidagi qizil raqam — siz hali ko\'rmagan yangi tahlillar soni.',
    },
    {
        selector: '[data-tour="dash-lang"]',
        titleKey: 'tour_dash_lang_title',
        titleFallback: 'Tilni almashtirish',
        descKey: 'tour_dash_lang_desc',
        descFallback: 'Interfeys va AI xulosalari tili: o\'zbek, rus yoki ingliz. Tanlov keyingi kirishda ham saqlanadi.',
    },
]

/** Yangi tahlil yaratish (Analyzer) sahifalari. */
export const analyzerTour = [
    {
        selector: '[data-tour="analyzer-patient"]',
        titleKey: 'tour_analyzer_patient_title',
        titleFallback: '1-qadam: bemorni topish',
        descKey: 'tour_analyzer_patient_desc',
        descFallback: 'Passport seriyasi va tug\'ilgan sanani kiriting. Bemor bazada bo\'lsa ma\'lumotlari avtomatik to\'ldiriladi; topilmasa yangi bemor sifatida kiritasiz.',
    },
    {
        selector: '[data-tour="analyzer-file"]',
        titleKey: 'tour_analyzer_file_title',
        titleFallback: '2-qadam: faylni yuklash',
        descKey: 'tour_analyzer_file_desc',
        descFallback: 'Fayl shu tahlil turiga mos bo\'lishi shart. Rasm aniq va yozuvlar o\'qiladigan bo\'lsin — xira yoki juda kichik rasm rad etiladi. Noto\'g\'ri tur yuklansa AI xulosa yozmaydi, faylni almashtirish taklif qilinadi.',
    },
    {
        selector: '[data-tour="analyzer-doctors"]',
        titleKey: 'tour_analyzer_doctors_title',
        titleFallback: '3-qadam: davolovchi shifokorlar',
        descKey: 'tour_analyzer_doctors_desc',
        descFallback: 'Bu yerda belgilangan shifokorlargina tahlilni o\'z kabinetida ko\'radi va unga xulosa yoza oladi. Bo\'sh qoldirilsa tahlil hech kimning ro\'yxatiga tushmaydi.',
    },
    {
        selector: '[data-tour="analyzer-complaints"]',
        titleKey: 'tour_analyzer_complaints_title',
        titleFallback: '4-qadam: shikoyatlar',
        descKey: 'tour_analyzer_complaints_desc',
        descFallback: 'Bemor shikoyatlari AI ga kontekst beradi va xulosaning aniqligini oshiradi. Iloji boricha to\'ldiring.',
    },
    {
        selector: '[data-tour="analyzer-submit"]',
        titleKey: 'tour_analyzer_submit_title',
        titleFallback: '5-qadam: saqlash yoki AI tahlili',
        descKey: 'tour_analyzer_submit_desc',
        descFallback: '"Faqat saqlash" — yozuv yaratiladi, AI ishga tushmaydi (keyinroq yuborish mumkin). "AI bilan tahlil" — fayl darhol sun\'iy intellektga yuboriladi va natija bir necha daqiqada tayyor bo\'ladi.',
    },
]

/** Tahlil natijasi sahifasi. */
export const analysisViewTour = [
    {
        selector: '[data-tour="view-severity"]',
        titleKey: 'tour_view_severity_title',
        titleFallback: 'Jiddiylik darajasi',
        descKey: 'tour_view_severity_desc',
        descFallback: 'AI xulosasining rangi: yashil — norma, sariq — o\'rtacha, qizil — xavfli. "Baholanmadi" bo\'lsa AI aniq daraja bermagan — xulosani albatta o\'qib chiqing.',
    },
    {
        selector: '[data-tour="view-measurements"]',
        titleKey: 'tour_view_measurements_title',
        titleFallback: 'Raqamli o\'lchovlar',
        descKey: 'tour_view_measurements_desc',
        descFallback: 'AI fayldan o\'qigan ko\'rsatkichlar. Ular xulosaning asosi — shubha tug\'ilsa asl fayl bilan solishtiring.',
    },
    {
        selector: '[data-tour="view-conclusion"]',
        titleKey: 'tour_view_conclusion_title',
        titleFallback: 'Shifokor xulosasi',
        descKey: 'tour_view_conclusion_desc',
        descFallback: 'AI xulosasi yordamchi vosita — yakuniy tashxisni shifokor qo\'yadi. O\'z xulosangizni shu yerda yozing.',
    },
    {
        selector: '[data-tour="view-download"]',
        titleKey: 'tour_view_download_title',
        titleFallback: 'PDF hujjat',
        descKey: 'tour_view_download_desc',
        descFallback: 'Bemorga beriladigan rasmiy hujjat. Undagi QR kod orqali hujjatning haqiqiyligini tekshirish mumkin — soxtalashtirishdan himoya qiladi.',
    },
]

/** Xodimlar sahifasi. */
export const doctorsTour = [
    {
        selector: '[data-tour="doctors-add"]',
        titleKey: 'tour_doctors_add_title',
        titleFallback: 'Yangi xodim qo\'shish',
        descKey: 'tour_doctors_add_desc',
        descFallback: 'Xodim qo\'shganda unga rol beriladi va kirish ma\'lumotlari yaratiladi.',
    },
    {
        selector: '[data-tour="doctors-table"]',
        titleKey: 'tour_doctors_roles_title',
        titleFallback: 'Rollar va huquqlar',
        descKey: 'tour_doctors_roles_desc',
        descFallback: 'Admin va Direktor — shifoxonaning barcha tahlillarini ko\'radi va xodimlarni boshqaradi. Shifokor — faqat o\'ziga biriktirilgan tahlillarni. Hamshira — faqat o\'zi yaratgan tahlillarni.',
    },
]

/** Bemorlar ro'yxati. */
export const patientsTour = [
    {
        selector: '[data-tour="patients-search"]',
        titleKey: 'tour_patients_search_title',
        titleFallback: 'Bemorni qidirish',
        descKey: 'tour_patients_search_desc',
        descFallback: 'Ism, familiya yoki telefon raqami bo\'yicha qidiring.',
    },
    {
        selector: '[data-tour="patients-table"]',
        titleKey: 'tour_patients_card_title',
        titleFallback: 'Bemor kartasi',
        descKey: 'tour_patients_card_desc',
        descFallback: 'Qatorni bosing — bemorning barcha tahlillari (EKG, Holter, SMAD, laboratoriya, xulosalar) yagona xronologik ro\'yxatda ochiladi. Passport maxfiylik uchun to\'liq ko\'rsatilmaydi.',
    },
]

/** Bemor kartasi. */
export const patientCardTour = [
    {
        selector: '[data-tour="card-info"]',
        titleKey: 'tour_card_info_title',
        titleFallback: 'Bemor ma\'lumotlari',
        descKey: 'tour_card_info_desc',
        descFallback: 'Shaxsiy ma\'lumotlar. Passport seriyasi maxfiylik talabi bo\'yicha qisman yashiriladi.',
    },
    {
        selector: '[data-tour="card-counts"]',
        titleKey: 'tour_card_counts_title',
        titleFallback: 'Tahlillar soni',
        descKey: 'tour_card_counts_desc',
        descFallback: 'Turlar bo\'yicha nechta tahlil borligi. Siz ko\'ra oladigan yozuvlargina hisoblanadi.',
    },
    {
        selector: '[data-tour="card-timeline"]',
        titleKey: 'tour_card_timeline_title',
        titleFallback: 'Tahlillar tarixi',
        descKey: 'tour_card_timeline_desc',
        descFallback: 'Barcha tahlillar bitta lentada, yangisi yuqorida. Qatorni bosib tahlilni to\'liq ko\'rishingiz mumkin.',
    },
]

/** Tashkilot ma'lumotlari. */
export const clinicInfoTour = [
    {
        selector: '[data-tour="clinic-main"]',
        titleKey: 'tour_clinic_main_title',
        titleFallback: 'Shifoxona ma\'lumotlari',
        descKey: 'tour_clinic_main_desc',
        descFallback: 'Bu ma\'lumotlar bemorga beriladigan PDF hujjatning sarlavhasida chiqadi — to\'liq va to\'g\'ri to\'ldiring.',
    },
    {
        selector: '[data-tour="clinic-logo"]',
        titleKey: 'tour_clinic_logo_title',
        titleFallback: 'Logotip va litsenziya',
        descKey: 'tour_clinic_logo_desc',
        descFallback: 'Logotip hujjat sarlavhasida ishlatiladi. Litsenziya nusxasi shifoxonaning faoliyat huquqini tasdiqlaydi.',
    },
    {
        selector: '[data-tour="clinic-phones"]',
        titleKey: 'tour_clinic_phones_title',
        titleFallback: 'Telefon raqamlar',
        descKey: 'tour_clinic_phones_desc',
        descFallback: 'Bemor bog\'lanishi uchun raqamlar. Ular ham hujjatda ko\'rsatiladi.',
    },
]
