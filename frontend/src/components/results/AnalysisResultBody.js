import React from 'react';
import { Image, Tag } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined, StarOutlined,
         ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { FaDownload } from 'react-icons/fa6';
import { useTranslation } from 'react-i18next';

import { buildFileUrl } from '../../host/Host';
import { useStore } from '../../store/Store';
import { parseSeverity, SEVERITY } from '../../tools/severity';
import MeasurementsList from './MeasurementsList';

/**
 * Tahlil natijasining ko'rinadigan qismi — barcha to'rt tur uchun bitta
 * komponent (T-034).
 *
 * Ilgari bu blok **sakkiz faylda** takrorlanardi: har tur uchun
 * `XResult.js` (tahlil qilingandan keyingi ko'rinish) va
 * `XOldResult.js` (ro'yxatdagi yig'iluvchi kartochka). Natijada ular
 * bir-biridan uzoqlashib ketgandi va bu foydalanuvchiga ko'rinadigan
 * farqlarga olib kelgandi:
 *
 * | | EKG | Holter | SMAD | Lab |
 * |---|---|---|---|---|
 * | Raqamli o'lchovlar | bor | **yo'q** | **yo'q** | bor |
 * | AI tavsiyasi | bor | **yo'q** | **yo'q** | **yo'q** |
 *
 * Ya'ni Holter va SMAD uchun sun'iy intellekt o'lchovlarni ham,
 * tavsiyani ham qaytarardi (`python_back/ai_schema.py` da 11 va 13 ta
 * ko'rsatkich), lekin ekranda ular **hech qachon ko'rsatilmasdi** —
 * hisoblab, keyin tashlab yuborilardi.
 *
 * Endi bitta joy: bir marta tuzatilgan xato hamma yerda tuzaladi.
 */

const SEVERITY_TAG = {
    [SEVERITY.NORMAL]: <Tag color="success" icon={<CheckCircleOutlined />}>Normal</Tag>,
    [SEVERITY.AVERAGE]: <Tag color="warning" icon={<ExclamationCircleOutlined />}>O'rtacha</Tag>,
    [SEVERITY.DANGER]: <Tag color="error" icon={<CloseCircleOutlined />}>Xavfli</Tag>,
};

function SeverityTag({ value }) {
    // Qat'iy raqamli taqqoslash — `tools/severity.js` bilan bir xil mantiq.
    // Noaniq qiymatda ATAYLAB kulrang "Baholanmadi", yashil emas: shifokor
    // "normal" deb o'ylab, tekshirmay o'tib ketmasligi kerak.
    return SEVERITY_TAG[parseSeverity(value)]
        ?? <Tag icon={<StarOutlined />} color="default">Baholanmadi</Tag>;
}

/** Fayl havolasi yorlig'i — turga qarab. */
const FILE_LABEL = {
    ecg: ['ecg_file', 'EKG fayli'],
    holter: ['holter_file', 'Holter fayli'],
    smad: ['smad_file', 'SMAD fayli'],
    lab: ['lab_result_file', 'Laboratoriya natijasi fayli'],
};

/** EKG o'lchovlari: kalit → [tarjima kaliti, zaxira nomi]. */
const ECG_LABELS = {
    HR: ['hr', 'Yurak urish ritmi (HR)'],
    PR_interval: [null, 'PR interval'],
    QRS_duration: ['qrs_duration', 'QRS davomiyligi'],
    QT_interval: [null, 'QT interval'],
    QTc_Bazett: [null, 'QTc (Bazett)'],
    QRS_axis: ['qrs_axis', "QRS elektr o'qi"],
    P_wave_duration: ['p_wave_duration', "P to'lqini davomiyligi"],
    P_wave_amplitude: ['p_wave_amplitude', "P to'lqini amplitudasi"],
    R_wave_amplitude: ['r_wave_amplitude', "R to'lqini amplitudasi"],
    S_wave_amplitude: ['s_wave_amplitude', "S to'lqini amplitudasi"],
    T_wave_amplitude: ['t_wave_amplitude', "T to'lqini amplitudasi"],
    PR_segment: [null, 'PR segment'],
    ST_segment_elevation: [null, 'ST segment'],
    RR_interval: [null, 'RR interval'],
    heart_rate_variability: [null, 'HRV'],
    P_QRS_T_morphology: ['p_qrs_t_morphology', 'P/QRS/T morfologiyasi'],
};

function EcgMeasurements({ measurements }) {
    const { t } = useTranslation();
    if (!measurements || typeof measurements !== 'object') return null;

    const rows = Object.keys(ECG_LABELS).filter((k) => {
        const v = measurements[k];
        return v !== null && v !== undefined && String(v).trim() !== '';
    });
    if (rows.length === 0) return null;

    return (
        <>
            <div className="ekg-item-text">
                <b>⭐ {t('digital_measurements', { defaultValue: "Raqamli o'lchovlar" })}: </b>
            </div>
            <ul>
                {rows.map((key) => {
                    const [tKey, fallback] = ECG_LABELS[key];
                    return (
                        <li key={key}>
                            <b>{tKey ? t(tKey, { defaultValue: fallback }) : fallback}</b>
                            <span> — {String(measurements[key])}</span>
                        </li>
                    );
                })}
            </ul>
        </>
    );
}

/**
 * Ko'rsatkichni referens diapazoni bilan solishtiradi (T-035).
 *
 * `gender`: `true` — erkak, `false` — ayol, `undefined` — noma'lum.
 *
 * Jins noma'lum bo'lganda chegaralar **kengaytiriladi**: qiymat erkak
 * va ayol diapazonlarining IKKALASIDAN ham tashqarida bo'lgandagina
 * chetlanish deb belgilanadi. Aks holda, masalan, gemoglobin 125 g/L
 * ayol uchun norma bo'lsa-da, erkak chegarasi bo'yicha "past" deb
 * ko'rsatilib, shifokorni behuda chalg'itardi.
 */
function evaluate(value, type, gender) {
    const num = Number.parseFloat(value);
    if (!Number.isFinite(num)) return null;

    let min;
    let max;
    if (gender === true) {
        min = type.normalMinMale;
        max = type.normalMaxMale;
    } else if (gender === false) {
        min = type.normalMinFemale;
        max = type.normalMaxFemale;
    } else {
        const mins = [type.normalMinMale, type.normalMinFemale].filter((x) => x != null);
        const maxs = [type.normalMaxMale, type.normalMaxFemale].filter((x) => x != null);
        min = mins.length ? Math.min(...mins) : null;
        max = maxs.length ? Math.max(...maxs) : null;
    }

    // Chegara qo'yilmagan ko'rsatkichlar bor (masalan sutkalik peshob
    // hajmi suv iste'moliga bog'liq) — ular baholanmaydi.
    if (min == null && max == null) return null;

    if (min != null && num < min) return { status: 'low', min, max };
    if (max != null && num > max) return { status: 'high', min, max };
    return { status: 'normal', min, max };
}

function RangeHint({ min, max, unit }) {
    if (min == null && max == null) return null;
    const text = min != null && max != null ? `${min}–${max}`
        : min != null ? `≥ ${min}`
        : `≤ ${max}`;
    return <span className="lab-range"> (norma: {text}{unit ? ` ${unit}` : ''})</span>;
}

function LabMeasurements({ measurements, gender }) {
    const { t } = useTranslation();
    const { lab_values } = useStore();
    if (!measurements || typeof measurements !== 'object') return null;

    // Laboratoriya ko'rsatkichlari bazadan keladi (`lab_values`), shuning
    // uchun ular qattiq ro'yxat emas — nomlar tilga qarab tanlanadi.
    const rows = (lab_values ?? []).filter(
        (v) => measurements[v.columnName] != null);
    if (rows.length === 0) return null;

    return (
        <>
            <div className="ekg-item-text">
                <b>⭐ {t('digital_measurements', { defaultValue: "Raqamli o'lchovlar" })}: </b>
            </div>
            <div className="lab-grid">
                {rows.map((v) => {
                    const cell = measurements[v.columnName];
                    const verdict = evaluate(cell.value, v, gender);
                    const status = verdict?.status || 'na';
                    const unit = cell.unit ?? v.measure;
                    const rangeText = verdict && (verdict.min != null || verdict.max != null)
                        ? (verdict.min != null && verdict.max != null ? `${verdict.min}–${verdict.max}`
                            : verdict.min != null ? `≥ ${verdict.min}` : `≤ ${verdict.max}`)
                        : null;
                    return (
                        <div key={v.id} className={`lab-card lab-card--${status}`}>
                            <div className="lab-card-top">
                                <span className="lab-card-name">{v[`name${t('data_lang')}`]}</span>
                                {status === 'high' && (
                                    <span className="lab-card-pill lab-card-pill--high">
                                        <ArrowUpOutlined /> {t('above_normal', { defaultValue: 'Yuqori' })}
                                    </span>
                                )}
                                {status === 'low' && (
                                    <span className="lab-card-pill lab-card-pill--low">
                                        <ArrowDownOutlined /> {t('below_normal', { defaultValue: 'Past' })}
                                    </span>
                                )}
                                {status === 'normal' && (
                                    <span className="lab-card-pill lab-card-pill--normal">
                                        {t('normal', { defaultValue: 'Norma' })}
                                    </span>
                                )}
                            </div>
                            <div className="lab-card-value">
                                {cell.value}{unit ? <span className="lab-card-unit"> {unit}</span> : null}
                            </div>
                            {rangeText && (
                                <div className="lab-card-range">
                                    {t('norm', { defaultValue: 'norma' })}: {rangeText}{unit ? ` ${unit}` : ''}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </>
    );
}

function Measurements({ kind, measurements, gender }) {
    if (kind === 'ecg') return <EcgMeasurements measurements={measurements} />;
    if (kind === 'lab') return <LabMeasurements measurements={measurements} gender={gender} />;
    return <MeasurementsList measurements={measurements} />;
}

/**
 * @param {'ecg'|'holter'|'smad'|'lab'} kind  tahlil turi
 * @param {object|string|null} result         o'qilgan AI javobi
 * @param {string|null} image                 asl fayl havolasi
 * @param {string|null} imageShort            EKG eskizi (faqat `ecg`)
 * @param {string|null} error                 xatolik matni
 * @param {boolean|undefined} gender          bemor jinsi (referens diapazoni uchun)
 */
export default function AnalysisResultBody({ kind, result, image, imageShort, error, gender }) {
    const { t } = useTranslation();
    const [labelKey, labelFallback] = FILE_LABEL[kind] ?? FILE_LABEL.ecg;

    if (error) {
        return (
            <div className="ekg-error">
                <Tag color="error" icon={<CloseCircleOutlined />}>
                    {t('error', { defaultValue: 'Xatolik' })}: {error}
                </Tag>
            </div>
        );
    }

    if (!result) return null;

    // AI javobi JSON emas, oddiy matn bo'lib chiqqan holat: yo'qotib
    // yuborgandan ko'ra shundayligicha ko'rsatgan yaxshiroq.
    if (typeof result === 'string') {
        return (
            <div className="ekg-result">
                <div className="ekg-item-text"><span>{result}</span></div>
            </div>
        );
    }

    return (
        <div className="ekg-result" data-tour="view-measurements">

            {kind === 'ecg' && image != null && (
                <div className="ekg-image">
                    {/* To'liq rasm ko'rsatiladi: eskiz 500 px bo'lgani uchun
                        cho'zilganda EKG intervallari o'qilmasdi. Eskiz esa
                        yuklanish davomida joy egallab turadi. */}
                    <Image
                        style={{ width: '100%', borderRadius: '8px' }}
                        preview={{ src: buildFileUrl(image) }}
                        src={buildFileUrl(image)}
                        placeholder={imageShort ? (
                            <Image
                                preview={false}
                                src={buildFileUrl(imageShort)}
                                style={{ width: '100%', borderRadius: '8px' }}
                            />
                        ) : undefined}
                    />
                    {/* Telefonda tasma 335 px ga siqiladi — to'lqinlarni
                        o'qib bo'lmaydi. Kattalashtirish mavjud, lekin antd
                        uni faqat sichqoncha ustiga kelganda ko'rsatadi;
                        sensorli ekranda hech qanday ishora yo'q. */}
                    <div className="ekg-image-hint">
                        {t('tap_to_zoom', { defaultValue: "Kattalashtirish uchun rasmni bosing" })}
                    </div>
                </div>
            )}

            {kind !== 'ecg' && image != null && (
                <div className="ekg-item-text">
                    <b>⭐ {t(labelKey, { defaultValue: labelFallback })}: </b>
                    <a className="see_diagnoses" href={buildFileUrl(image)}
                       target="_blank" rel="noreferrer">
                        <FaDownload />
                    </a>
                </div>
            )}

            <Measurements kind={kind} measurements={result.digital_measurements} gender={gender} />

            {result.automatic_analysis ? (
                <div className="ekg-item-text" data-tour="view-severity">
                    <b><SeverityTag value={result.automatic_analysis_bool} />{' '}
                        {t('automatic_analysis', { defaultValue: 'Avtomatik tahlil (AI xulosasi)' })}: </b>
                    <span>{result.automatic_analysis}</span>
                </div>
            ) : null}

            {/* Bo'lim doim ko'rsatiladi: ilgari maydon bo'sh bo'lsa u jimgina
                yo'qolardi va shifokor bunday bo'lim yo'q deb o'ylardi */}
            <div className="ekg-item-text">
                <b>⭐ {t('ai_recommendations', { defaultValue: 'AI tavsiyasi' })}: </b>
                {result.AI_recommendations
                    ? <span>{result.AI_recommendations}</span>
                    : <span className="ekg-item-empty">
                        {t('ai_no_recommendation', { defaultValue: 'AI bu tahlil uchun tavsiya bermadi' })}
                      </span>}
            </div>

            {result.final_summary ? (
                <div className="ekg-item-text">
                    <b>⭐ {t('final_summary', { defaultValue: 'Xulosa' })}: </b>
                    <span>{result.final_summary}</span>
                </div>
            ) : null}
        </div>
    );
}
