import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Holter va SMAD tahlillaridagi raqamli ko'rsatkichlar ro'yxati.
 *
 * Ilgari bu ko'rsatkichlar umuman yo'q edi: sun'iy intellektdan faqat
 * uchta matn maydoni so'ralardi, shuning uchun shifokor "o'rtacha bosim
 * qancha edi" degan savolga javobni faqat asl fayldan qidirib topa olardi.
 *
 * Kalitlar `python_back/ai_schema.py` dagi sxema bilan bir xil bo'lishi
 * shart — pastdagi ro'yxat o'sha sxemaning ko'rinadigan tarjimasi.
 */

/** Ko'rsatkich kaliti → tarjima kaliti. Tartib ekranda ham shu tartibda. */
const LABELS = {
    // ── Holter ──────────────────────────────────────────────────────────
    HR_avg: ['hr_avg', "O'rtacha yurak urish tezligi"],
    HR_min: ['hr_min', 'Eng past YUT'],
    HR_max: ['hr_max', 'Eng yuqori YUT'],
    total_beats: ['total_beats', 'Umumiy qisqarishlar soni'],
    pauses_count: ['pauses_count', 'Pauzalar soni (>2 s)'],
    max_pause: ['max_pause', 'Eng uzun pauza'],
    ventricular_extrasystoles: ['ventricular_es', 'Qorincha ekstrasistolalari'],
    supraventricular_extrasystoles: ['supraventricular_es', 'Supraventrikulyar ekstrasistolalar'],
    QTc: ['qtc', 'QTc interval'],
    st_deviation: ['st_deviation', 'ST segment siljishi'],
    rhythm_summary: ['rhythm_summary', 'Ritm'],

    // ── SMAD ────────────────────────────────────────────────────────────
    SBP_24h_avg: ['sbp_24h', "Sutkalik o'rtacha sistolik bosim"],
    DBP_24h_avg: ['dbp_24h', "Sutkalik o'rtacha diastolik bosim"],
    SBP_day_avg: ['sbp_day', "Kunduzgi o'rtacha sistolik"],
    DBP_day_avg: ['dbp_day', "Kunduzgi o'rtacha diastolik"],
    SBP_night_avg: ['sbp_night', "Tungi o'rtacha sistolik"],
    DBP_night_avg: ['dbp_night', "Tungi o'rtacha diastolik"],
    max_bp: ['max_bp', 'Maksimal bosim'],
    min_bp: ['min_bp', 'Minimal bosim'],
    load_index_sbp: ['load_sbp', 'Sistolik yuk indeksi'],
    load_index_dbp: ['load_dbp', 'Diastolik yuk indeksi'],
    circadian_index: ['circadian_index', 'Tungi pasayish darajasi'],
    dipping_status: ['dipping_status', 'Tungi profil'],
    heart_rate_avg: ['hr_avg_smad', "O'rtacha yurak urish tezligi"],
};

/**
 * AI qiymatni ko'pincha izoh bilan yozadi: "204 ms — biroz uzaygan, …".
 * Raqamli qism (qalin) va izoh (kulrang) ajratiladi. Ajratuvchi bo'lmasa
 * va matn uzun bo'lsa (morfologiya tavsifi) — hammasi izoh sifatida.
 */
function splitValue(value) {
    const text = String(value).trim();
    const match = text.match(/^(.{1,40}?)\s+[—–]\s+(.+)$/);
    if (match) return { main: match[1], note: match[2] };
    return text.length > 40 ? { main: '', note: text } : { main: text, note: '' };
}

/**
 * Ko'rsatkichlar to'ri: har biri alohida kartochka (nom tepada, qiymat
 * qalin). Ilgari "Nom — qiymat" ko'rinishidagi oddiy ro'yxat edi va
 * qiymatlarni ko'z bilan qidirish qiyin edi. EKG ham shuni ishlatadi.
 *
 * Uzun matnli qiymatlar (ritm tavsifi, ST siljishi) butun qatorni egallaydi.
 *
 * `stacked` — har bir ko'rsatkich alohida qatorda (nom chapda, qiymat
 * o'ngda). EKG uchun: o'lchovlar ketma-ket o'qiladi va ko'p ustunli to'rda
 * qaysi qiymat qaysi intervalga tegishli ekanini ko'z bilan qidirish kerak edi.
 */
export function KeyValueGrid({ rows, stacked = false }) {
    if (!rows?.length) return null;
    if (stacked) {
        // Hamma qator BIR XIL tuzilishda: [nom | qiymat + izoh]. Ilgari uzun
        // qiymatlar boshqa joylashuvga o'tib, qatorlar aralash ko'rinardi.
        return (
            <dl className="arb-kv arb-kv--stacked">
                {rows.map(({ key, label, value }) => {
                    const { main, note } = splitValue(value);
                    return (
                        <div key={key} className="arb-kv-row">
                            <dt>{label}</dt>
                            <dd>
                                {main && <span className="arb-kv-main">{main}</span>}
                                {note && <span className="arb-kv-note">{note}</span>}
                            </dd>
                        </div>
                    );
                })}
            </dl>
        );
    }
    return (
        <dl className="arb-kv">
            {rows.map(({ key, label, value }) => {
                const text = String(value);
                return (
                    <div key={key} className={`arb-kv-item ${text.length > 42 ? 'arb-kv-item--wide' : ''}`}>
                        <dt>{label}</dt>
                        <dd>{text}</dd>
                    </div>
                );
            })}
        </dl>
    );
}

/**
 * Faqat son qaytarilgan qiymatlarga birlik (AI ba'zan "116" yozadi,
 * "116 mmHg" emas). Birlik allaqachon bo'lsa qiymat o'zgarmaydi.
 */
const UNITS = {
    HR_avg: 'bpm', HR_min: 'bpm', HR_max: 'bpm', heart_rate_avg: 'bpm',
    SBP_24h_avg: 'mmHg', DBP_24h_avg: 'mmHg', SBP_day_avg: 'mmHg',
    DBP_day_avg: 'mmHg', SBP_night_avg: 'mmHg', DBP_night_avg: 'mmHg',
};

function withUnit(key, value) {
    const text = String(value).trim();
    return UNITS[key] && /^-?\d+([.,]\d+)?$/.test(text) ? `${text} ${UNITS[key]}` : text;
}

/**
 * SMAD: o'rtacha bosim — davr × (sistolik / diastolik).
 * Me'yor chegaralari — ESH (European Society of Hypertension) ABPM
 * mezonlari: sutkalik ≥130/80, kunduzgi ≥135/85, tungi ≥120/70 mmHg
 * dan yuqori bo'lsa gipertenziya hisoblanadi.
 */
const BP_ROWS = [
    { period: ['smad_period_24h', 'Sutkalik'], sbp: 'SBP_24h_avg', dbp: 'DBP_24h_avg', limit: [130, 80] },
    { period: ['smad_period_day', 'Kunduzgi'], sbp: 'SBP_day_avg', dbp: 'DBP_day_avg', limit: [135, 85] },
    { period: ['smad_period_night', 'Tungi'], sbp: 'SBP_night_avg', dbp: 'DBP_night_avg', limit: [120, 70] },
];
const BP_KEYS = new Set(BP_ROWS.flatMap((r) => [r.sbp, r.dbp]));

const toNumber = (value) => {
    const match = String(value ?? '').match(/-?\d+(?:[.,]\d+)?/);
    return match ? Number(match[0].replace(',', '.')) : null;
};

/**
 * Oltita alohida qator o'rniga bitta jadval: shifokor sutkalik, kunduzgi
 * va tungi bosimni bir qarashda solishtiradi (masalan tungi gipertenziya).
 */
function BloodPressureTable({ measurements }) {
    const { t } = useTranslation();
    const rows = BP_ROWS
        .map((row) => ({ ...row, s: toNumber(measurements[row.sbp]), d: toNumber(measurements[row.dbp]) }))
        .filter((row) => row.s != null || row.d != null);
    if (rows.length === 0) return null;

    return (
        <table className="arb-bp">
            <thead>
                <tr>
                    <th>{t('smad_period', { defaultValue: 'Davr' })}</th>
                    <th>{t('smad_avg_bp', { defaultValue: "O'rtacha bosim" })}</th>
                    <th>{t('smad_threshold', { defaultValue: "Me'yor (ESH)" })}</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((row) => {
                    const high = (row.s != null && row.s >= row.limit[0]) || (row.d != null && row.d >= row.limit[1]);
                    return (
                        <tr key={row.sbp} className={high ? 'is-high' : ''}>
                            <th scope="row">{t(row.period[0], { defaultValue: row.period[1] })}</th>
                            <td>
                                <span className="arb-bp-value">{row.s ?? '—'}/{row.d ?? '—'}</span>
                                <span className="arb-bp-unit"> mmHg</span>
                                {high && (
                                    <span className="arb-bp-flag">{t('above_normal', { defaultValue: 'Yuqori' })}</span>
                                )}
                            </td>
                            <td className="arb-bp-limit">&lt; {row.limit[0]}/{row.limit[1]}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

/**
 * Holter va SMAD o'lchovlari — EKG bilan bir xil qatorma-qator jadval
 * (`KeyValueGrid stacked`): chapda nom, o'ngda qiymat (qalin) va izoh.
 * Ilgari ko'p ustunli kartochkalar edi va uzun qiymatlar butun qatorni
 * egallab, qatorlar aralash ko'rinardi. SMAD da o'rtacha bosim alohida
 * jadvalda (`BloodPressureTable`).
 */
export default function MeasurementsList({ measurements, kind }) {
    const { t } = useTranslation();

    if (!measurements || typeof measurements !== 'object') return null;

    // Model aniqlay olmagan ko'rsatkichga `null` qaytaradi — bo'sh qatorni
    // ko'rsatish shifokorni chalg'itadi, shuning uchun ular tushirib qoldiriladi
    const bpTable = kind === 'smad' ? <BloodPressureTable measurements={measurements} /> : null;
    const rows = Object.keys(LABELS)
        .filter((key) => {
            if (bpTable && BP_KEYS.has(key)) return false; // jadvalda ko'rsatilgan
            const value = measurements[key];
            return value !== null && value !== undefined && String(value).trim() !== '';
        })
        .map((key) => ({
            key,
            label: t(LABELS[key][0], { defaultValue: LABELS[key][1] }),
            value: withUnit(key, measurements[key]),
        }));

    return (
        <>
            {bpTable}
            <KeyValueGrid rows={rows} stacked />
        </>
    );
}
