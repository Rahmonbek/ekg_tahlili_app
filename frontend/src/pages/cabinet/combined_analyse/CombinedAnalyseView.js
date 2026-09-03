import React, { useCallback, useEffect, useState } from 'react'
import { Button, Skeleton, Tag } from 'antd'
import { FilePdfOutlined } from '@ant-design/icons'
import { IoArrowBack } from 'react-icons/io5'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { FaUserInjured } from 'react-icons/fa'
import { get_combined_analysis } from '../../../host/requests/CombinedAnalysisRequest'
import { calculateAge, formatDate, formatDateTime, personName } from '../../../tools/formatters'
import { severityColor, severityLabel } from '../../../tools/severity'
import EmptyState from '../../../components/shared/EmptyState'
import CombinedResult from '../../../components/results/CombinedResult'
import { downloadReport } from '../../../host/requests/ReportRequest'
import { dangerAlert } from '../../../tools/Alerts'
import useDocumentTitle from '../../../tools/useDocumentTitle'
import './CombinedAnalyse.css'

/**
 * Tahlil turi → ko'rish sahifasi, nom kaliti va chip rangi.
 * Ranglar `theme.js` shkalasidan, bemor kartasidagi teglar bilan bir xil.
 */
const TYPE_META = {
    ecg: { path: 'ecg-analyses', key: 'analyse_ecg', color: '#dc2626' },
    holter: { path: 'holter-analyses', key: 'analyse_holter', color: '#ea580c' },
    smad: { path: 'smad-analyses', key: 'analyse_smad', color: '#2563eb' },
    lab: { path: 'lab-analyses', key: 'analyse_lab', color: '#16a34a' },
}

/** Jiddiylik darajasi → nuqta rangi (severity.js bilan bir xil mantiq). */
const DOT_COLOR = { 1: '#16a34a', 2: '#f59e0b', 3: '#dc2626' }

/** Natija hali tayyor bo'lmaganda shu oraliqda qayta so'raladi. */
const POLL_MS = 4000

/**
 * Kompleks (ko'p tahlilli) AI xulosasi — ko'rish sahifasi.
 *
 * Sarlavha va meta kartochkalar boshqa tahlil ko'rish sahifalari bilan
 * BIR XIL vizual tilda (`analysis-view-*` klasslari, `App.css`) — ilgari
 * bu sahifa `Descriptions` jadvali bilan boshqacha ko'rinardi va tizimdan
 * ajralib turardi.
 */
export default function CombinedAnalyseView() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { id } = useParams()

    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)
    const [pdfLoading, setPdfLoading] = useState(false)

    const lang = t('data_lang') === 'Ru' ? 'ru' : t('data_lang') === 'En' ? 'en' : 'uz'

    useDocumentTitle(t('combined_analysis', { defaultValue: 'Kompleks AI xulosa' }))

    const fetchData = useCallback(async () => {
        try {
            const res = await get_combined_analysis(id)
            setData(res?.data ?? null)
            setNotFound(false)
        } catch (err) {
            setData(null)
            setNotFound(true)
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => { fetchData() }, [fetchData])

    // AI fon rejimida ishlaydi — tayyor bo'lguncha holatni so'rab turamiz
    useEffect(() => {
        if (!data || data.status === 2 || data.status === -1) return undefined
        const timer = setInterval(fetchData, POLL_MS)
        return () => clearInterval(timer)
    }, [data, fetchData])

    const downloadPdf = async () => {
        setPdfLoading(true)
        try {
            await downloadReport('combined-ai', id, lang)
        } catch (err) {
            dangerAlert(t('pdf_download_failed', {
                defaultValue: "PDF yuklab bo'lmadi. Qayta urinib ko'ring.",
            }))
        } finally {
            setPdfLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="main_card">
                <div className="main_card_content big_card_content">
                    <Skeleton active paragraph={{ rows: 8 }} />
                </div>
            </div>
        )
    }

    if (notFound || !data) {
        return (
            <div className="main_card">
                <div className="main_card_content big_card_content">
                    <EmptyState
                        icon={<FaUserInjured />}
                        message={t('combined_not_found', { defaultValue: 'Kompleks xulosa topilmadi' })}
                    />
                    <div style={{ textAlign: 'center' }}>
                        <Button onClick={() => navigate('/combined-analyses')} icon={<IoArrowBack />}>
                            {t('back', { defaultValue: 'Orqaga' })}
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    const patientName = personName({
        firstName: data.patientFirstName,
        lastName: data.patientLastName,
        sureName: data.patientSureName,
    })

    const ageText = data.patientBirthDate
        ? `${formatDate(data.patientBirthDate)} · ${calculateAge(data.patientBirthDate)} ${t('age', { defaultValue: 'yosh' })}`
        : '—'

    return (
        <div className="main_card">
            <div className="main_card_content big_card_content">

                {/* ── Sarlavha: boshqa tahlil sahifalari bilan bir xil ── */}
                <div className="analysis-view-header">
                    <div className="analysis-view-actions">
                        <div className="analysis-view-actions-left">
                            <Button
                                onClick={() => navigate(`/patcients/${data.patientId}`)}
                                icon={<IoArrowBack />}
                                className="btn_form mini_btn_main analysis-view-back-btn"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                            >
                                {t('back', { defaultValue: 'Orqaga' })}
                            </Button>
                        </div>
                        <div className="analysis-view-actions-right">
                            {data.status === 2 && (
                                <Button
                                    type="primary"
                                    icon={<FilePdfOutlined />}
                                    loading={pdfLoading}
                                    onClick={downloadPdf}
                                    className="analysis-view-download-btn"
                                >
                                    {t('download_pdf', { defaultValue: 'PDF yuklab olish' })}
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="analysis-view-meta-grid">
                        <div className="analysis-view-meta-card">
                            <p className="analysis-view-meta-label">
                                {t('patcient', { defaultValue: 'Bemor' })}
                            </p>
                            <p className="analysis-view-meta-value" title={patientName || ''}>
                                {patientName || '—'}
                            </p>
                            <p className="analysis-view-meta-sub">
                                {ageText} · {data.patientGender
                                    ? t('male', { defaultValue: 'Erkak' })
                                    : t('female', { defaultValue: 'Ayol' })}
                            </p>
                        </div>

                        <div className="analysis-view-meta-card">
                            <p className="analysis-view-meta-label">
                                {t('doctor', { defaultValue: 'Shifokor' })}
                            </p>
                            <p className="analysis-view-meta-value" title={data.doctorName || ''}>
                                {data.doctorName || '—'}
                            </p>
                            <p className="analysis-view-meta-sub">
                                {data.createdAt ? formatDateTime(data.createdAt) : '—'}
                            </p>
                        </div>

                        <div className="analysis-view-meta-card">
                            <p className="analysis-view-meta-label">
                                {t('conclusion', { defaultValue: 'Xulosa' })}
                            </p>
                            <div className="analysis-view-meta-row">
                                {data.status === 2 ? (
                                    <Tag color={severityColor(data.aiStatus)}>
                                        {severityLabel(data.aiStatus, t)}
                                    </Tag>
                                ) : data.status === -1 ? (
                                    <Tag color="error">{t('error', { defaultValue: 'Xatolik' })}</Tag>
                                ) : (
                                    <Tag color="processing">
                                        {t('ai_processing', { defaultValue: 'AI tahlil qilmoqda' })}
                                    </Tag>
                                )}
                            </div>
                            <p className="analysis-view-meta-sub">
                                {t('combined_analysis', { defaultValue: 'Kompleks AI xulosa' })}
                            </p>
                        </div>

                        <div className="analysis-view-meta-card">
                            <p className="analysis-view-meta-label">
                                {t('combined_sources', { defaultValue: 'Xulosaga kirgan tahlillar' })}
                            </p>
                            <p className="analysis-view-meta-value">{data.itemCount}</p>
                            <p className="analysis-view-meta-sub">
                                {t('analyses', { defaultValue: 'Tahlillar' })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Manba tahlillar: jadval emas, bosiladigan chiplar ──
                    Jadvalda to'rt ustundan uchtasi deyarli bo'sh edi va
                    ko'p joy egallardi. Chip bir qarashda o'qiladi. */}
                <div className="cai-section">
                    <div className="cai-section-head">
                        <span className="cai-section-icon" style={{ background: '#eef2f7', color: '#475569' }}>▤</span>
                        <p className="cai-section-title">
                            {t('combined_sources', { defaultValue: 'Xulosaga kirgan tahlillar' })}
                        </p>
                    </div>
                    <div className="cai-sources">
                        {(data.items || []).map((item) => {
                            const meta = TYPE_META[item.type]
                            const openable = !!meta && item.exists
                            return (
                                <div
                                    key={`${item.type}-${item.analysisId}`}
                                    className={`cai-source ${openable ? '' : 'is-gone'}`}
                                    onClick={openable
                                        ? () => navigate(`/${meta.path}/view/${item.analysisId}`)
                                        : undefined}
                                    title={openable
                                        ? t('open', { defaultValue: 'Ochish' })
                                        : t('analysis_deleted', { defaultValue: "O'chirilgan" })}
                                >
                                    <span
                                        className="cai-source-bar"
                                        style={{ background: meta?.color || '#94a3b8' }}
                                    />
                                    <span>
                                        <span className="cai-source-name">
                                            {meta ? t(meta.key) : item.type}
                                        </span>
                                        <span className="cai-source-date" style={{ display: 'block' }}>
                                            {item.date ? formatDate(item.date) : '—'}
                                        </span>
                                    </span>
                                    {item.severity != null && (
                                        <span
                                            className="cai-source-dot"
                                            style={{ background: DOT_COLOR[item.severity] || '#cbd5e1' }}
                                            title={severityLabel(item.severity, t)}
                                        />
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Natija ko'rsatish `CombinedResult` da — u bemor
                    kartasida ham (qatorni ochganda) ishlatiladi */}
                <CombinedResult data={data} />

            </div>
        </div>
    )
}
