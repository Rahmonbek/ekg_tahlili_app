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
    },
};

export default theme;
