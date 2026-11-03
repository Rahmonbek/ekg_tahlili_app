import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Collapse, DatePicker, Drawer, Image, Input, Modal, Select, Skeleton, Switch, Table, Tooltip } from 'antd'
import { DeleteOutlined, EyeOutlined, UndoOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { sa_analyses, sa_analysis, sa_delete_analysis, sa_restore_analysis } from '../../../host/requests/SuperAdminRequest'
import { buildFileUrl } from '../../../host/Host'
import AnalysisResultBody from '../../../components/results/AnalysisResultBody'
import CombinedResult from '../../../components/results/CombinedResult'
import parseAiResult from '../../../tools/aiResult'
import useDocumentTitle from '../../../tools/useDocumentTitle'
import {
    ANALYSIS_TYPES, fmtDate, fmtDateTime, fmtNum, fmtPhone, personFullName, SeverityTag, StatusTag,
    typeLabel, TypeTag, useClinicOptions,
} from './saCommon'
import '../../../components/results/AnalysisResult.css'
import './SuperAdmin.css'

const PAGE_SIZE = 20
const RESTORABLE = ['ecg', 'holter', 'smad', 'lab']
const IMAGE_RE = /\.(png|jpe?g|webp|gif|bmp)$/i

/**
 * Barcha tahlillar (SA-18): 6 turdagi tahlil bitta jadvalda, platforma
 * bo'yicha. URL parametrlari (`status`, `clinicId`, `patientId`, `open=tur-id`)
 * boshqa sahifalardan to'g'ridan-to'g'ri filtr bilan ochish uchun.
 */
export default function SaAnalyses() {
    const { t } = useTranslation()
    useDocumentTitle(t('sa_analyses', { defaultValue: 'Tahlillar' }))
    const [params, setParams] = useSearchParams()
    const clinics = useClinicOptions()

    const [rows, setRows] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [type, setType] = useState(params.get('type'))
    const [status, setStatus] = useState(params.get('status'))
    const [clinicId, setClinicId] = useState(params.get('clinicId') ? Number(params.get('clinicId')) : null)
    const patientId = params.get('patientId') ? Number(params.get('patientId')) : null
    const [range, setRange] = useState([null, null])
    const [deleted, setDeleted] = useState(false)
    const [open, setOpen] = useState(null)
    const [toDelete, setToDelete] = useState(null)

    // Dashboard'dan "open=ecg-12" bilan kelinganda tafsilot darhol ochiladi
    useEffect(() => {
        const o = params.get('open')
        if (o) {
            const [ty, id] = o.split('-')
            if (ty && id) setOpen({ type: ty, id: Number(id) })
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const load = useCallback(async (p = page) => {
        setLoading(true)
        try {
            const q = { page: p, pageSize: PAGE_SIZE, deleted }
            if (type) q.type = type
            if (status) q.status = status
            if (clinicId) q.clinicId = clinicId
            if (patientId) q.patientId = patientId
            if (search.trim()) q.search = search.trim()
            if (range?.[0]) q.from = range[0].format('YYYY-MM-DD')
            if (range?.[1]) q.to = range[1].format('YYYY-MM-DD')
            const res = await sa_analyses(q)
            setRows(res.data?.data ?? [])
            setTotal(res.data?.totalCount ?? 0)
        } catch { /* interceptor */ } finally {
            setLoading(false)
        }
    }, [page, type, status, clinicId, patientId, search, range, deleted])

    useEffect(() => { load(page) }, [page, type, status, clinicId, patientId, range, deleted]) // eslint-disable-line react-hooks/exhaustive-deps

    const resetPage = (fn) => (v) => { setPage(1); fn(v ?? null) }

    const restore = async (r) => {
        try { await sa_restore_analysis(r.type, r.id); load(page) } catch { /* interceptor */ }
    }

    const columns = [
        { title: t('sa_type', { defaultValue: 'Turi' }), dataIndex: 'type', width: 120, render: (v) => <TypeTag type={v} t={t} /> },
        {
            title: t('sa_document', { defaultValue: 'Hujjat' }), key: 'doc', width: 170,
            render: (_, r) => (
                <div>
                    <div className="sa-cell-main">{r.documentNumber || `#${r.id}`}</div>
                    <div className="sa-cell-sub">{fmtDateTime(r.createdAt)}</div>
                </div>
            ),
        },
        {
            title: t('sa_patient', { defaultValue: 'Bemor' }), dataIndex: 'patient', ellipsis: true,
            render: (v, r) => (r.patientId
                ? <Link to={`/sa/analyses?patientId=${r.patientId}`} onClick={(e) => e.stopPropagation()}>{(v || '').trim() || `#${r.patientId}`}</Link>
                : '—'),
        },
        {
            title: t('sa_clinic', { defaultValue: 'Klinika' }), dataIndex: 'clinicName', ellipsis: true,
            render: (v, r) => (r.clinicId
                ? <Link to={`/sa/clinics/${r.clinicId}`} onClick={(e) => e.stopPropagation()}>{v || `#${r.clinicId}`}</Link>
                : '—'),
        },
        { title: t('sa_uploaded_by', { defaultValue: 'Yuklagan' }), dataIndex: 'doctor', ellipsis: true, width: 140, render: (v) => (v || '').trim() || '—' },
        { title: t('sa_status', { defaultValue: 'Holati' }), dataIndex: 'status', width: 96, render: (v) => <StatusTag status={v} t={t} /> },
        { title: t('sa_severity_short', { defaultValue: 'Jiddiylik' }), dataIndex: 'severity', width: 104, render: (v, r) => (r.status === 2 ? <SeverityTag value={v} t={t} /> : <span className="sa-muted">—</span>) },
        {
            title: '', key: 'actions', width: 88, fixed: 'right',
            render: (_, r) => (
                <div className="sa-actions" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title={t('view', { defaultValue: "Ko'rish" })}>
                        <Button type="text" icon={<EyeOutlined />} onClick={() => setOpen({ type: r.type, id: r.id })} />
                    </Tooltip>
                    {deleted ? (
                        RESTORABLE.includes(r.type) && (
                            <Tooltip title={t('sa_restore', { defaultValue: 'Tiklash' })}>
                                <Button type="text" icon={<UndoOutlined />} onClick={() => restore(r)} />
                            </Tooltip>
                        )
                    ) : (
                        <Tooltip title={t('delete', { defaultValue: "O'chirish" })}>
                            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => setToDelete(r)} />
                        </Tooltip>
                    )}
                </div>
            ),
        },
    ]

    return (
        <div className="sa">
            <div className="main_card">
                <h1>
                    <span>
                        {t('sa_analyses', { defaultValue: 'Tahlillar' })}<span className="sa-head-sub">{fmtNum(total)}</span>
                    </span>
                    <span className="sa-head-actions" style={{ fontSize: 14, fontWeight: 500 }}>
                        <Switch size="small" checked={deleted} onChange={(v) => { setPage(1); setDeleted(v) }} />
                        {t('sa_show_deleted', { defaultValue: "O'chirilganlar" })}
                    </span>
                </h1>
                <div className="main_card_content">
                    {patientId ? (
                        <div className="sa-impersonation" style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#1e40af' }}>
                            <span>{t('sa_filtered_patient', { defaultValue: 'Faqat bitta bemorning tahlillari' })} (#{patientId})</span>
                            <Button size="small" onClick={() => { params.delete('patientId'); setParams(params); setPage(1) }}>
                                {t('sa_clear_filter', { defaultValue: 'Filtrni olib tashlash' })}
                            </Button>
                        </div>
                    ) : null}
                    <div className="sa-filters">
                        <div className="sa-filter">
                            <label>{t('search', { defaultValue: 'Qidiruv' })}</label>
                            <Input.Search allowClear
                                placeholder={t('sa_analysis_search_ph', { defaultValue: 'Bemor, hujjat raqami yoki ID' })}
                                value={search} onChange={(e) => setSearch(e.target.value)}
                                onSearch={() => { setPage(1); load(1) }} />
                        </div>
                        <div className="sa-filter">
                            <label>{t('sa_type', { defaultValue: 'Turi' })}</label>
                            <Select allowClear placeholder={t('sa_all', { defaultValue: 'Barchasi' })} value={type}
                                onChange={resetPage(setType)}
                                options={ANALYSIS_TYPES.map((m) => ({ value: m.key, label: typeLabel(m.key, t) }))} />
                        </div>
                        <div className="sa-filter">
                            <label>{t('sa_status', { defaultValue: 'Holati' })}</label>
                            <Select allowClear placeholder={t('sa_all', { defaultValue: 'Barchasi' })} value={status}
                                onChange={resetPage(setStatus)}
                                options={[
                                    { value: 'ready', label: t('sa_status_ready', { defaultValue: 'Tayyor' }) },
                                    { value: 'pending', label: t('sa_status_pending', { defaultValue: 'Kutmoqda' }) },
                                    { value: 'failed', label: t('sa_status_failed', { defaultValue: 'Xato' }) },
                                    { value: 'severe', label: t('sa_sev_severe', { defaultValue: 'Jiddiy' }) },
                                ]} />
                        </div>
                        <div className="sa-filter">
                            <label>{t('sa_clinic', { defaultValue: 'Klinika' })}</label>
                            <Select allowClear showSearch optionFilterProp="label" placeholder={t('sa_all', { defaultValue: 'Barchasi' })}
                                value={clinicId} onChange={resetPage(setClinicId)} options={clinics} />
                        </div>
                        <div className="sa-filter">
                            <label>{t('sa_period', { defaultValue: 'Davr' })}</label>
                            <DatePicker.RangePicker format="DD.MM.YYYY" value={range}
                                onChange={(v) => { setPage(1); setRange(v ?? [null, null]) }} />
                        </div>
                    </div>

                    <Table
                        rowKey={(r) => `${r.type}-${r.id}`}
                        size="middle"
                        loading={loading}
                        columns={columns}
                        dataSource={rows}
                        scroll={{ x: 980 }}
                        rowClassName={() => 'sa-row-click'}
                        onRow={(r) => ({ onClick: () => setOpen({ type: r.type, id: r.id }) })}
                        pagination={{ current: page, pageSize: PAGE_SIZE, total, onChange: setPage, showSizeChanger: false }}
                    />
                </div>
            </div>

            <AnalysisDrawer target={open} onClose={() => setOpen(null)}
                onDelete={(r) => setToDelete(r)} onRestore={(r) => { restore(r); setOpen(null) }} />
            <DeleteAnalysisModal target={toDelete} onClose={() => setToDelete(null)}
                onDone={() => { setToDelete(null); setOpen(null); load(page) }} />
        </div>
    )
}

/** Tahlil tafsiloti: meta, fayl, AI natijasi (mavjud natija komponentlari bilan), xom JSON. */
function AnalysisDrawer({ target, onClose, onDelete, onRestore }) {
    const { t } = useTranslation()
    const [data, setData] = useState(null)

    useEffect(() => {
        if (!target) { setData(null); return }
        setData(null)
        sa_analysis(target.type, target.id).then((r) => setData(r.data)).catch(() => setData(false))
    }, [target])

    const parsed = useMemo(() => (data?.aiAnswerData ? parseAiResult(data.aiAnswerData) : null), [data])
    const raw = useMemo(() => {
        if (!data?.aiAnswerData) return null
        try { return JSON.stringify(JSON.parse(data.aiAnswerData), null, 2) } catch { return String(data.aiAnswerData) }
    }, [data])

    const type = target?.type
    const isClassic = ['ecg', 'holter', 'smad', 'lab'].includes(type)
    const image = type === 'ecg' ? data?.fileLink : null

    const meta = data ? [
        [t('sa_type', { defaultValue: 'Turi' }), <TypeTag type={type} t={t} />],
        [t('sa_status', { defaultValue: 'Holati' }), <StatusTag status={data.status} t={t} />],
        [t('sa_severity_short', { defaultValue: 'Jiddiylik' }), <SeverityTag value={data.severity ?? parsed?.automatic_analysis_bool} t={t} />],
        [t('sa_document', { defaultValue: 'Hujjat' }), data.documentNumber || `#${data.id}`],
        [t('sa_patient', { defaultValue: 'Bemor' }), personFullName(data.patient)],
        [t('birthdate', { defaultValue: "Tug'ilgan sana" }), fmtDate(data.patient?.birthDate)],
        [t('sa_clinic', { defaultValue: 'Klinika' }), data.clinicId ? <Link to={`/sa/clinics/${data.clinicId}`}>{data.clinicName}</Link> : '—'],
        [t('sa_uploaded_by', { defaultValue: 'Yuklagan' }), `${personFullName(data.doctor)}${data.doctor?.phone ? ` · ${fmtPhone(data.doctor.phone)}` : ''}`],
        [t('sa_created', { defaultValue: 'Yuklangan' }), fmtDateTime(data.createdAt)],
        [t('sa_analysis_date', { defaultValue: 'Tahlil sanasi' }), fmtDate(data.analysisDate)],
        [t('sa_ai_lang', { defaultValue: 'AI tili' }), data.aiLang || '—'],
        ...(data.modelUsed ? [['Model', `${data.modelUsed}${data.isAuto ? ' · auto' : ''}`]] : []),
        ...(data.deletedAt ? [[t('sa_deleted_at', { defaultValue: "O'chirilgan" }), `${fmtDateTime(data.deletedAt)} — ${data.deleteReason || ''}`]] : []),
    ] : []

    return (
        <Drawer
            open={!!target}
            onClose={onClose}
            width={Math.min(860, typeof window !== 'undefined' ? window.innerWidth : 860)}
            title={target ? `${typeLabel(target.type, t)} #${target.id}` : ''}
            rootClassName="sa"
            extra={data ? (
                data.deletedAt
                    ? RESTORABLE.includes(type) && <Button icon={<UndoOutlined />} onClick={() => onRestore({ type, id: data.id })}>{t('sa_restore', { defaultValue: 'Tiklash' })}</Button>
                    : <Button danger icon={<DeleteOutlined />} onClick={() => onDelete({ type, id: data.id, documentNumber: data.documentNumber })}>{t('delete', { defaultValue: "O'chirish" })}</Button>
            ) : null}
        >
            {data === null && <Skeleton active paragraph={{ rows: 10 }} />}
            {data === false && <div className="sa-empty">{t('sa_not_found', { defaultValue: 'Topilmadi' })}</div>}
            {data && (
                <>
                    <div className="sa-info-grid sa-drawer-meta">
                        {meta.map(([label, value]) => (
                            <div className="sa-info-item" key={label}><label>{label}</label><div>{value}</div></div>
                        ))}
                    </div>

                    {image && IMAGE_RE.test(image) ? (
                        <div style={{ marginBottom: 16 }}>
                            <Image src={buildFileUrl(image)} style={{ width: '100%', maxHeight: 380, objectFit: 'contain', borderRadius: 8, background: '#f1f5f9' }} />
                        </div>
                    ) : null}
                    {!isClassic && data.fileLink ? (
                        <p><a href={buildFileUrl(data.fileLink)} target="_blank" rel="noreferrer">{t('sa_open_file', { defaultValue: 'Faylni ochish' })}</a></p>
                    ) : null}

                    {isClassic && (
                        data.status === -1
                            ? <AnalysisResultBody kind={type} error={parsed?.error || parsed?.detail || t('sa_ai_failed', { defaultValue: 'AI tahlili xato bilan tugagan' })} />
                            : <AnalysisResultBody kind={type} result={parsed} image={type === 'ecg' ? null : data.fileLink}
                                files={data.files} gender={data.patient?.gender} />
                    )}
                    {type === 'combined' && <CombinedResult data={data} showDiagnosis={false} embedded />}
                    {type === 'parasitology' && Array.isArray(data.results) && data.results.length > 0 && (
                        <ul className="sa-list" style={{ marginBottom: 12 }}>
                            {data.results.map((r, i) => (
                                <li key={i}>
                                    <span className="sa-list-title">{r.helminthNameUz || r.helminthType}</span>
                                    <span className="sa-muted">{r.infectionLevel || ''} {r.confidence != null ? `· ${r.confidence}%` : ''}</span>
                                </li>
                            ))}
                        </ul>
                    )}

                    {raw && (
                        <Collapse style={{ marginTop: 16 }} items={[{
                            key: 'raw',
                            label: t('sa_raw_ai', { defaultValue: 'AI javobi (xom JSON)' }),
                            children: <pre className="sa-json">{raw}</pre>,
                        }]} />
                    )}
                </>
            )}
        </Drawer>
    )
}

function DeleteAnalysisModal({ target, onClose, onDone }) {
    const { t } = useTranslation()
    const [reason, setReason] = useState('')
    const [saving, setSaving] = useState(false)
    useEffect(() => { if (target) setReason('') }, [target])

    const submit = async () => {
        setSaving(true)
        try {
            await sa_delete_analysis(target.type, target.id, reason)
            onDone()
        } catch { /* interceptor */ } finally {
            setSaving(false)
        }
    }

    const soft = target && RESTORABLE.includes(target.type)
    return (
        <Modal
            open={!!target}
            title={t('sa_delete_analysis', { defaultValue: "Tahlilni o'chirish" })}
            onCancel={onClose}
            onOk={submit}
            okButtonProps={{ danger: true, disabled: reason.trim().length < 5 }}
            confirmLoading={saving}
            okText={t('delete', { defaultValue: "O'chirish" })}
            cancelText={t('cancel', { defaultValue: 'Bekor qilish' })}
        >
            <p className="sa-muted">
                {target ? `${typeLabel(target.type, t)} · ${target.documentNumber || `#${target.id}`}` : ''}
            </p>
            <p className="sa-muted">
                {soft
                    ? t('sa_soft_delete_hint', { defaultValue: "Tahlil yashiriladi va keyin «O'chirilganlar» ro'yxatidan tiklash mumkin." })
                    : t('sa_hard_delete_hint', { defaultValue: "Bu turdagi tahlil butunlay o'chiriladi — tiklab bo'lmaydi." })}
            </p>
            <Input.TextArea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('sa_delete_reason_ph', { defaultValue: "O'chirish sababi (kamida 5 belgi)" })}
            />
        </Modal>
    )
}
