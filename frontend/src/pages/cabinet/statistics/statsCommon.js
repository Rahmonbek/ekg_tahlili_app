import React from 'react';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement,
    LineElement, ArcElement, Tooltip, Legend, Filler,
    BarController, LineController, DoughnutController,
} from 'chart.js';

// Aralash grafik (ustun + chiziq) uchun ikkala kontroller ham kerak
ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement,
    ArcElement, Tooltip, Legend, Filler, BarController, LineController, DoughnutController);

/** Grafik ranglari (platforma uslubida, ko'r-ko'rona farqlanadigan). */
export const COLORS = {
    primary: '#14A38B',
    primarySoft: 'rgba(20, 163, 139, 0.15)',
    high: '#E5484D',
    highSoft: 'rgba(229, 72, 77, 0.15)',
    low: '#F5A524',
    lowSoft: 'rgba(245, 165, 36, 0.18)',
    blue: '#3B82F6',
    gray: '#94A3B8',
    palette: ['#14A38B', '#3B82F6', '#F5A524', '#E5484D', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316', '#64748B', '#EC4899'],
};

/** Ko'rsatkich guruhlari (`lab_value_types.category`) — nomlari. */
export const CATEGORY_LABELS = {
    cbc: { uz: 'Umumiy qon tahlili', ru: 'Общий анализ крови', en: 'Complete blood count' },
    carb: { uz: 'Uglevod almashinuvi', ru: 'Углеводный обмен', en: 'Carbohydrate metabolism' },
    lipid: { uz: 'Lipid profili', ru: 'Липидный профиль', en: 'Lipid profile' },
    liver: { uz: 'Jigar', ru: 'Печень', en: 'Liver' },
    protein: { uz: 'Oqsillar', ru: 'Белки', en: 'Proteins' },
    kidney: { uz: 'Buyrak', ru: 'Почки', en: 'Kidney' },
    enzyme: { uz: 'Fermentlar', ru: 'Ферменты', en: 'Enzymes' },
    electrolyte: { uz: 'Elektrolitlar', ru: 'Электролиты', en: 'Electrolytes' },
    iron: { uz: 'Temir almashinuvi', ru: 'Обмен железа', en: 'Iron metabolism' },
    inflammation: { uz: "Yallig'lanish", ru: 'Воспаление', en: 'Inflammation' },
    cardiac: { uz: 'Yurak markerlari', ru: 'Кардиомаркеры', en: 'Cardiac markers' },
    coagulation: { uz: 'Koagulogramma', ru: 'Коагулограмма', en: 'Coagulation' },
    thyroid: { uz: 'Qalqonsimon bez', ru: 'Щитовидная железа', en: 'Thyroid' },
    hormone: { uz: 'Gormonlar', ru: 'Гормоны', en: 'Hormones' },
    vitamin: { uz: 'Vitaminlar', ru: 'Витамины', en: 'Vitamins' },
    immunology: { uz: 'Immunologiya', ru: 'Иммунология', en: 'Immunology' },
    infection: { uz: 'Infeksiya markerlari', ru: 'Маркеры инфекций', en: 'Infection markers' },
    tumor: { uz: 'Onkomarkerlar', ru: 'Онкомаркеры', en: 'Tumor markers' },
    blood_group: { uz: 'Qon guruhi', ru: 'Группа крови', en: 'Blood group' },
    urine: { uz: 'Umumiy siydik tahlili', ru: 'Общий анализ мочи', en: 'Urinalysis' },
    nechiporenko: { uz: 'Nechiporenko', ru: 'Нечипоренко', en: 'Nechiporenko' },
    urine_daily: { uz: 'Sutkalik siydik', ru: 'Суточная моча', en: '24h urine' },
};

/** Xavf signali holatlari: rang va nom. */
export const STATUS_META = {
    CRITICAL: { color: '#E5484D', tag: 'red', uz: 'Kritik', ru: 'Критично', en: 'Critical' },
    CRITERIA_MET: { color: '#F97316', tag: 'volcano', uz: 'Mezon bajarilgan', ru: 'Критерий выполнен', en: 'Criteria met' },
    SUSPECTED: { color: '#F5A524', tag: 'gold', uz: 'Shubha', ru: 'Подозрение', en: 'Suspected' },
    MONITOR: { color: '#3B82F6', tag: 'blue', uz: 'Kuzatuv', ru: 'Наблюдение', en: 'Monitor' },
    INSUFFICIENT_DATA: { color: '#94A3B8', tag: 'default', uz: "Ma'lumot yetarli emas", ru: 'Недостаточно данных', en: 'Insufficient data' },
};

export const SEVERITY_META = {
    3: { color: '#E5484D', uz: 'Shoshilinch', ru: 'Срочно', en: 'Urgent' },
    2: { color: '#F5A524', uz: "E'tibor", ru: 'Внимание', en: 'Attention' },
    1: { color: '#3B82F6', uz: 'Kuzatuv', ru: 'Наблюдение', en: 'Monitor' },
};

export const REVIEW_META = {
    pending: { tag: 'default', uz: "Ko'rib chiqilmagan", ru: 'Не рассмотрен', en: 'Pending' },
    confirmed: { tag: 'green', uz: 'Tasdiqlangan', ru: 'Подтверждён', en: 'Confirmed' },
    rejected: { tag: 'default', uz: 'Rad etilgan', ru: 'Отклонён', en: 'Rejected' },
};

/** Qoidalar ("NMED laboratoriya klinik qoidalari" v1.0). */
export const RULE_LABELS = {
    'REN-01': "O'tkir buyrak shikastlanishi (AKI)",
    'REN-02': 'Surunkali buyrak kasalligi (eGFR)',
    'ELE-01': 'Giperkalemiya',
    'ELE-02': 'Giponatremiya / gipernatremiya',
    'CAR-01': 'Miokard shikastlanishi (troponin)',
    'CAR-02': 'Yurak yetishmovchiligi (NT-proBNP)',
    'GLU-01': 'Prediabet',
    'GLU-02': 'Qandli diabet mezoni',
    'HEM-01': 'Anemiya',
    'HEM-02': 'Temir tanqisligi anemiyasi',
    'HEM-03': 'B12 yetishmovchiligi',
    'HEM-04': 'Folat tanqisligi',
    'HEM-05': 'Trombotsitopeniya / neytropeniya',
    'THY-01': 'Gipotireoz',
    'THY-02': 'Tireotoksikoz',
    'LIV-01': 'Jigar fermentlari oshishi',
    'LIV-02': 'Jigar fibrozi xavfi (FIB-4)',
    'PAN-01': "O'tkir pankreatitga shubha",
    'LIP-01': 'Gipertrigliseridemiya',
    'INF-01': "Yallig'lanish profili",
    'INF-02': 'Gepatit B/C, OIV skrining',
    'COA-01': 'Koagulyatsiya buzilishi',
    'UR-01': 'Proteinuriya',
    'ONC-01': 'Onkomarkerlar',
    'MET-01': 'Vitamin D / minerallar',
};

export const AGE_GROUPS = ['0-17', '18-29', '30-44', '45-59', '60-74', '75+', 'unknown'];

/** Til kodi bo'yicha nom ({uz, ru, en}). */
export function pick(meta, lang) {
    if (!meta) return '';
    return meta[lang] ?? meta.uz ?? '';
}

/** `t('data_lang')` → "Uz" | "Ru" | "En" → "uz" | "ru" | "en". */
export function langCode(t) {
    return String(t('data_lang') || 'Uz').toLowerCase();
}

export function num(v, digits = 2) {
    if (v == null || v === '') return '—';
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v);
    return Number.isInteger(n) ? String(n) : n.toFixed(digits).replace(/\.?0+$/, '');
}

export function pct(part, total) {
    const p = Number(part) || 0;
    const tt = Number(total) || 0;
    if (!tt) return '0%';
    return `${Math.round((p / tt) * 1000) / 10}%`;
}

/** Yo'q kalitlarni olib tashlaydi (so'rov parametrlari uchun). */
export function cleanParams(obj) {
    const out = {};
    Object.entries(obj || {}).forEach(([k, v]) => {
        if (v === null || v === undefined || v === '' || v === false) return;
        out[k] = v;
    });
    return out;
}

export function KpiCard({ label, value, hint, accent, onClick, active }) {
    return (
        <button
            type="button"
            className={`lst-kpi ${onClick ? 'lst-kpi--clickable' : ''} ${active ? 'lst-kpi--active' : ''}`}
            style={accent ? { borderTopColor: accent } : undefined}
            onClick={onClick}
            disabled={!onClick}
        >
            <div className="lst-kpi-label">{label}</div>
            <div className="lst-kpi-value">{value}</div>
            {hint ? <div className="lst-kpi-hint">{hint}</div> : null}
        </button>
    );
}

export function Panel({ title, extra, children, className = '' }) {
    return (
        <section className={`lst-panel ${className}`}>
            {(title || extra) && (
                <header className="lst-panel-head">
                    <h3>{title}</h3>
                    {extra}
                </header>
            )}
            <div className="lst-panel-body">{children}</div>
        </section>
    );
}

/** Chart.js umumiy sozlamalari. */
export const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true } } },
};
