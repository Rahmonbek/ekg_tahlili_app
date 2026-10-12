import React, { useState } from 'react';
import { Image } from 'antd';
import {
    CheckCircleFilled, ExclamationCircleFilled, CloseCircleFilled, MinusCircleFilled,
    ArrowUpOutlined, ArrowDownOutlined, DownOutlined, FileTextOutlined,
    ClockCircleOutlined, BulbOutlined, SearchOutlined, DashboardOutlined,
} from '@ant-design/icons';
import { FaDownload } from 'react-icons/fa6';
import { useTranslation } from 'react-i18next';

import { buildFileUrl } from '../../host/Host';
import { useStore } from '../../store/Store';
import { parseSeverity, SEVERITY, severityLabel } from '../../tools/severity';
import MeasurementsList, { KeyValueGrid } from './MeasurementsList';
import { extractEpisodeGroups, splitSentences } from './resultText';
import './AnalysisResult.css';

/**
 * Tahlil natijasining ko'rinadigan qismi — barcha to'rt tur uchun bitta
 * komponent (T-034).
 *
 * Bo'limlar ATAYLAB shu tartibda — shifokor eng muhimini birinchi ko'radi:
 *
 *  1. **Yakuniy xulosa** — jiddiylik rangi bilan ajratilgan blok. Ilgari u
 *     eng pastda, oddiy paragraf edi, daraja esa kichik yorliqda.
 *  2. **Aniqlangan o'zgarishlar** — har bir topilma alohida qatorda
 *     (ilgari bitta uzun paragraf).
 *  3. **Vaqt bo'yicha epizodlar** (Holter/SMAD) — har bir epizod alohida
 *     qator: vaqt + topilma. Ilgari AI ularni vergul bilan bitta gapga
 *     tizardi. Yangi natijalarda `pathology_episodes` maydoni, eski
 *     natijalarda matndan ishonchli holatdagina ajratib olinadi.
 *  4. **Ko'rsatkichlar** — laboratoriyada me'yordan tashqarilari birinchi,
 *     me'yordagilari yig'ilgan holda.
 *  5. **AI tavsiyalari** — ro'yxat.
 *  6. **Yuklangan fayl(lar)**.
 */

const SEVERITY_META = {
    [SEVERITY.NORMAL]: { mod: 'normal', icon: <CheckCircleFilled /> },
    [SEVERITY.AVERAGE]: { mod: 'average', icon: <ExclamationCircleFilled /> },
    [SEVERITY.DANGER]: { mod: 'danger', icon: <CloseCircleFilled /> },
    [SEVERITY.UNKNOWN]: { mod: 'unknown', icon: <MinusCircleFilled /> },
};

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

/** Bo'lim: ikonka + sarlavha + ichki qism. */
function Section({ icon, title, count, children, className = '', tour }) {
    return (
        <section className={`arb-section ${className}`} data-tour={tour}>
            <header className="arb-section-head">
                <span className="arb-section-icon" aria-hidden="true">{icon}</span>
                <h3 className="arb-section-title">{title}</h3>
                {count != null && <span className="arb-section-count">{count}</span>}
            </header>
            {children}
        </section>
    );
}

function EcgMeasurements({ measurements }) {
    const { t } = useTranslation();
    if (!measurements || typeof measurements !== 'object') return null;

    const rows = Object.keys(ECG_LABELS)
        .filter((k) => {
            const v = measurements[k];
            return v !== null && v !== undefined && String(v).trim() !== '';
        })
        .map((key) => {
            const [tKey, fallback] = ECG_LABELS[key];
            return { key, label: tKey ? t(tKey, { defaultValue: fallback }) : fallback, value: measurements[key] };
        });
    // EKG: har bir o'lchov alohida qatorda
    return <KeyValueGrid rows={rows} stacked />;
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

/**
 * Birlik matnini taqqoslash uchun yagona ko'rinishga keltiradi —
 * `python_back/lab_units.norm_unit` ning qisqa nusxasi. Backend natijani
 * allaqachon me'yor birligiga keltiradi; bu — tuzatilmagan eski yozuvlar
 * uchun himoya: birlik boshqacha bo'lsa ko'rsatkich BAHOLANMAYDI
 * (ilgari 5.5 mg/dL siydik kislotasi µmol/L me'yori bilan solishtirilib
 * "past" deb ko'rsatilardi).
 */
function normUnit(unit) {
    if (unit == null) return '';
    // Ruscha "birlik" yozuvlarida katta-kichik harf ma'no beradi
    // ("мЕ/л" — milli, "МЕ/л" — xalqaro), shuning uchun avval shular
    const s = String(unit).trim()
        .replace(/мкМЕ|мкЕ[дД]?|МкМЕ|МкЕ/g, 'µiu').replace(/мМЕ|мЕ[дД]?/g, 'miu')
        .replace(/МЕ/g, 'iu').replace(/Е[дД]/g, 'u')
        .toLowerCase()
        .replace(/μ/g, 'µ').replace(/мкмоль/g, 'µmol').replace(/ммоль/g, 'mmol')
        .replace(/мкг/g, 'µg').replace(/мг/g, 'mg').replace(/нг/g, 'ng').replace(/пг/g, 'pg')
        .replace(/мм/g, 'mm').replace(/час|ч/g, 'h')
        .replace(/дл/g, 'dl').replace(/мл/g, 'ml').replace(/л/g, 'l').replace(/г/g, 'g')
        .replace(/(mc|mk|u)(mol|g)/g, 'µ$2')
        .replace(/\s+/g, '').replace(/×/g, 'x').replace(/\*/g, '^')
        .replace(/⁹/g, '^9').replace(/¹²/g, '^12').replace(/\^\^/g, '^')
        .replace(/^x?10\^?(9|12)/, '10^$1');
    const same = {
        'miu/l': 'µiu/ml', 'mu/l': 'µiu/ml', 'iu/l': 'u/l', 'µg/l': 'ng/ml',
        'mg/l': 'µg/ml', 'mm/soat': 'mm/h', 'mm/hr': 'mm/h',
    };
    return same[s] ?? s;
}

function unitsMatch(cellUnit, measure) {
    if (!cellUnit || !measure) return true; // birlik noma'lum — avvalgidek baholanadi
    return normUnit(cellUnit) === normUnit(measure);
}

function LabCard({ row }) {
    const { t } = useTranslation();
    const { cell, verdict, status, unit, name } = row;
    const rangeText = verdict && (verdict.min != null || verdict.max != null)
        ? (verdict.min != null && verdict.max != null ? `${verdict.min}–${verdict.max}`
            : verdict.min != null ? `≥ ${verdict.min}` : `≤ ${verdict.max}`)
        : null;
    return (
        <div className={`lab-card lab-card--${status}`}>
            <div className="lab-card-top">
                <span className="lab-card-name">{name}</span>
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
                {status === 'unit' && (
                    <span className="lab-card-pill lab-card-pill--unit">
                        {t('lab_not_assessed', { defaultValue: 'Baholanmadi' })}
                    </span>
                )}
            </div>
            <div className="lab-card-value">
                {cell.value}{unit ? <span className="lab-card-unit"> {unit}</span> : null}
            </div>
            {/* Qiymat boshqa birlikdan aylantirilgan — asl yozuv ko'rinib tursin */}
            {cell.original && (
                <div className="lab-card-original">
                    {t('lab_in_file', { defaultValue: 'faylda' })}: {cell.original.value} {cell.original.unit}
                </div>
            )}
            {status === 'unit' && (
                <div className="lab-card-original">
                    {t('lab_unit_differs', {
                        unit: row.measure,
                        defaultValue: `Me'yor ${row.measure} da berilgan — birlik boshqa`,
                    })}
                </div>
            )}
            {rangeText && (
                <div className="lab-card-range">
                    {t('norm', { defaultValue: 'norma' })}: {rangeText}{unit ? ` ${unit}` : ''}
                </div>
            )}
        </div>
    );
}

/**
 * Laboratoriya ko'rsatkichlari: me'yordan TASHQARIDAGILARI birinchi va
 * doim ochiq; me'yordagilari yig'ilgan (bitta bosish bilan ochiladi).
 * Ilgari 15–20 ta kartochka aralash turardi va 2 ta muhim chetlanishni
 * ular orasidan qidirish kerak edi.
 */
function LabMeasurements({ measurements, gender }) {
    const { t } = useTranslation();
    const { lab_values } = useStore();
    const [showNormal, setShowNormal] = useState(false);
    if (!measurements || typeof measurements !== 'object') return null;

    // Laboratoriya ko'rsatkichlari bazadan keladi (`lab_values`), shuning
    // uchun ular qattiq ro'yxat emas — nomlar tilga qarab tanlanadi.
    const rows = (lab_values ?? [])
        .filter((v) => measurements[v.columnName] != null)
        .map((v) => {
            const cell = measurements[v.columnName];
            // Birlik me'yor birligidan farq qilsa solishtirib bo'lmaydi
            const comparable = !cell.unit_mismatch && unitsMatch(cell.unit, v.measure);
            const verdict = comparable ? evaluate(cell.value, v, gender) : null;
            return {
                id: v.id,
                cell,
                verdict,
                status: comparable ? (verdict?.status || 'na') : 'unit',
                unit: cell.unit ?? v.measure,
                measure: v.measure,
                name: v[`name${t('data_lang')}`],
            };
        });
    if (rows.length === 0) return null;

    const abnormal = rows.filter((r) => r.status === 'high' || r.status === 'low');
    const other = rows.filter((r) => r.status !== 'high' && r.status !== 'low');
    // Chetlanish bo'lmasa yig'ishning ma'nosi yo'q — hammasi ko'rinadi
    const normalOpen = showNormal || abnormal.length === 0;

    return (
        <>
            {abnormal.length > 0 && (
                <>
                    <div className="arb-subtitle arb-subtitle--alert">
                        {t('out_of_range', { defaultValue: "Me'yordan tashqari" })} ({abnormal.length})
                    </div>
                    <div className="lab-grid">
                        {abnormal.map((row) => <LabCard key={row.id} row={row} />)}
                    </div>
                </>
            )}
            {other.length > 0 && (
                <>
                    {abnormal.length > 0 && (
                        <button
                            type="button"
                            className="arb-toggle"
                            aria-expanded={normalOpen}
                            onClick={() => setShowNormal((v) => !v)}
                        >
                            {t('within_range', { defaultValue: "Me'yordagi ko'rsatkichlar" })} ({other.length})
                            <DownOutlined className={`arb-toggle-chevron ${normalOpen ? 'is-open' : ''}`} />
                        </button>
                    )}
                    {normalOpen && (
                        <div className="lab-grid">
                            {other.map((row) => <LabCard key={row.id} row={row} />)}
                        </div>
                    )}
                </>
            )}
        </>
    );
}

function Measurements({ kind, measurements, gender }) {
    if (kind === 'ecg') return <EcgMeasurements measurements={measurements} />;
    if (kind === 'lab') return <LabMeasurements measurements={measurements} gender={gender} />;
    return <MeasurementsList measurements={measurements} kind={kind} />;
}

/** O'lchovlar bo'limida ko'rsatadigan narsa bormi (bo'sh sarlavha chiqmasin). */
function hasMeasurements(measurements) {
    if (!measurements || typeof measurements !== 'object') return false;
    return Object.values(measurements).some((v) => {
        if (v == null) return false;
        if (typeof v === 'object') return v.value != null;
        return String(v).trim() !== '';
    });
}

/** Vaqt bo'yicha epizodlar ro'yxati. */
function EpisodeList({ episodes }) {
    return (
        <ol className="arb-episodes">
            {episodes.map((episode, index) => (
                <li key={`${episode.time}-${index}`} className="arb-episode">
                    <span className="arb-episode-time">
                        <ClockCircleOutlined /> {episode.time || '—'}
                    </span>
                    <span className="arb-episode-text">{episode.finding}</span>
                </li>
            ))}
        </ol>
    );
}

/**
 * @param {'ecg'|'holter'|'smad'|'lab'} kind  tahlil turi
 * @param {object|string|null} result         o'qilgan AI javobi
 * @param {string|null} image                 asl fayl havolasi
 * @param {Array<{fileLink:string, originalFilename?:string}>} [files]
 *        bir nechta fayl (laboratoriya). Berilsa `image` o'rniga
 *        hammasi asl nomlari bilan ro'yxat qilib ko'rsatiladi.
 * @param {string|null} imageShort            EKG eskizi (faqat `ecg`)
 * @param {string|null} error                 xatolik matni
 * @param {boolean|undefined} gender          bemor jinsi (referens diapazoni uchun)
 */
export default function AnalysisResultBody({ kind, result, image, imageShort, error, gender, files }) {
    const { t } = useTranslation();
    const [labelKey, labelFallback] = FILE_LABEL[kind] ?? FILE_LABEL.ecg;

    if (error) {
        return (
            <div className="arb-hero arb-hero--danger">
                <div className="arb-hero-head">
                    <CloseCircleFilled /> {t('error', { defaultValue: 'Xatolik' })}
                </div>
                <p className="arb-hero-text">{error}</p>
            </div>
        );
    }

    if (!result) return null;

    // AI javobi JSON emas, oddiy matn bo'lib chiqqan holat: yo'qotib
    // yuborgandan ko'ra shundayligicha ko'rsatgan yaxshiroq.
    if (typeof result === 'string') {
        return (
            <div className="arb">
                <section className="arb-section"><p className="arb-plain">{result}</p></section>
            </div>
        );
    }

    const severity = parseSeverity(result.automatic_analysis_bool);
    const meta = SEVERITY_META[severity] ?? SEVERITY_META[SEVERITY.UNKNOWN];

    // Topilmalar va epizodlar. Yangi natijalarda epizodlar alohida maydonda;
    // eskilarida matndan (faqat ishonchli holatda) ajratib olinadi.
    const structured = Array.isArray(result.pathology_episodes)
        ? result.pathology_episodes.filter((e) => e && String(e.finding || '').trim())
        : null;
    let findings;
    let episodeGroups = [];
    if (structured) {
        findings = splitSentences(result.automatic_analysis);
        if (structured.length > 0) episodeGroups = [{ intro: '', episodes: structured }];
    } else if (kind === 'holter' || kind === 'smad') {
        const parsed = extractEpisodeGroups(result.automatic_analysis);
        findings = parsed.sentences;
        episodeGroups = parsed.groups;
    } else {
        findings = splitSentences(result.automatic_analysis);
    }
    const episodeCount = episodeGroups.reduce((n, g) => n + g.episodes.length, 0);
    const recommendations = splitSentences(result.AI_recommendations);
    // Yakuniy xulosa bo'lmasa — hero blokda topilmalarning birinchisi
    const summary = result.final_summary || '';

    const fileList = files?.length > 0
        ? files
        : (kind !== 'ecg' && image ? [{ fileLink: image, originalFilename: null }] : []);

    return (
        <div className="arb" data-tour="view-measurements">

            {kind === 'ecg' && image != null && (
                <div className="ekg-image arb-ecg-image">
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
                    {/* Telefonda tasma 335 px ga siqiladi — sensorli ekranda
                        kattalashtirish haqida hech qanday ishora yo'q edi */}
                    <div className="ekg-image-hint">
                        {t('tap_to_zoom', { defaultValue: "Kattalashtirish uchun rasmni bosing" })}
                    </div>
                </div>
            )}

            {/* ── 1. Yakuniy xulosa ── */}
            <div className={`arb-hero arb-hero--${meta.mod}`} data-tour="view-severity">
                <div className="arb-hero-head">
                    <span className="arb-hero-badge">{meta.icon} {severityLabel(result.automatic_analysis_bool, t)}</span>
                    <span className="arb-hero-label">{t('final_summary', { defaultValue: 'Yakuniy xulosa' })}</span>
                </div>
                {summary
                    ? <p className="arb-hero-text">{summary}</p>
                    : <p className="arb-hero-text arb-muted">{t('ai_no_summary', { defaultValue: 'AI yakuniy xulosa bermadi' })}</p>}
            </div>

            {/* ── 2. Aniqlangan o'zgarishlar ── */}
            {findings.length > 0 && (
                <Section
                    icon={<SearchOutlined />}
                    title={t('ai_findings', { defaultValue: "Aniqlangan o'zgarishlar" })}
                >
                    {findings.length === 1
                        ? <p className="arb-plain">{findings[0]}</p>
                        : (
                            <ol className="arb-findings">
                                {findings.map((text, index) => (
                                    <li key={index} className="arb-finding">
                                        <span className="arb-finding-num">{index + 1}</span>
                                        <span>{text}</span>
                                    </li>
                                ))}
                            </ol>
                        )}
                </Section>
            )}

            {/* ── 3. Vaqt bo'yicha epizodlar (Holter / SMAD) ── */}
            {episodeCount > 0 && (
                <Section
                    icon={<ClockCircleOutlined />}
                    title={t('pathology_episodes', { defaultValue: "Vaqt bo'yicha patologik epizodlar" })}
                    count={episodeCount}
                >
                    {episodeGroups.map((group, index) => (
                        <div key={index} className="arb-episode-group">
                            {group.intro && <p className="arb-episode-intro">{group.intro}:</p>}
                            <EpisodeList episodes={group.episodes} />
                        </div>
                    ))}
                </Section>
            )}

            {/* ── 4. Ko'rsatkichlar ── */}
            {hasMeasurements(result.digital_measurements) && (
                <Section
                    icon={<DashboardOutlined />}
                    title={t('digital_measurements', { defaultValue: "Raqamli o'lchovlar" })}
                >
                    <Measurements kind={kind} measurements={result.digital_measurements} gender={gender} />
                </Section>
            )}

            {/* ── 5. Tavsiyalar ── bo'lim doim ko'rsatiladi: ilgari maydon bo'sh
                bo'lsa u jimgina yo'qolardi va shifokor bunday bo'lim yo'q deb o'ylardi */}
            <Section icon={<BulbOutlined />} title={t('ai_recommendations', { defaultValue: 'AI tavsiyasi' })}>
                {recommendations.length === 0 && (
                    <p className="arb-plain arb-muted">
                        {t('ai_no_recommendation', { defaultValue: 'AI bu tahlil uchun tavsiya bermadi' })}
                    </p>
                )}
                {recommendations.length === 1 && <p className="arb-plain">{recommendations[0]}</p>}
                {recommendations.length > 1 && (
                    <ul className="arb-recs">
                        {recommendations.map((text, index) => <li key={index}>{text}</li>)}
                    </ul>
                )}
            </Section>

            {/* ── 6. Fayllar ── */}
            {fileList.length > 0 && (
                <Section
                    icon={<FileTextOutlined />}
                    title={fileList.length > 1
                        ? t('lab_result_files', { defaultValue: 'Natija fayllari' })
                        : t(labelKey, { defaultValue: labelFallback })}
                    count={fileList.length > 1 ? fileList.length : null}
                >
                    <div className="arb-files">
                        {fileList.map((file, index) => (
                            <a
                                key={file.fileLink}
                                className="arb-file"
                                href={buildFileUrl(file.fileLink)}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <FaDownload />
                                <span>
                                    {file.originalFilename
                                        || (fileList.length > 1
                                            ? `${t('file', { defaultValue: 'Fayl' })} ${index + 1}`
                                            : t('download', { defaultValue: 'Yuklab olish' }))}
                                </span>
                            </a>
                        ))}
                    </div>
                </Section>
            )}
        </div>
    );
}
