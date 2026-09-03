import React, { useMemo } from 'react'
import { Alert, Spin, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import DoctorDiagnosisBlock from './DoctorDiagnosisBlock'
import { parseSeverity, SEVERITY } from '../../tools/severity'
import '../../pages/cabinet/combined_analyse/CombinedAnalyse.css'

const { Text } = Typography

/**
 * Kompleks (ko'p tahlilli) AI xulosasining natijasi.
 *
 * Ikki joyda ishlatiladi va shuning uchun alohida komponent:
 *  * `/combined-analyses/view/:id` — to'liq sahifa;
 *  * bemor kartasidagi ro'yxat — qatorni ochganda O'SHA sahifaning
 *    o'zida.
 *
 * Dizayn qoidasi: har bir bo'limning O'Z vizual roli bor. Ilgari
 * hammasi bir xil `Card` edi va shifokor eng muhim xulosani darhol
 * ajrata olmasdi:
 *   * yakuniy xulosa — jiddiylik rangi bilan ajratilgan "hero" blok;
 *   * aniqlangan holatlar — raqamlangan qatorlar (har biri alohida);
 *   * shoshilinch topilmalar — qizil blok;
 *   * ehtimoliy tashxislar — kartochkalar (jadval emas: "Asos" ustuni
 *     tor jadvalda siqilib, o'qib bo'lmasdi).
 *
 * `data` — `GET /api/combined-analyses/{id}` javobi.
 */
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
            <div style={{ textAlign: 'center', padding: 32 }}>
                <Spin />
                <div style={{ marginTop: 12 }}>
                    <Text type="secondary">
                        {t('combined_processing', {
                            defaultValue: 'AI tahlil qilmoqda. Natija tayyor bo\'lgach shu yerda ko\'rinadi.',
                        })}
                    </Text>
                </div>
            </div>
        )
    }

    if (!result) return null

    const heroClass = {
        [SEVERITY.NORMAL]: 'is-normal',
        [SEVERITY.AVERAGE]: 'is-average',
        [SEVERITY.DANGER]: 'is-danger',
    }[parseSeverity(result.automatic_analysis_bool)] || ''

    const findings = splitLines(result.automatic_analysis)
    const recommendations = splitLines(result.AI_recommendations)
    const redFlags = Array.isArray(result.red_flags) ? result.red_flags : []
    const diagnoses = Array.isArray(result.differential_diagnosis) ? result.differential_diagnosis : []

    return (
        <div className={embedded ? 'cai-embedded' : undefined}>

            {/* Yakuniy xulosa — sahifaning eng muhim bloki, shuning uchun
                eng yuqorida va jiddiylik rangi bilan ajratilgan */}
            {hasText(result.final_summary) && (
                <div className={`cai-hero ${heroClass}`}>
                    <div className="cai-section-head">
                        <span className="cai-section-icon" style={{ background: '#e6f7f4', color: '#00806f' }}>◆</span>
                        <p className="cai-section-title">
                            {t('combined_final_summary', { defaultValue: 'Yakuniy xulosa' })}
                        </p>
                    </div>
                    <p className="cai-hero-text">{result.final_summary}</p>
                </div>
            )}

            {/* Aniqlangan holatlar — har bir topilma alohida raqamlangan
                qator: ilgari uzun bitta paragraf edi va topilmalarni
                bir-biridan ajratish qiyin edi */}
            {findings.length > 0 && (
                <Section
                    icon="!"
                    iconStyle={{ background: '#fdf3e2', color: '#b45309' }}
                    title={t('automatic_analysis', { defaultValue: 'Aniqlangan holatlar' })}
                >
                    {findings.map((line, index) => (
                        <div className="cai-finding" key={index}>
                            <span className="cai-finding-num">{index + 1}</span>
                            <p className="cai-finding-text">{line}</p>
                        </div>
                    ))}
                </Section>
            )}

            {/* Shoshilinch topilmalar — qizil, aniqlangan holatlardan
                keyin darhol ko'zga tashlanadi */}
            {redFlags.length > 0 && (
                <Section
                    className="is-alarm"
                    icon="⚠"
                    iconStyle={{ background: '#fdecec', color: '#b91c1c' }}
                    title={t('combined_red_flags', { defaultValue: 'Shoshilinch e\'tibor talab qiladi' })}
                >
                    {redFlags.map((flag, index) => (
                        <div className="cai-alarm-item" key={index}>
                            <span>•</span>
                            <span>{flag}</span>
                        </div>
                    ))}
                </Section>
            )}

            {/* Tahlillar orasidagi bog'liqliklar — kompleks tahlilning
                asosiy qiymati, shuning uchun alohida bo'lim */}
            {hasText(result.cross_findings) && (
                <Section
                    icon="⇄"
                    iconStyle={{ background: '#ebf2fe', color: '#1a65d1' }}
                    title={t('combined_cross_findings', { defaultValue: 'Tahlillar orasidagi bog\'liqliklar' })}
                >
                    <p className="cai-text">{result.cross_findings}</p>
                </Section>
            )}

            {/* Ehtimoliy tashxislar — kartochkalar */}
            {diagnoses.length > 0 && (
                <Section
                    icon="?"
                    iconStyle={{ background: '#f3eefe', color: '#6d28d9' }}
                    title={t('combined_differential', { defaultValue: 'Ehtimoliy tashxislar' })}
                >
                    {diagnoses.map((item, index) => (
                        <div className="cai-dx" key={index}>
                            <div className="cai-dx-head">
                                <p className="cai-dx-name">{item?.diagnosis}</p>
                                <span className={`cai-dx-prob ${probabilityClass(item?.probability)}`}>
                                    {item?.probability}
                                </span>
                            </div>
                            {item?.evidence && <p className="cai-dx-evidence">{item.evidence}</p>}
                        </div>
                    ))}
                </Section>
            )}

            {/* AI tavsiyalari — bajariladigan qadamlar ro'yxati */}
            {recommendations.length > 0 && (
                <Section
                    icon="✓"
                    iconStyle={{ background: '#e6f7f4', color: '#00806f' }}
                    title={t('ai_recommendations', { defaultValue: 'AI tavsiyalari' })}
                >
                    {recommendations.map((line, index) => (
                        <div className="cai-rec" key={index}>
                            <span className="cai-rec-dot" />
                            <span>{line}</span>
                        </div>
                    ))}
                </Section>
            )}

            {result.analiz_mumkinmi === false && (
                <Alert
                    type="warning"
                    showIcon
                    style={{ marginBottom: 12 }}
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

/** Sarlavhasi ikonka bilan belgilangan bo'lim. */
function Section({ icon, iconStyle, title, className = '', children }) {
    return (
        <div className={`cai-section ${className}`}>
            <div className="cai-section-head">
                <span className="cai-section-icon" style={iconStyle}>{icon}</span>
                <p className="cai-section-title">{title}</p>
            </div>
            {children}
        </div>
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

/** Ehtimollik so'zi (uz/ru/en) → rang klassi. */
function probabilityClass(probability) {
    const value = String(probability || '').toLowerCase()
    if (value.includes('yuqori') || value.includes('высок') || value.includes('high')) return 'is-high'
    if (value.includes('past') || value.includes('низк') || value.includes('low')) return 'is-low'
    return 'is-mid'
}
