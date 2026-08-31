/**
 * AI tahlil natijasining jiddiylik darajasini xavfsiz aniqlash.
 *
 * Ilgari kod bo'ylab quyidagi naqsh ishlatilardi:
 *
 *   String(result.automatic_analysis_bool).indexOf('1') !== -1 ? 'normal'
 *   : String(...).indexOf('2') !== -1 ? 'average'
 *   : String(...).indexOf('3') !== -1 ? 'danger' : 'unknown'
 *
 * Bu qiymatni taqqoslash emas, matn ichidan belgi qidirish edi. Tekshirish
 * tartibi 1 → 2 → 3 bo'lgani uchun tarkibida `1` bo'lgan HAR QANDAY qiymat
 * birinchi bo'lib "Normal" (yashil) deb baholanardi:
 *
 *   "13"          → Normal (aslida xavfli)
 *   "1-3 daraja"  → Normal
 *   31            → Normal
 *
 * AI javobi erkin matn generatsiyasi bo'lgani uchun bunday qiymatlar real
 * ehtimol. Tibbiy tizimda "xato tomonga xavfsiz" prinsipi amal qilishi kerak:
 * noaniq bo'lsa "baholanmadi" ko'rsatilsin, hech qachon "normal" emas.
 */

export const SEVERITY = {
    NORMAL: 'normal',
    AVERAGE: 'average',
    DANGER: 'danger',
    UNKNOWN: 'unknown',
};

/**
 * `automatic_analysis_bool` qiymatidan jiddiylik darajasini aniqlaydi.
 * QAT'IY raqamli taqqoslash — faqat 1, 2 yoki 3 qabul qilinadi.
 *
 * @param {*} raw AI qaytargan qiymat (son yoki satr)
 * @returns {'normal'|'average'|'danger'|'unknown'}
 */
export function parseSeverity(raw) {
    if (raw === null || raw === undefined || raw === '') return SEVERITY.UNKNOWN;

    const text = String(raw).trim();
    // Faqat butun son bo'lsa qabul qilamiz: "2" ha, "2 daraja" yo'q
    if (!/^-?\d+$/.test(text)) return SEVERITY.UNKNOWN;

    switch (Number(text)) {
        case 1: return SEVERITY.NORMAL;
        case 2: return SEVERITY.AVERAGE;
        case 3: return SEVERITY.DANGER;
        default: return SEVERITY.UNKNOWN;
    }
}

/** Ant Design `Tag` uchun rang. Noaniq holat kulrang — hech qachon yashil emas. */
export function severityColor(raw) {
    switch (parseSeverity(raw)) {
        case SEVERITY.NORMAL: return 'green';
        case SEVERITY.AVERAGE: return 'gold';
        case SEVERITY.DANGER: return 'red';
        default: return 'default';
    }
}

/** Eski CSS klass nomlari bilan moslik uchun. */
export function severityClass(raw) {
    switch (parseSeverity(raw)) {
        case SEVERITY.NORMAL: return 'normal_analyse';
        case SEVERITY.AVERAGE: return 'avarage_analyse';
        case SEVERITY.DANGER: return 'danger_analyse';
        default: return 'unknown_analyse';
    }
}

/** Foydalanuvchiga ko'rsatiladigan matn (i18n kaliti orqali). */
export function severityLabel(raw, t) {
    switch (parseSeverity(raw)) {
        case SEVERITY.NORMAL: return t('normal', { defaultValue: 'Normal' });
        case SEVERITY.AVERAGE: return t('avarage', { defaultValue: "O'rtacha" });
        case SEVERITY.DANGER: return t('danger', { defaultValue: 'Xavfli' });
        default: return t('severity_unknown', { defaultValue: 'Baholanmadi' });
    }
}

/** Ikonka — matnli belgi (emoji) ko'rinishida. */
export function severityIcon(raw) {
    switch (parseSeverity(raw)) {
        case SEVERITY.NORMAL: return '✅';
        case SEVERITY.AVERAGE: return '⚠️';
        case SEVERITY.DANGER: return '❌';
        default: return '➖';
    }
}
