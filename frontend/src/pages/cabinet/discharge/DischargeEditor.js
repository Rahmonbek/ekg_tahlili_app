import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
    Alert, Button, Card, Checkbox, Col, DatePicker, Empty, Form, Grid, Input, Row,
    Select, Skeleton, Space, Table, Tag, Tooltip, Typography, message,
} from 'antd'
import {
    ArrowLeftOutlined, DeleteOutlined, PlusOutlined, SaveOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../../../store/Store'
import {
    create_discharge, get_discharge, get_discharge_candidates, update_discharge,
} from '../../../host/requests/DischargeRequest'
import { get_patient_card } from '../../../host/requests/PatcientRequest'
import DownloadReportButton from '../../../components/DownloadReportButton'
import { downloadReport } from '../../../host/requests/ReportRequest'
import DiagnosisSources from './DiagnosisSources'
import { formatDate, personName } from '../../../tools/formatters'
import { severityColor, severityLabel } from '../../../tools/severity'
import useDocumentTitle from '../../../tools/useDocumentTitle'
import './Discharge.css'

const { Text } = Typography
const { TextArea } = Input

const DATE_FORMAT = 'DD.MM.YYYY'
const API_DATE = 'YYYY-MM-DD'

/** Tahlil turi → rang va nom kaliti (bemor kartasi bilan bir xil). */
const TYPE_META = {
    ecg: { color: 'red', key: 'analyse_ecg' },
    holter: { color: 'volcano', key: 'analyse_holter' },
    smad: { color: 'blue', key: 'analyse_smad' },
    lab: { color: 'green', key: 'analyse_lab' },
    para: { color: 'gold', key: 'dc_type_para', fallback: 'Parazitologiya' },
}

/** Shikoyatlar spravochnigidagi yo'nalishlar — ro'yxatdagi tartib. */
const COMPLAINT_CATEGORIES = [
    ['general', 'Umumiy'],
    ['cardio', 'Yurak-qon tomir'],
    ['respiratory', 'Nafas tizimi'],
    ['neuro', 'Nevrologik'],
    ['gastro', 'Oshqozon-ichak'],
    ['renal', 'Siydik-tanosil'],
    ['musculo', 'Tayanch-harakat'],
    ['endocrine', 'Endokrin'],
    ['skin', 'Teri'],
    ['eye_ent', 'Ko‘z, quloq-burun-tomoq'],
    ['psych', 'Ruhiy holat'],
    ['gyn', 'Ginekologik'],
]

const DIAGNOSIS_FIELDS = [
    ['diagnosisMain', 'dc_diag_main', 'Asosiy'],
    ['diagnosisConcomitant', 'dc_diag_concomitant', 'Yo‘ldosh'],
    ['diagnosisComplications', 'dc_diag_complications', 'Asorat'],
]

const itemKey = (row) => `${row.type}-${row.id}`

/**
 * Qidiruv uchun matnni bir xil ko'rinishga keltiradi: spravochnikda
 * "og‘riq" (‘) yozilgan, shifokor esa odatda oddiy apostrof bilan
 * "og'riq" deb qidiradi — aks holda hech narsa topilmasdi.
 */
const normalizeSearch = (value) => (value ?? '').toString().toLowerCase().replace(/[‘’ʻʼ`´]/g, "'")

/**
 * Vipiska (statsionardan chiqarish epikrizi) — yaratish va tahrirlash.
 *
 * Yangi: `/patcients/:patientId/discharge/new` — ИБ raqami va sanalar bemor
 * kartasidagi oynadan `location.state` orqali keladi.
 * Tahrirlash: `/discharges/:id/edit`.
 *
 * Tanlash uchun tahlillar ro'yxati yotqizilish/chiqarilish sanalariga
 * bog'liq: shifokorga yo'naltirilgan tahlillar har doim, qolganlari faqat
 * shu oraliqda olingan bo'lsa chiqadi. Sanalar o'zgarsa ro'yxat qayta
 * yuklanadi va oraliqdan chiqib qolgan tanlovlar olib tashlanadi.
 */
export default function DischargeEditor() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const location = useLocation()
    const params = useParams()
    const { complaints } = useStore()
    const [form] = Form.useForm()

    const editId = params.id ? Number(params.id) : null
    const [patientId, setPatientId] = useState(params.patientId ? Number(params.patientId) : null)
    const [patient, setPatient] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [loadError, setLoadError] = useState(null)

    const [candidates, setCandidates] = useState({ analyses: [], consultations: [], combined: [] })
    const [candidatesLoading, setCandidatesLoading] = useState(false)
    const [selectedKeys, setSelectedKeys] = useState([])
    const [dropped, setDropped] = useState(0)

    const lang = t('data_lang') === 'Ru' ? 'ru' : t('data_lang') === 'En' ? 'en' : 'uz'

    useDocumentTitle(editId
        ? t('dc_edit_title', { defaultValue: 'Vipiskani tahrirlash' })
        : t('dc_new_title', { defaultValue: 'Yangi vipiska' }))

    const admission = Form.useWatch('admissionDate', form)
    const discharge = Form.useWatch('dischargeDate', form)
    const diagnosisMain = Form.useWatch('diagnosisMain', form)
    const diagnosisConcomitant = Form.useWatch('diagnosisConcomitant', form)
    const diagnosisComplications = Form.useWatch('diagnosisComplications', form)

    // Telefonda kalendar ochilganda klaviatura chiqib, uni yopib qo'ymasin
    const screens = Grid.useBreakpoint()
    const pickerProps = { format: DATE_FORMAT, style: { width: '100%' }, inputReadOnly: !screens.md }

    // ── Boshlang'ich yuklash ─────────────────────────────────────────────
    useEffect(() => {
        let mounted = true

        const load = async () => {
            setLoading(true)
            try {
                if (editId) {
                    const res = await get_discharge(editId)
                    const d = res?.data
                    if (!mounted || !d) return
                    if (!d.isMine) {
                        setLoadError(t('dc_not_owner', { defaultValue: 'Vipiskani faqat uni yaratgan shifokor tahrirlay oladi' }))
                        return
                    }
                    setPatientId(d.patientId)
                    setPatient({ firstName: d.patientFirstName, lastName: d.patientLastName, birthDate: d.patientBirthDate })
                    setSelectedKeys((d.items || []).map(itemKey))
                    form.setFieldsValue({
                        ...d,
                        documentDate: d.documentDate ? dayjs(d.documentDate) : null,
                        admissionDate: d.admissionDate ? dayjs(d.admissionDate) : null,
                        dischargeDate: d.dischargeDate ? dayjs(d.dischargeDate) : null,
                        prescriptions: d.prescriptions?.length ? d.prescriptions : [{}],
                    })
                } else {
                    const init = location.state || {}
                    form.setFieldsValue({
                        historyNumber: init.historyNumber,
                        documentDate: init.documentDate ? dayjs(init.documentDate) : dayjs(),
                        admissionDate: init.admissionDate ? dayjs(init.admissionDate) : null,
                        dischargeDate: init.dischargeDate ? dayjs(init.dischargeDate) : null,
                        includePatientCopy: true,
                        prescriptions: [{}],
                    })
                    const res = await get_patient_card(params.patientId, { lang })
                    if (mounted) setPatient(res?.data ?? null)
                }
            } catch (err) {
                if (mounted) {
                    setLoadError(err?.response?.data?.message
                        || t('dc_load_failed', { defaultValue: 'Ma’lumotlarni yuklab bo‘lmadi' }))
                }
            } finally {
                if (mounted) setLoading(false)
            }
        }

        load()
        return () => { mounted = false }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editId, params.patientId])

    // ── Sanalar o'zgarganda tanlash ro'yxati ─────────────────────────────
    const loadCandidates = useCallback(async () => {
        if (!patientId || !admission || !discharge || admission.isAfter(discharge, 'day')) {
            setCandidates({ analyses: [], consultations: [], combined: [] })
            return
        }
        setCandidatesLoading(true)
        try {
            const res = await get_discharge_candidates({
                patientId,
                admissionDate: admission.format(API_DATE),
                dischargeDate: discharge.format(API_DATE),
            })
            const data = res?.data ?? {}
            setCandidates({
                analyses: data.analyses || [],
                consultations: data.consultations || [],
                combined: data.combined || [],
            })

            // Oraliqdan chiqib qolgan tanlovlar olib tashlanadi — backend ham
            // ularni rad etardi
            const available = new Set((data.analyses || []).map(itemKey))
            setSelectedKeys((prev) => {
                const kept = prev.filter((k) => available.has(k))
                setDropped(prev.length - kept.length)
                return kept
            })
            const consultationIds = new Set((data.consultations || []).map((c) => c.id))
            const current = form.getFieldValue('consultationIds') || []
            form.setFieldValue('consultationIds', current.filter((id) => consultationIds.has(id)))
        } catch (err) {
            message.error(err?.response?.data?.message
                || t('dc_candidates_failed', { defaultValue: 'Tahlillar ro‘yxatini yuklab bo‘lmadi' }))
        } finally {
            setCandidatesLoading(false)
        }
    }, [patientId, admission, discharge, form, t])

    useEffect(() => {
        if (!loading) loadCandidates()
    }, [loading, loadCandidates])

    // ── Hosila ma'lumotlar ───────────────────────────────────────────────
    const selectedAnalyses = useMemo(
        () => candidates.analyses.filter((a) => selectedKeys.includes(itemKey(a))),
        [candidates, selectedKeys])

    /** Tanlangan tahlillardan kamida bittasi qatnashgan kompleks AI xulosalari. */
    const relevantCombined = useMemo(() => {
        const selected = new Set(selectedKeys)
        return candidates.combined.filter((cb) => (cb.items || []).some((i) => selected.has(itemKey(i))))
    }, [candidates, selectedKeys])

    const complaintOptions = useMemo(() => {
        const nameKey = `name${t('data_lang')}`
        const groups = COMPLAINT_CATEGORIES.map(([key, fallback]) => ({
            label: t(`dc_cat_${key}`, { defaultValue: fallback }),
            options: complaints
                .filter((c) => (c.category || 'cardio') === key)
                .map((c) => ({ value: c.id, label: c[nameKey] || c.nameUz || c.nameRu })),
        }))
        return groups.filter((g) => g.options.length > 0)
    }, [complaints, t])

    const appendDiagnosis = (field, text) => {
        const current = (form.getFieldValue(field) || '').trim()
        form.setFieldValue(field, current ? `${current}\n${text.trim()}` : text.trim())
    }

    /**
     * Qo'shilgan xulosani diagnoz maydonidan olib tashlaydi. Shifokor matnni
     * qo'lda tahrirlagan bo'lsa (aynan mos kelmasa), uni buzmaslik uchun
     * hech narsa o'chirilmaydi — o'zi tuzatishi so'raladi.
     */
    const removeDiagnosis = (field, text) => {
        const current = form.getFieldValue(field) || ''
        const needle = text.trim()
        if (!current.includes(needle)) {
            message.info(t('dc_remove_manual', { defaultValue: 'Matn tahrirlangan — uni diagnoz maydonidan qo‘lda o‘chiring' }))
            return
        }
        const next = current.replace(needle, '').replace(/\n{2,}/g, '\n').trim()
        form.setFieldValue(field, next)
    }

    // ── Saqlash ──────────────────────────────────────────────────────────
    const onSave = async () => {
        let values
        try {
            values = await form.validateFields()
        } catch {
            message.warning(t('dc_fill_required', { defaultValue: 'Majburiy maydonlarni to‘ldiring' }))
            return
        }

        const payload = {
            ...values,
            patientId,
            documentDate: values.documentDate.format(API_DATE),
            admissionDate: values.admissionDate.format(API_DATE),
            dischargeDate: values.dischargeDate.format(API_DATE),
            complaintIds: values.complaintIds || [],
            consultationIds: values.consultationIds || [],
            items: selectedAnalyses.map((a) => ({ type: a.type, id: a.id })),
            prescriptions: (values.prescriptions || []).filter((p) => p?.drugName?.trim()),
            includePatientCopy: values.includePatientCopy !== false,
        }

        setSaving(true)
        try {
            if (editId) {
                await update_discharge(editId, payload)
                message.success(t('dc_saved', { defaultValue: 'Vipiska saqlandi' }))
            } else {
                const res = await create_discharge(payload)
                const newId = res.data.id
                message.success(t('dc_created', { defaultValue: 'Vipiska yaratildi, PDF yuklab olinmoqda…' }))
                navigate(`/discharges/${newId}/edit`, { replace: true })

                // Yaratilgandan keyin PDF darhol yuklab olinadi (loyiha egasining
                // talabi) — interfeys tilida. Yuklab bo'lmasa vipiska baribir
                // saqlangan: tahrirlash sahifasidagi "PDF yuklab olish" tugmasi bor.
                try {
                    await downloadReport('discharge', newId, lang)
                } catch (err) {
                    message.warning(t('dc_pdf_auto_failed', { defaultValue: 'PDF ni avtomatik yuklab bo‘lmadi — «PDF yuklab olish» tugmasini bosing' }))
                }
            }
        } catch (err) {
            message.error(err?.response?.data?.message
                || t('dc_save_failed', { defaultValue: 'Vipiskani saqlab bo‘lmadi' }))
        } finally {
            setSaving(false)
        }
    }

    // ── Ko'rinish ────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="main_card"><div className="main_card_content big_card_content">
                <Skeleton active paragraph={{ rows: 10 }} />
            </div></div>
        )
    }

    if (loadError) {
        return (
            <div className="main_card"><div className="main_card_content big_card_content">
                <Alert type="error" showIcon message={loadError} />
                <Button style={{ marginTop: 16 }} icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
                    {t('back', { defaultValue: 'Orqaga' })}
                </Button>
            </div></div>
        )
    }

    const analysisColumns = [
        {
            title: t('analyse_type', { defaultValue: 'Tahlil turi' }),
            dataIndex: 'type',
            render: (type) => {
                const meta = TYPE_META[type]
                return <Tag color={meta?.color}>{meta ? t(meta.key, { defaultValue: meta.fallback || type }) : type}</Tag>
            },
        },
        {
            title: t('analyse_date', { defaultValue: 'Tahlil sanasi' }),
            dataIndex: 'date',
            render: (v) => (v ? formatDate(v) : '—'),
        },
        {
            title: t('document_number', { defaultValue: 'Hujjat raqami' }),
            dataIndex: 'documentNumber',
            render: (v) => v || <Text type="secondary">—</Text>,
        },
        {
            title: t('dc_source', { defaultValue: 'Manba' }),
            key: 'source',
            render: (_, row) => (
                <Space size={4} wrap>
                    {row.assignedToMe && <Tag color="blue">{t('dc_assigned_to_me', { defaultValue: 'Sizga yo‘naltirilgan' })}</Tag>}
                    {row.inPeriod && <Tag color="green">{t('dc_in_period', { defaultValue: 'Yotish davrida' })}</Tag>}
                </Space>
            ),
        },
        {
            title: t('conclusion', { defaultValue: 'Xulosa' }),
            key: 'summary',
            render: (_, row) => (
                <Space direction="vertical" size={2} className="dc-summary-cell">
                    {row.severity != null && (
                        <Tag color={severityColor(row.severity)}>{severityLabel(row.severity, t)}</Tag>
                    )}
                    {row.summary && (
                        <Tooltip title={row.summary} placement="topLeft">
                            <Text type="secondary" className="dc-summary-text">{row.summary}</Text>
                        </Tooltip>
                    )}
                </Space>
            ),
        },
        {
            title: t('dc_doctor_conclusions', { defaultValue: 'Shifokor xulosalari' }),
            key: 'conclusions',
            align: 'center',
            render: (_, row) => row.conclusions?.length
                ? <Tag color="purple">{row.conclusions.length}</Tag>
                : <Text type="secondary">—</Text>,
        },
    ]

    return (
        <div className="main_card">
            <div className="main_card_content big_card_content dc-page">
                <div className="dc-head">
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(patientId ? `/patcients/${patientId}` : -1)}>
                        {t('back', { defaultValue: 'Orqaga' })}
                    </Button>
                    <div>
                        <Typography.Title level={4} style={{ margin: 0 }}>
                            {editId ? t('dc_edit_title', { defaultValue: 'Vipiskani tahrirlash' }) : t('dc_new_title', { defaultValue: 'Yangi vipiska' })}
                        </Typography.Title>
                        {patient && (
                            <Text type="secondary">
                                {personName(patient)}{patient.birthDate ? ` · ${formatDate(patient.birthDate)}` : ''}
                            </Text>
                        )}
                    </div>
                    {editId && (
                        <div className="dc-head-actions">
                            <DownloadReportButton type="discharge" id={editId} size="middle" />
                        </div>
                    )}
                </div>

                <Form form={form} layout="vertical" requiredMark>
                    {/* ── 1. Asosiy ma'lumotlar ── */}
                    <Card size="small" className="dc-card" title={t('dc_main_info', { defaultValue: 'Asosiy ma’lumotlar' })}>
                        <Row gutter={16}>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item name="historyNumber" label={t('dc_history_number', { defaultValue: 'Kasallik tarixi (ИБ) raqami' })}
                                    rules={[{ required: true, whitespace: true, message: t('dc_required', { defaultValue: 'Majburiy maydon' }) },
                                        { max: 50 }]}>
                                    <Input placeholder="1788" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item name="documentDate" label={t('dc_document_date', { defaultValue: 'Vipiska sanasi' })}
                                    rules={[{ required: true, message: t('dc_required', { defaultValue: 'Majburiy maydon' }) }]}>
                                    <DatePicker {...pickerProps} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item name="admissionDate" label={t('dc_admission_date', { defaultValue: 'Yotqizilgan sana' })}
                                    rules={[{ required: true, message: t('dc_required', { defaultValue: 'Majburiy maydon' }) }]}>
                                    <DatePicker {...pickerProps} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={6}>
                                <Form.Item name="dischargeDate" label={t('dc_discharge_date', { defaultValue: 'Chiqarilgan sana' })}
                                    dependencies={['admissionDate']}
                                    rules={[
                                        { required: true, message: t('dc_required', { defaultValue: 'Majburiy maydon' }) },
                                        ({ getFieldValue }) => ({
                                            validator: (_, value) => {
                                                const from = getFieldValue('admissionDate')
                                                if (!value || !from || !from.isAfter(value, 'day')) return Promise.resolve()
                                                return Promise.reject(new Error(t('dc_dates_order', { defaultValue: 'Chiqarilgan sana yotqizilgan sanadan oldin bo‘lishi mumkin emas' })))
                                            },
                                        }),
                                    ]}>
                                    <DatePicker {...pickerProps} />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Card>

                    {/* ── 2. Tahlillar ── */}
                    <Card size="small" className="dc-card"
                        title={t('dc_analyses', { defaultValue: 'Vipiskaga kiradigan tahlillar' })}
                        extra={<Text type="secondary">{t('selected_count', { defaultValue: 'Tanlandi' })}: {selectedKeys.length}</Text>}>
                        <Text type="secondary" className="dc-hint">
                            {t('dc_analyses_hint', { defaultValue: 'Sizga yo‘naltirilgan barcha tahlillar va yotish davrida olingan boshqa tahlillar. Faqat natijasi tayyorlari ko‘rsatiladi.' })}
                        </Text>
                        {dropped > 0 && (
                            <Alert type="warning" showIcon style={{ margin: '8px 0' }}
                                message={t('dc_dropped', { defaultValue: '{{count}} ta tanlangan tahlil yangi sanalar oralig‘iga to‘g‘ri kelmagani uchun olib tashlandi', count: dropped })} />
                        )}
                        {!admission || !discharge ? (
                            <Empty description={t('dc_pick_dates', { defaultValue: 'Avval yotqizilgan va chiqarilgan sanalarni kiriting' })} />
                        ) : (
                            <Table
                                size="small"
                                scroll={{ x: 'max-content' }}
                                rowKey={itemKey}
                                loading={candidatesLoading}
                                dataSource={candidates.analyses}
                                columns={analysisColumns}
                                pagination={candidates.analyses.length > 10 ? { pageSize: 10, showSizeChanger: false } : false}
                                rowSelection={{ selectedRowKeys: selectedKeys, onChange: setSelectedKeys }}
                                locale={{ emptyText: t('dc_no_analyses', { defaultValue: 'Tanlash mumkin bo‘lgan tahlil yo‘q' }) }}
                            />
                        )}
                    </Card>

                    {/* ── 3. Diagnoz ── */}
                    <Card size="small" className="dc-card" title={t('dc_diagnosis', { defaultValue: 'Diagnoz' })}>
                        <DiagnosisSources
                            analyses={selectedAnalyses}
                            combined={relevantCombined}
                            values={{ diagnosisMain, diagnosisConcomitant, diagnosisComplications }}
                            fields={DIAGNOSIS_FIELDS}
                            typeMeta={TYPE_META}
                            onAdd={appendDiagnosis}
                            onRemove={removeDiagnosis}
                            t={t}
                        />
                        <Row gutter={16} style={{ marginTop: 12 }}>
                            {DIAGNOSIS_FIELDS.map(([field, key, fallback]) => (
                                <Col xs={24} lg={8} key={field}>
                                    <Form.Item name={field} label={t(key, { defaultValue: fallback })}>
                                        <TextArea autoSize={{ minRows: 3, maxRows: 10 }} maxLength={20000} />
                                    </Form.Item>
                                </Col>
                            ))}
                        </Row>
                    </Card>

                    {/* ── 4. Shikoyatlar, anamnez, ob'ektiv ko'rik ── */}
                    <Card size="small" className="dc-card" title={t('dc_clinical', { defaultValue: 'Shikoyatlar, anamnez va ob’ektiv ko‘rik' })}>
                        <Form.Item name="complaintIds" label={t('dc_complaints', { defaultValue: 'Shikoyatlar' })}>
                            <Select
                                mode="multiple"
                                allowClear
                                showSearch
                                options={complaintOptions}
                                optionFilterProp="label"
                                filterOption={(input, option) =>
                                    normalizeSearch(option?.label).includes(normalizeSearch(input))}
                                placeholder={t('dc_complaints_placeholder', { defaultValue: 'Qidiring va tanlang…' })}
                                listHeight={320}
                            />
                        </Form.Item>
                        <Form.Item name="complaintsText" label={t('dc_complaints_extra', { defaultValue: 'Ro‘yxatda yo‘q shikoyatlar' })}>
                            <TextArea autoSize={{ minRows: 2, maxRows: 6 }} maxLength={20000} />
                        </Form.Item>
                        <Form.Item name="anamnesis" label={t('dc_anamnesis', { defaultValue: 'Anamnez' })}>
                            <TextArea autoSize={{ minRows: 3, maxRows: 12 }} maxLength={20000} />
                        </Form.Item>
                        <Form.Item name="objectiveStatus" label={t('dc_objective', { defaultValue: 'Ob’ektiv ko‘rik' })}>
                            <TextArea autoSize={{ minRows: 3, maxRows: 12 }} maxLength={20000} />
                        </Form.Item>
                    </Card>

                    {/* ── 5. Konsultatsiya xulosalari ── */}
                    <Card size="small" className="dc-card" title={t('dc_consultations', { defaultValue: 'Onlayn konsultatsiya xulosalari' })}>
                        {candidates.consultations.length === 0 ? (
                            <Text type="secondary" className="dc-hint">
                                {t('dc_no_consultations', { defaultValue: 'Yotish davrida bu bemor bo‘yicha konsultatsiya xulosasi yo‘q.' })}
                            </Text>
                        ) : (
                            <Form.Item name="consultationIds" style={{ marginBottom: 0 }}>
                                <Checkbox.Group className="dc-consultations">
                                    {candidates.consultations.map((c) => (
                                        <Checkbox key={c.id} value={c.id} className="dc-consultation">
                                            <div>
                                                <Text strong>{formatDate(c.date)}</Text>
                                                <Text type="secondary">{c.doctorName ? ` · ${c.doctorName}` : ''}{c.clinicName ? ` (${c.clinicName})` : ''}</Text>
                                            </div>
                                            <div className="dc-conclusion-text">{c.diagnosis}</div>
                                        </Checkbox>
                                    ))}
                                </Checkbox.Group>
                            </Form.Item>
                        )}
                    </Card>

                    {/* ── 6. Davolash va chiqishdagi holat ── */}
                    <Card size="small" className="dc-card" title={t('dc_course', { defaultValue: 'Davolash va chiqishdagi holat' })}>
                        <Form.Item name="treatment" label={t('dc_treatment', { defaultValue: 'Statsionarda o‘tkazilgan davolash' })}>
                            <TextArea autoSize={{ minRows: 3, maxRows: 12 }} maxLength={20000} />
                        </Form.Item>
                        <Form.Item name="dischargeCondition" label={t('dc_discharge_condition', { defaultValue: 'Chiqishdagi holat' })}>
                            <TextArea autoSize={{ minRows: 2, maxRows: 8 }} maxLength={20000}
                                placeholder={t('dc_discharge_condition_ph', { defaultValue: 'Masalan: holati yaxshilangan, AD 120/80 mm sim. ust., ЧСС 74 marta/daq.' })} />
                        </Form.Item>
                    </Card>

                    {/* ── 7. Tavsiyalar ── */}
                    <Card size="small" className="dc-card" title={t('dc_recommendations', { defaultValue: 'Tavsiyalar' })}>
                        <Form.List name="prescriptions">
                            {(fields, { add, remove }) => (
                                <>
                                    <div className="dc-rx-head">
                                        <span>{t('dc_rx_drug', { defaultValue: 'Dori vositasi' })}</span>
                                        <span>{t('dc_rx_dose', { defaultValue: 'Doza' })}</span>
                                        <span>{t('dc_rx_frequency', { defaultValue: 'Qabul tartibi' })}</span>
                                        <span>{t('dc_rx_time', { defaultValue: 'Vaqti' })}</span>
                                        <span>{t('dc_rx_duration', { defaultValue: 'Muddati / izoh' })}</span>
                                        <span />
                                    </div>
                                    {fields.map(({ key, name }) => (
                                        <div key={key} className="dc-rx-row">
                                            <Form.Item name={[name, 'drugName']} noStyle>
                                                <Input placeholder={t('dc_rx_drug_ph', { defaultValue: 'Bisoprolol' })} maxLength={300} />
                                            </Form.Item>
                                            <Form.Item name={[name, 'dose']} noStyle>
                                                <Input placeholder="5 mg ½ tab" maxLength={200} />
                                            </Form.Item>
                                            <Form.Item name={[name, 'frequency']} noStyle>
                                                <Input placeholder={t('dc_rx_frequency_ph', { defaultValue: 'kuniga 1 mahal' })} maxLength={200} />
                                            </Form.Item>
                                            <Form.Item name={[name, 'intakeTime']} noStyle>
                                                <Input placeholder="08:00" maxLength={100} />
                                            </Form.Item>
                                            <Form.Item name={[name, 'duration']} noStyle>
                                                <Input placeholder={t('dc_rx_duration_ph', { defaultValue: 'doimiy, ЧСС nazoratida' })} maxLength={300} />
                                            </Form.Item>
                                            <Button danger type="text" icon={<DeleteOutlined />} onClick={() => remove(name)}
                                                aria-label={t('delete', { defaultValue: 'O‘chirish' })} />
                                        </div>
                                    ))}
                                    <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({})} block style={{ marginTop: 8 }}>
                                        {t('dc_rx_add', { defaultValue: 'Dori qo‘shish' })}
                                    </Button>
                                </>
                            )}
                        </Form.List>

                        <Form.Item name="recommendationsText" label={t('dc_recommendations_other', { defaultValue: 'Qo‘shimcha tavsiyalar (rejim, parhez, nazorat)' })}
                            style={{ marginTop: 16 }}>
                            <TextArea autoSize={{ minRows: 2, maxRows: 8 }} maxLength={20000} />
                        </Form.Item>
                        <Form.Item name="includePatientCopy" valuePropName="checked" style={{ marginBottom: 0 }}>
                            <Checkbox>{t('dc_patient_copy', { defaultValue: 'PDF ga bemor uchun tavsiyalar nusxasini alohida sahifada qo‘shish' })}</Checkbox>
                        </Form.Item>
                    </Card>

                    <Alert type="info" showIcon className="dc-card"
                        message={t('dc_qr_note', { defaultValue: 'Vipiskaga imzo qo‘yilmaydi — uning haqiqiyligini PDF dagi QR kod tasdiqlaydi.' })} />

                    <div className="dc-actions">
                        <Button onClick={() => navigate(patientId ? `/patcients/${patientId}` : -1)}>
                            {t('cancel', { defaultValue: 'Bekor qilish' })}
                        </Button>
                        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={onSave}>
                            {editId ? t('save', { defaultValue: 'Saqlash' }) : t('dc_create', { defaultValue: 'Vipiskani yaratish' })}
                        </Button>
                        {editId && <DownloadReportButton type="discharge" id={editId} size="middle" />}
                    </div>
                </Form>
            </div>
        </div>
    )
}
