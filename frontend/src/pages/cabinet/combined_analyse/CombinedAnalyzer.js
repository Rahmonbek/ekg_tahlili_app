/**
 * Yangi kompleks (ko'p tahlilli) AI xulosasi yaratish sahifasi
 * (`/combined-analyzer`).
 *
 * Umumiy tuzilish (`components/analyzer`): Bemor → Tahlillarni tanlash
 * + tayyorlik paneli. Farqi — bu yerda FAYL yuklanmaydi: bemorning
 * bazadagi TAYYOR tahlillari (2..10 ta) tanlanadi va birgalikda AI ga
 * yuboriladi.
 *
 * Ilgari tanlov 5 ustunli jadval edi: tor ekranda gorizontal aylantirish
 * kerak bo'lardi, nega ba'zi qatorlarni tanlab bo'lmasligi aytilmasdi va
 * 10 tadan ko'p tanlash mumkin edi (tugma shunchaki o'chib qolardi).
 * Endi har bir tahlil — bosiladigan kartochka; tanlab bo'lmaydiganida
 * sababi yoziladi, 10 ta tanlangach qolganlari bloklanadi.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Spin, Tag } from 'antd';
import { CheckOutlined, ExperimentOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { FaUserInjured } from 'react-icons/fa';

import {
    AnalyzerHeader, AnalyzerLayout, AnalyzerStep, Chip, PatientStep, ReadinessPanel,
} from '../../../components/analyzer/AnalyzerUI';
import { usePatientStep } from '../../../components/analyzer/useAnalyzerPage';
import EmptyState from '../../../components/shared/EmptyState';

import { get_patient_card } from '../../../host/requests/PatcientRequest';
import { create_combined_analysis } from '../../../host/requests/CombinedAnalysisRequest';
import { formatDate, formatDateTime } from '../../../tools/formatters';
import { severityColor, severityLabel } from '../../../tools/severity';
import { dangerAlert, warningAlert } from '../../../tools/Alerts';
import useDocumentTitle from '../../../tools/useDocumentTitle';
import { useTranslation } from 'react-i18next';

/** Kompleks tahlilga qo'shsa bo'ladigan turlar (backend bilan bir xil). */
const TYPE_META = {
    ecg: { color: 'red', key: 'analyse_ecg', short: 'EKG' },
    holter: { color: 'volcano', key: 'analyse_holter', short: 'Holter' },
    smad: { color: 'blue', key: 'analyse_smad', short: 'SMAD' },
    lab: { color: 'green', key: 'analyse_lab', short: 'Lab' },
}

const COMBINE_MIN = 2
const COMBINE_MAX = 10
// Ro'yxat uzun bo'lsa avval shuncha ko'rsatiladi
const PAGE_SIZE = 10

const rowKey = (row) => `${row.type}-${row.id}`

export default function CombinedAnalyzer() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    useDocumentTitle(t('new_combined_analysis', { defaultValue: 'Yangi kompleks tahlil' }))

    const patient = usePatientStep()
    const { patcient, checkReady, resetPatient, form, form1, setEditPatient } = patient

    const [timeline, setTimeline] = useState([])
    const [timelineLoading, setTimelineLoading] = useState(false)
    const [selectedKeys, setSelectedKeys] = useState([])
    const [typeFilter, setTypeFilter] = useState('all')
    const [visible, setVisible] = useState(PAGE_SIZE)
    const [submitting, setSubmitting] = useState(false)

    const lang = t('data_lang') === 'Ru' ? 'ru' : t('data_lang') === 'En' ? 'en' : 'uz'

    /** Bemor tanlangach uning BARCHA tahlillarini yuklaymiz. */
    const fetchTimeline = useCallback(async (patientId) => {
        setTimelineLoading(true)
        try {
            const res = await get_patient_card(patientId, { lang })
            setTimeline(res?.data?.timeline ?? [])
        } catch (err) {
            setTimeline([])
        } finally {
            setTimelineLoading(false)
        }
    }, [lang])

    useEffect(() => {
        if (checkReady && patcient?.id) fetchTimeline(patcient.id)
    }, [checkReady, patcient?.id, fetchTimeline])

    const clearSelection = useCallback(() => {
        setTimeline([])
        setSelectedKeys([])
        setTypeFilter('all')
        setVisible(PAGE_SIZE)
    }, [])

    // Qidiruv maydoni o'zgardi — boshqa bemor
    const resetOnSearchChange = useCallback(() => {
        resetPatient()
        setEditPatient(false)
        clearSelection()
        form.resetFields()
    }, [resetPatient, setEditPatient, clearSelection, form])

    const startOver = useCallback(() => {
        resetOnSearchChange()
        form1.resetFields()
    }, [resetOnSearchChange, form1])

    // Faqat kompleks tahlilga qo'shsa bo'ladigan turlar ko'rsatiladi
    // (shifokor xulosasi kabi yozuvlar bu yerda ma'nosiz)
    const rows = useMemo(() => timeline.filter((row) => TYPE_META[row.type]), [timeline])
    const counts = useMemo(() => rows.reduce((acc, row) => {
        acc[row.type] = (acc[row.type] || 0) + 1
        return acc
    }, {}), [rows])
    const filtered = typeFilter === 'all' ? rows : rows.filter((row) => row.type === typeFilter)
    const shown = filtered.slice(0, visible)

    const selectedRows = selectedKeys
        .map((key) => rows.find((row) => rowKey(row) === key))
        .filter(Boolean)
    const limitReached = selectedRows.length >= COMBINE_MAX

    const toggleRow = (row) => {
        const key = rowKey(row)
        setSelectedKeys((prev) => (
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        ))
    }

    const submit = async () => {
        setSubmitting(true)
        try {
            const res = await create_combined_analysis({
                patientId: patcient.id,
                items: selectedRows.map((row) => ({ type: row.type, id: row.id })),
                lang,
            })
            const combinedId = res?.data?.combined_id
            if (res?.data?.reused) {
                // Takror yaratilmadi — mavjudi ochiladi
                warningAlert(t('combined_duplicate', {
                    defaultValue: 'Bu tahlillar allaqachon AI ga birgalikda yuborilgan. Mavjud xulosa ochildi.',
                }))
            }
            if (combinedId) navigate(`/combined-analyses/view/${combinedId}`)
        } catch (err) {
            dangerAlert(
                err?.response?.data?.message
                || t('combined_failed', { defaultValue: 'Kompleks tahlil bajarilmadi. Qayta urinib ko\'ring.' })
            )
        } finally {
            setSubmitting(false)
        }
    }

    const selectionSummary = Object.entries(
        selectedRows.reduce((acc, row) => {
            acc[row.type] = (acc[row.type] || 0) + 1
            return acc
        }, {})
    ).map(([type, n]) => `${TYPE_META[type].short} × ${n}`).join(', ')

    const checklist = [
        {
            key: 'patient', ok: checkReady,
            label: t('analyzer_check_patient', { defaultValue: 'Bemor' }),
            value: checkReady ? [patcient?.lastName, patcient?.firstName].filter(Boolean).join(' ') : '',
            hint: t('analyzer_need_patient', { defaultValue: 'Avval bemorni toping' }),
        },
        {
            key: 'items',
            ok: selectedRows.length >= COMBINE_MIN && selectedRows.length <= COMBINE_MAX,
            label: `${t('combined_upload_check_items', { defaultValue: 'Tanlangan tahlillar' })}: ${selectedRows.length} / ${COMBINE_MAX}`,
            value: selectionSummary,
            hint: t('combined_upload_need_items', { defaultValue: 'Kamida 2 ta tahlilni tanlang' }),
        },
    ]

    const renderRow = (row) => {
        const meta = TYPE_META[row.type]
        const key = rowKey(row)
        const selected = selectedKeys.includes(key)
        const notReady = row.status !== 2
        const disabled = notReady || (!selected && limitReached)
        const date = row.analysisDate
            ? formatDate(row.analysisDate)
            : row.createdAt ? formatDateTime(row.createdAt) : '—'
        return (
            <button
                key={key}
                type="button"
                className={`anz-pick ${selected ? 'is-selected' : ''}`}
                aria-pressed={selected}
                disabled={disabled}
                onClick={() => toggleRow(row)}
            >
                <span className="anz-pick-box" aria-hidden="true">{selected && <CheckOutlined />}</span>
                <span className="anz-pick-main">
                    <span className="anz-pick-top">
                        <Tag color={meta.color}>{meta.short}</Tag>
                        <span className="anz-pick-doc">{row.documentNumber || '—'}</span>
                    </span>
                    <span className="anz-pick-meta">
                        <span>{date}</span>
                        {row.doctorName && <span>{row.doctorName}</span>}
                    </span>
                </span>
                <span className="anz-pick-side">
                    {row.severity != null && (
                        <Tag color={severityColor(row.severity)}>{severityLabel(row.severity, t)}</Tag>
                    )}
                    {notReady && (
                        <span className="anz-pick-reason">
                            {t('combined_upload_not_ready', { defaultValue: 'AI natijasi tayyor emas' })}
                        </span>
                    )}
                </span>
            </button>
        )
    }

    return (
        <div className="anz-page">
            <AnalyzerHeader
                title={t('new_combined_analysis', { defaultValue: 'Yangi kompleks tahlil' })}
                subtitle={t('combined_upload_subtitle', { defaultValue: 'Bemorni toping va birgalikda tahlil qilinadigan 2–10 ta tayyor tahlilni tanlang.' })}
            />

            <AnalyzerLayout
                aside={(
                    <ReadinessPanel
                        items={checklist}
                        submitIcon={<ExperimentOutlined />}
                        submitLabel={t('send_to_ai', { defaultValue: 'AI ga yuborish' })}
                        loading={submitting}
                        onSubmit={submit}
                        note={t('combine_deep_note', {
                            defaultValue: 'Tahlillarning AI xulosalari bilan birga EKG rasmlari ham AI ga yuboriladi, shuning uchun javob bir necha daqiqa olishi mumkin.',
                        })}
                    />
                )}
            >
                <PatientStep
                    patient={patient}
                    onSearchChange={resetOnSearchChange}
                    onStartOver={startOver}
                />

                <AnalyzerStep
                    number={2}
                    title={t('select_analyses_to_combine', { defaultValue: 'Birgalikda tahlil qilinadigan tahlillarni tanlang' })}
                    hint={t('combine_hint', { defaultValue: 'Faqat AI natijasi tayyor bo\'lgan tahlillarni birlashtirish mumkin.' })}
                    done={checklist[1].ok}
                    locked={!checkReady}
                    lockedText={t('analyzer_need_patient', { defaultValue: 'Avval bemorni toping' })}
                >
                    {timelineLoading ? (
                        <div className="anz-pick-loading"><Spin /></div>
                    ) : rows.length === 0 ? (
                        <div className="anz-pick-empty">
                            <EmptyState
                                icon={<FaUserInjured />}
                                message={t('no_analyses', { defaultValue: 'Tahlillar topilmadi' })}
                            />
                        </div>
                    ) : (
                        <>
                            <div className="anz-pick-toolbar">
                                <div className="anz-chips">
                                    <Chip
                                        selected={typeFilter === 'all'}
                                        onClick={() => { setTypeFilter('all'); setVisible(PAGE_SIZE) }}
                                    >
                                        {t('all', { defaultValue: 'Barchasi' })}
                                        <span className="anz-chip-count">{rows.length}</span>
                                    </Chip>
                                    {Object.keys(TYPE_META).filter((type) => counts[type]).map((type) => (
                                        <Chip
                                            key={type}
                                            selected={typeFilter === type}
                                            onClick={() => { setTypeFilter(type); setVisible(PAGE_SIZE) }}
                                        >
                                            {TYPE_META[type].short}
                                            <span className="anz-chip-count">{counts[type]}</span>
                                        </Chip>
                                    ))}
                                </div>
                                {selectedRows.length > 0 && (
                                    <Button type="link" onClick={() => setSelectedKeys([])}>
                                        {t('combined_upload_clear', { defaultValue: 'Tanlovni tozalash' })}
                                    </Button>
                                )}
                            </div>

                            {limitReached && (
                                <p className="anz-note" style={{ marginTop: 0, marginBottom: 10 }}>
                                    {t('combined_upload_limit', { defaultValue: 'Ko\'pi bilan 10 ta tahlil tanlash mumkin.' })}
                                </p>
                            )}

                            <div className="anz-pick-list">
                                {shown.map(renderRow)}
                            </div>

                            {filtered.length > visible && (
                                <Button className="anz-more" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                                    {t('combined_upload_show_more', { defaultValue: 'Yana ko\'rsatish' })} ({filtered.length - visible})
                                </Button>
                            )}
                        </>
                    )}
                </AnalyzerStep>
            </AnalyzerLayout>
        </div>
    )
}
