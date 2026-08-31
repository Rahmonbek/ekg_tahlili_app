import ruRU from 'antd/locale/ru_RU';
import enUS from 'antd/locale/en_US';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import 'dayjs/locale/en';

/**
 * Ant Design komponentlarining ichki matnlari uchun locale.
 *
 * Ilgari `ConfigProvider` ga `locale` berilmagan edi va antd ning barcha
 * ichki matnlari INGLIZ tilida qolardi, interfeys o'zbek yoki rus tilida
 * bo'lsa ham: "No data", "items per page", "Today", "OK", "Cancel",
 * DatePicker dagi oy nomlari va hokazo.
 *
 * O'zbek tili uchun antd da rasmiy locale yo'q — shuning uchun uni
 * `en_US` asosida qo'lda tuzamiz.
 */

/** O'zbekcha locale — antd `en_US` strukturasi asosida. */
const uzUZ = {
    ...enUS,
    locale: 'uz',
    Pagination: {
        ...enUS.Pagination,
        items_per_page: '/ sahifa',
        jump_to: "O'tish",
        jump_to_confirm: 'tasdiqlash',
        page: '-sahifa',
        prev_page: 'Oldingi sahifa',
        next_page: 'Keyingi sahifa',
        prev_5: 'Oldingi 5 sahifa',
        next_5: 'Keyingi 5 sahifa',
        prev_3: 'Oldingi 3 sahifa',
        next_3: 'Keyingi 3 sahifa',
    },
    Table: {
        ...enUS.Table,
        filterTitle: 'Filtr',
        filterConfirm: 'OK',
        filterReset: 'Tozalash',
        filterEmptyText: 'Filtr yo‘q',
        selectAll: 'Joriy sahifani tanlash',
        selectInvert: 'Tanlovni teskarisiga o‘zgartirish',
        selectNone: 'Tanlovni bekor qilish',
        selectionAll: 'Barchasini tanlash',
        sortTitle: 'Saralash',
        expand: 'Ochish',
        collapse: 'Yopish',
        triggerDesc: 'Kamayish bo‘yicha saralash',
        triggerAsc: 'O‘sish bo‘yicha saralash',
        cancelSort: 'Saralashni bekor qilish',
        emptyText: 'Ma‘lumot yo‘q',
    },
    Modal: {
        ...enUS.Modal,
        okText: 'OK',
        cancelText: 'Bekor qilish',
        justOkText: 'OK',
    },
    Popconfirm: {
        ...enUS.Popconfirm,
        okText: 'Ha',
        cancelText: 'Yo‘q',
    },
    Empty: { description: 'Ma‘lumot yo‘q' },
    Text: { edit: 'Tahrirlash', copy: 'Nusxalash', copied: 'Nusxalandi', expand: 'Ochish' },
    Upload: {
        ...enUS.Upload,
        uploading: 'Yuklanmoqda…',
        removeFile: 'Faylni o‘chirish',
        uploadError: 'Yuklashda xatolik',
        previewFile: 'Faylni ko‘rish',
        downloadFile: 'Faylni yuklab olish',
    },
    Select: { notFoundContent: 'Topilmadi' },
    // Rasm ustiga sichqoncha kelganda chiqadigan yozuv — busiz "Preview"
    Image: { preview: 'Kattalashtirib ko‘rish' },
    Form: {
        ...enUS.Form,
        optional: '(ixtiyoriy)',
        defaultValidateMessages: {
            ...enUS.Form.defaultValidateMessages,
            default: 'Maydon tekshiruvdan o‘tmadi',
            required: 'Bu maydon to‘ldirilishi shart',
            enum: 'Qiymat quyidagilardan biri bo‘lishi kerak: ${enum}',
            whitespace: 'Maydon bo‘sh bo‘lishi mumkin emas',
        },
    },
    // Ant Design `Tour` navigatsiya tugmalari — busiz ular ingliz tilida qolardi
    Tour: {
        ...enUS.Tour,
        Next: 'Keyingisi',
        Previous: 'Oldingisi',
        Finish: 'Tugatish',
    },
    DatePicker: {
        ...enUS.DatePicker,
        lang: {
            ...enUS.DatePicker.lang,
            today: 'Bugun',
            now: 'Hozir',
            ok: 'OK',
            clear: 'Tozalash',
            month: 'Oy',
            year: 'Yil',
            placeholder: 'Sanani tanlang',
            rangePlaceholder: ['Boshlanish sanasi', 'Tugash sanasi'],
            monthPlaceholder: 'Oyni tanlang',
            yearPlaceholder: 'Yilni tanlang',
            shortWeekDays: ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'],
            shortMonths: ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn',
                          'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'],
        },
    },
};

const LOCALES = { uz: uzUZ, ru: ruRU, en: enUS };
const DAYJS_LOCALES = { uz: 'en', ru: 'ru', en: 'en' }; // dayjs da uz-latn barqaror emas

/** Til kodiga mos antd locale ni qaytaradi. */
export function getAntdLocale(language) {
    return LOCALES[language] || uzUZ;
}

/** dayjs locale ni ham til bilan birga sozlaydi (DatePicker formatlari uchun). */
export function applyDayjsLocale(language) {
    dayjs.locale(DAYJS_LOCALES[language] || 'en');
}

export default getAntdLocale;
