import React, { useMemo } from 'react'
import { Alert, Spin, Typography } from 'antd'
import {
    AlertFilled, BranchesOutlined, BulbOutlined, CheckCircleFilled, CloseCircleFilled,
    ExclamationCircleFilled, MinusCircleFilled, QuestionCircleOutlined, SearchOutlined,
    ThunderboltFilled,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import DoctorDiagnosisBlock from './DoctorDiagnosisBlock'
import { parseSeverity, SEVERITY, severityLabel } from '../../tools/severity'
import './AnalysisResult.css'
import '../../pages/cabinet/combined_analyse/CombinedAnalyse.css'

const { Text } = Typography

/**
 * Kompleks (ko'p tahlilli) AI xulosasining natijasi.
 *
 * Ikki joyda ishlatiladi va shuning uchun alohida komponent:
 *  * `/combined-analyses/view/:id` — to'liq sahifa;
 *  * bemor kartasidagi ro'yxat — kartochkani ochganda O'SHA sahifaning
 *    o'zida (`embedded`).
 *
 * Vizual til alohida tahlil natijalari (`AnalysisResultBody`, `arb-*`)
 * bilan BIR XIL — shifokor ikkala sahifada bir xil joyda bir xil narsani
 * ko'radi. Bo'limlar tartibi muhimlik bo'yicha:
 *
 *   1. Yakuniy xulosa — jiddiylik darajasi YOZIB ko'rsatiladi (ilgari faqat
 *      rang bilan, rang ajrata olmaydigan foydalanuvchi uchun ko'rinmasdi);
 *   2. Shoshilinch belgilar — darhol xulosadan keyin (ilgari topilmalar
 *      ro'yxatidan keyin, sahifa pastida qolib ketardi);
 *   3. Aniqlangan holatlar — raqamlangan qatorlar;
 *   4. Tahlillar orasidagi bog'liqliklar — kompleks tahlilning asosiy qiymati;
 *   5. Ehtimoliy tashxislar — ehtimollik bo'yicha saralangan, o'lchagich bilan;
 *   6. AI tavsiyalari.
 *
 * `data` — `GET /api/combined-analyses/{id}` javobi.
 */

const SEVERITY_META = {
    [SEVERITY.NORMAL]: { mod: 'normal', icon: <CheckCircleFilled /> },
    [SEVERITY.AVERAGE]: { mod: 'average', icon: <ExclamationCircleFilled /> },
    [SEVERITY.DANGER]: { mod: 'danger', icon: <CloseCircleFilled /> },
    [SEVERITY.UNKNOWN]: { mod: 'unknown', icon: <MinusCircleFilled /> },
}

export default function CombinedResult({ data, showDiagnosis = true, embedded = false }) {
    const { t } = useTranslation()

    /** AI javobi bazada JSON matn sifatida saqlanadi. */
    const result = useMemo(() => {
        if (!data?.aiAnswerData) return null
        if (typeof data.aiAnswerData === 'object') return data.aiAnswerData
        try {
            return JSON.parse(data.aiAnswerData)
        } catch (err) {
            return null
        }
    }, [data])

    if (!data) return null

    if (data.status === -1) {
        return (
            <Alert
                type="error"
                showIcon
                message={t('error', { defaultValue: 'Xatolik' })}
                description={data.errorReason
                    || t('combined_failed', { defaultValue: 'Kompleks tahlil bajarilmadi. Qayta urinib ko\'ring.' })}
            />
        )
    }

    if (data.status === 0 || data.status === 1) {
        return (
            <div className="cai-pending">
                <Spin />
                <Text type="secondary">
                    {t('combined_processing', {
                        defaultValue: 'AI tahlil qilmoqda. Natija tayyor bo\'lgach shu yerda ko\'rinadi.',
                    })}
                </Text>
            </div>
        )
    }

    if (!result) return null

    const severity = parseSeverity(result.automatic_analysis_bool)
    const meta = SEVERITY_META[severity] ?? SEVERITY_META[SEVERITY.UNKNOWN]
    const findings = splitLines(result.automatic_analysis)
    const crossFindings = splitLines(result.cross_findings)
    const recommendations = splitLines(result.AI_recommendations)
    const redFlags = (Array.isArray(result.red_flags) ? result.red_flags : []).filter(hasText)
    const diagnoses = (Array.isArray(result.differential_diagnosis) ? result.differential_diagnosis : [])
        .filter((item) => hasText(item?.diagnosis))
        .sort((a, b) => probabilityRank(b?.probability) - probabilityRank(a?.probability))

    return (
        <div className={`arb ${embedded ? 'cai-embedded' : ''}`}>

            {/* ── 1. Yakuniy xulosa ── */}
            <div className={`arb-hero arb-hero--${meta.mod}`}>
                <div className="arb-hero-head">
                    <span className="arb-hero-badge">
                        {meta.icon} {severityLabel(result.automatic_analysis_bool, t)}
                    </span>
                    <span className="arb-hero-label">
                        {t('combined_final_summary', { defaultValue: 'Yakuniy xulosa' })}
                    </span>
                    {data.itemCount > 0 && (
                        <span className="cai-hero-note">
                            {t('combined_based_on', {
                                count: data.itemCount,
                                defaultValue: `${data.itemCount} ta tahlil asosida`,
                            })}
                        </span>
                    )}
                </div>
                {hasText(result.final_summary)
                    ? <p className="arb-hero-text">{result.final_summary}</p>
                    : <p className="arb-hero-text arb-muted">{t('ai_no_summary', { defaultValue: 'AI yakuniy xulosa bermadi' })}</p>}
            </div>

            {/* ── 2. Shoshilinch belgilar — xulosadan keyin DARHOL ── */}
            {redFlags.length > 0 && (
                <section className="arb-section cai-alarm">
                    <header className="arb-section-head">
                        <span className="arb-section-icon cai-icon--alarm"><AlertFilled /></span>
                        <h3 className="arb-section-title">
                            {t('combined_red_flags', { defaultValue: 'Shoshilinch e\'tibor talab qiladi' })}
                        </h3>
                        <span className="arb-section-count">{redFlags.length}</span>
                    </header>
                    <ul className="cai-alarm-list">
                        {redFlags.map((flag, index) => <li key={index}>{flag}</li>)}
                    </ul>
                </section>
            )}

            {/* ── 3. Aniqlangan holatlar ── */}
            {findings.length > 0 && (
                <Section
                    icon={<SearchOutlined />}
                    title={t('automatic_analysis', { defaultValue: 'Aniqlangan holatlar' })}
                    count={findings.length > 1 ? findings.length : null}
                >
                    {findings.length === 1
                        ? <p className="arb-plain">{findings[0]}</p>
                        : (
                            <ol className="arb-findings">
                                {findings.map((line, index) => (
                                    <li key={index} className="arb-finding">
                                        <span className="arb-finding-num">{index + 1}</span>
                                        <span>{line}</span>
                                    </li>
                                ))}
                            </ol>
                        )}
                </Section>
            )}

            {/* ── 4. Tahlillar orasidagi bog'liqliklar ── */}
            {crossFindings.length > 0 && (
                <Section
                    icon={<BranchesOutlined />}
                    iconClass="cai-icon--link"
                    title={t('combined_cross_findings', { defaultValue: 'Tahlillar orasidagi bog\'liqliklar' })}
                >
                    {crossFindings.length === 1
                        ? <p className="arb-plain">{crossFindings[0]}</p>
                        : <ul className="arb-recs cai-links">{crossFindings.map((line, i) => <li key={i}>{line}</li>)}</ul>}
                </Section>
            )}

            {/* ── 5. Ehtimoliy tashxislar ── */}
            {diagnoses.length > 0 && (
                <Section
                    icon={<QuestionCircleOutlined />}
                    iconClass="cai-icon--dx"
                    title={t('combined_differential', { defaultValue: 'Ehtimoliy tashxislar' })}
                    count={diagnoses.length}
                >
                    <div className="cai-dx-list">
                        {diagnoses.map((item, index) => {
                            const rank = probabilityRank(item?.probability)
                            return (
                                <div className={`cai-dx cai-dx--${rank === 3 ? 'high' : rank === 1 ? 'low' : 'mid'}`} key={index}>
                                    <div className="cai-dx-head">
                                        <p className="cai-dx-name">{item.diagnosis}</p>
                                        <span className="cai-dx-prob">
                                            <span className="cai-meter" aria-hidden="true">
                                                {[1, 2, 3].map((step) => (
                                                    <span key={step} className={step <= rank ? 'is-on' : ''} />
                                                ))}
                                            </span>
                                            {item.probability}
                                        </span>
                                    </div>
                                    {hasText(item.evidence) && <p className="cai-dx-evidence">{item.evidence}</p>}
                                </div>
                            )
                        })}
                    </div>
                </Section>
            )}

            {/* ── 6. AI tavsiyalari ── */}
            {recommendations.length > 0 && (
                <Section icon={<BulbOutlined />} title={t('ai_recommendations', { defaultValue: 'AI tavsiyalari' })}>
                    {recommendations.length === 1
                        ? <p className="arb-plain">{recommendations[0]}</p>
                        : <ul className="arb-recs">{recommendations.map((line, i) => <li key={i}>{line}</li>)}</ul>}
                </Section>
            )}

            {result.analiz_mumkinmi === false && (
                <Alert
                    type="warning"
                    showIcon
                    message={t('analysis_not_possible', { defaultValue: 'Tahlil qilib bo\'lmadi' })}
                    description={result.analiz_mumkin_emas_sababi}
                />
            )}

            {/* Shifokor xulosasi — kompleks xulosani YARATGAN shifokor
                o'z tashxisini yozadi (backend:
                `AnalysisDiagnosisController.IsDoctorAssigned`) */}
            {showDiagnosis && <DoctorDiagnosisBlock analysisType="combined" analysisId={data.id} />}
        </div>
    )
}

/** Sarlavhasi ikonka bilan belgilangan bo'lim (`arb-*` bilan bir xil). */
function Section({ icon, iconClass = '', title, count, children }) {
    return (
        <section className="arb-section">
            <header className="arb-section-head">
                <span className={`arb-section-icon ${iconClass}`} aria-hidden="true">{icon}</span>
                <h3 className="arb-section-title">{title}</h3>
                {count != null && <span className="arb-section-count">{count}</span>}
            </header>
            {children}
        </section>
    )
}

/**
 * "Avtomatik" belgisi — yangi tahlil tugaganda tizim o'zi yaratgan
 * kompleks xulosa (`isAuto`). Shifokor uni o'zi tanlaganidan ajratsin.
 */
export function CombinedAutoBadge({ isAuto }) {
    const { t } = useTranslation()
    if (!isAuto) return null
    return (
        <span
            className="cai-auto-badge"
            title={t('combined_auto_hint', {
                defaultValue: 'Yangi tahlil tugaganda bemorning barcha tahlillaridan tizim avtomatik yaratgan',
            })}
        >
            <ThunderboltFilled /> {t('combined_auto', { defaultValue: 'Avtomatik' })}
        </span>
    )
}

const hasText = (value) => !!value && !!String(value).trim()

/**
 * Ko'p qatorli AI matnini alohida punktlarga ajratadi.
 *
 * Model har bir topilmani yangi qatorda yozadi, lekin ba'zan qator
 * boshida `-` yoki `•` qo'yadi — ular olib tashlanadi, aks holda
 * ro'yxat belgisi ikki marta ko'rinardi.
 */
function splitLines(value) {
    if (!hasText(value)) return []
    return String(value)
        .split('\n')
        .map((line) => line.replace(/^\s*[-•*]\s*/, '').trim())
        .filter(Boolean)
}

/** Ehtimollik so'zi (uz/ru/en) → 3 (yuqori), 2 (o'rtacha), 1 (past). */
function probabilityRank(probability) {
    const value = String(probability || '').toLowerCase()
    if (value.includes('yuqori') || value.includes('высок') || value.includes('high')) return 3
    if (value.includes('past') || value.includes('низк') || value.includes('low')) return 1
    return 2
}
