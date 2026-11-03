/**
 * NMED dizayn tizimi — Ant Design `ConfigProvider` uchun yagona mavzu.
 *
 * Nima uchun kerak: ilgari ranglar kod bo'ylab tarqoq edi (`#00D1B2` va
 * `#00D4AA` — ikki xil yashil), o'lchamlar esa `App.css` da `!important`
 * bilan majburlanardi. Endi antd komponentlari o'zi to'g'ri ko'rinishda
 * chiqadi va CSS bilan kurashish kerak emas.
 */

/** Brend ranglari — CSS o'zgaruvchilari bilan bir xil qiymatlar. */
export const colors = {
    primary: '#00B39A',        // asosiy firuza (yagona qiymat)
    primaryHover: '#009E88',
    primaryActive: '#008574',
    primarySoft: '#E6F7F4',

    success: '#16A34A',
    warning: '#F59E0B',
    danger: '#DC2626',
    info: '#2563EB',

    textPrimary: '#0F172A',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',

    border: '#E2E8F0',
    surface: '#FFFFFF',
    background: '#F5F8FA',
};

/** Oraliqlar shkalasi (4 px asosida). */
export const spacing = {
    xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48,
};

/** Ekran uzilish nuqtalari — komponentlar shu qiymatlarga tayanadi. */
export const breakpoints = {
    mobile: 576,
    tablet: 768,
    laptop: 1024,
    desktop: 1280,
    wide: 1440,
};

/**
 * Forma maydonlarining umumiy tokenlari. Ramka jadval/kartochka
 * ramkasidan (`colors.border`) bir pog'ona to'qroq — oq fonda maydon
 * chegarasi ko'rinib tursin.
 */
const field = {
    colorBorder: '#D5DDE6',
    colorText: '#1E293B',
    colorTextPlaceholder: '#94A3B8',
    colorBgContainerDisabled: '#F8FAFC',
    colorTextDisabled: '#94A3B8',
    hoverBorderColor: colors.primary,
    activeBorderColor: colors.primary,
};

const fieldShadow = {
    activeShadow: '0 0 0 3px rgba(0, 179, 154, 0.14)',
    errorActiveShadow: '0 0 0 3px rgba(220, 38, 38, 0.12)',
    warningActiveShadow: '0 0 0 3px rgba(245, 158, 11, 0.14)',
};

export const theme = {
    token: {
        colorPrimary: colors.primary,
        colorSuccess: colors.success,
        colorWarning: colors.warning,
        colorError: colors.danger,
        colorInfo: colors.info,

        colorText: colors.textPrimary,
        colorTextSecondary: colors.textSecondary,
        colorTextTertiary: colors.textMuted,
        colorBorder: colors.border,
        colorBgContainer: colors.surface,
        colorBgLayout: colors.background,

        // Platformaning shrifti (index: `* { font-family }`). Bu berilmasa antd
        // komponentlari tizim shriftida (Segoe UI) chizilardi: bitta formada
        // yorliq Open Sans, maydon va tugma esa Segoe UI bo'lib qolardi.
        fontFamily: "'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",

        borderRadius: 10,
        borderRadiusLG: 14,
        borderRadiusSM: 6,

        controlHeight: 40,
        controlHeightLG: 46,
        controlHeightSM: 32,

        fontSize: 14,
        fontSizeLG: 16,
        fontSizeSM: 12,
        fontSizeHeading1: 28,
        fontSizeHeading2: 22,
        fontSizeHeading3: 18,

        // Modallar sidebar ustidan ochilishi uchun
        zIndexPopupBase: 10000,

        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
        boxShadowSecondary: '0 4px 16px rgba(15, 23, 42, 0.10)',
    },
    components: {
        Table: {
            headerBg: '#F8FAFC',
            headerColor: colors.textSecondary,
            rowHoverBg: colors.primarySoft,
            cellPaddingBlock: 12,
        },
        Button: {
            fontWeight: 500,
            primaryShadow: 'none',
            // Katta tugma ham maydonlar bilan bir xil burchakda (standartda 14)
            borderRadiusLG: 10,
        },
        Card: {
            paddingLG: spacing.xl,
        },
        Tag: {
            borderRadiusSM: 6,
        },
        Modal: {
            borderRadiusLG: 16,
        },
        // ── Forma maydonlari ─────────────────────────────────────────
        // Barcha maydonlar (Input, Select, DatePicker, InputNumber) bir xil
        // ko'rinadi: ramka, matn rangi, fokus halqasi va CHAP ICHKI BO'SHLIQ
        // (12 px = 1 px ramka + 11 px). Ilgari bularni `App.css` dagi
        // `!important` qoidalari buzardi — select qiymati 19 px ichkarida,
        // input matni 12 px da turardi.
        Input: { ...field, ...fieldShadow },
        InputNumber: { ...field, ...fieldShadow },
        DatePicker: {
            ...field,
            ...fieldShadow,
            // Kalendar katakchasining kengligi standartda `controlHeightSM * 1.5`
            // (48 px) — `controlHeight: 40` tufayli panel 372 px bo'lib, telefon
            // ekraniga (375 px) sig'masdi va chap chetidan chiqib ketardi.
            // 36 px bilan panel ~300 px — antd ning o'z standart o'lchami.
            cellWidth: 36,
        },
        Select: {
            ...field,
            activeOutlineColor: 'rgba(0, 179, 154, 0.14)',
            optionHeight: 36,
            optionPadding: '8px 12px',
            optionActiveBg: '#F1F5F9',
            optionSelectedBg: colors.primarySoft,
            optionSelectedColor: colors.primaryActive,
            optionSelectedFontWeight: 600,
            multipleItemBg: colors.primarySoft,
            multipleItemBorderColor: 'rgba(0, 179, 154, 0.28)',
            multipleItemHeight: 26,
        },
        Form: {
            labelColor: '#475569',
            labelFontSize: 13,
            labelRequiredMarkColor: colors.danger,
            verticalLabelPadding: '0 0 6px',
            itemMarginBottom: 20,
        },
        Checkbox: {
            borderRadiusSM: 4,
        },
        Radio: {
            buttonSolidCheckedBg: colors.primary,
            buttonSolidCheckedHoverBg: colors.primaryHover,
            buttonSolidCheckedActiveBg: colors.primaryActive,
        },
        Segmented: {
            itemSelectedColor: colors.primaryActive,
            trackBg: '#F1F5F9',
        },
    },
};

/**
 * Telefon va planshet (≤ 768 px) uchun mavzu: barmoq bilan bosiladigan
 * maydon va tugmalar 42 px (WCAG 2.5.8 talabi 24 px dan ancha katta,
 * lekin 44+ px forma juda "shishib" ko'rinardi).
 *
 * Ilgari bu CSS da `min-height: 44px` bilan qilingan edi, lekin faqat
 * ba'zi elementlarga tegardi: select ramkasi 44 px bo'lib, uning o'rami
 * 40 px da qolar va pastga 4 px toshib chiqardi; oddiy input 44, filtr
 * tugmasi 40 px bo'lib qator qiyshayardi. Mavzu orqali BARCHA antd
 * boshqaruvlari birdaniga o'zgaradi. CSS dagi `--control-h` o'zgaruvchisi
 * (App.css) ham shu qiymatga mos.
 */
export const mobileTheme = {
    ...theme,
    token: {
        ...theme.token,
        controlHeight: 42,
        controlHeightLG: 46,
        controlHeightSM: 32,
    },
    // iOS Safari 16 px dan kichik shriftli maydonga fokus tushganda
    // sahifani kattalashtirib yuboradi. Faqat maydonlarga — umumiy
    // `fontSize` jadval va menyularni ham kattalashtirib yuborardi.
    components: {
        ...theme.components,
        Input: { ...theme.components.Input, inputFontSize: 16 },
        InputNumber: { ...theme.components.InputNumber, inputFontSize: 16 },
        DatePicker: { ...theme.components.DatePicker, inputFontSize: 16 },
        Select: { ...theme.components.Select, fontSize: 16 },
    },
};

export default theme;
