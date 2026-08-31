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

export default function MeasurementsList({ measurements }) {
    const { t } = useTranslation();

    if (!measurements || typeof measurements !== 'object') return null;

    // Model aniqlay olmagan ko'rsatkichga `null` qaytaradi — bo'sh qatorni
    // ko'rsatish shifokorni chalg'itadi, shuning uchun ular tushirib qoldiriladi
    const rows = Object.keys(LABELS)
        .filter((key) => {
            const value = measurements[key];
            return value !== null && value !== undefined && String(value).trim() !== '';
        })
        .map((key) => ({ key, value: measurements[key] }));

    if (rows.length === 0) return null;

    return (
        <>
            <div className="ekg-item-text">
                <b>⭐ {t('digital_measurements', { defaultValue: "Raqamli o'lchovlar" })}: </b>
            </div>
            <ul>
                {rows.map(({ key, value }) => (
                    <li key={key}>
                        <b>{t(LABELS[key][0], { defaultValue: LABELS[key][1] })}</b>
                        <span> — {String(value)}</span>
                    </li>
                ))}
            </ul>
        </>
    );
}
