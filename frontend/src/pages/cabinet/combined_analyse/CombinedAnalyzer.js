import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Form, Table, Tag, Tooltip, Typography } from 'antd'
import { ExperimentOutlined } from '@ant-design/icons'
import { IoAlertCircleSharp } from 'react-icons/io5'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { FaUserInjured } from 'react-icons/fa'

// ─── Hooks (shared) ───
import { usePatientSearch } from '../../../hooks/usePatientSearch'
import { useRegionDistrict } from '../../../hooks/useRegionDistrict'

// ─── Shared Components ───
import PatientSearchSection from '../../../components/shared/PatientSearchSection'
import PatientInfoForm from '../../../components/shared/PatientInfoForm'
import EmptyState from '../../../components/shared/EmptyState'

// ─── Services & Utils ───
import { get_patient_card } from '../../../host/requests/PatcientRequest'
import { create_combined_analysis } from '../../../host/requests/CombinedAnalysisRequest'
import { formatDate, formatDateTime } from '../../../tools/formatters'
import { severityColor, severityLabel } from '../../../tools/severity'
import { dangerAlert, warningAlert } from '../../../tools/Alerts'
import useDocumentTitle from '../../../tools/useDocumentTitle'

const { Text } = Typography

/** Kompleks tahlilga qo'shsa bo'ladigan turlar (backend bilan bir xil). */
const TYPE_META = {
    ecg: { color: 'red', key: 'analyse_ecg' },
    holter: { color: 'volcano', key: 'analyse_holter' },
    smad: { color: 'blue', key: 'analyse_smad' },
    lab: { color: 'green', key: 'analyse_lab' },
}

const COMBINE_MIN = 2
const COMBINE_MAX = 10

/**
 * Yangi kompleks (ko'p tahlilli) AI xulosasi yaratish sahifasi.
 *
 * Boshqa tahlil yuklash sahifalari bilan bir xil oqim: avval bemor
 * passport seriyasi va tug'ilgan sanasi bo'yicha qidiriladi, topilmasa
 * ma'lumotlari to'ldirilib saqlanadi. Farqi — bu yerda FAYL yuklanmaydi:
 * bemorning bazadagi TAYYOR tahlillari tanlanadi va ular birgalikda AI ga
 * yuboriladi.
 */
export default function CombinedAnalyzer() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    useDocumentTitle(t('new_combined_analysis', { defaultValue: 'Yangi kompleks tahlil' }))

    const [form] = Form.useForm()   // bemor ma'lumotlari
    const [form1] = Form.useForm()  // passport + tug'ilgan sana qidiruvi
    const [gender, setGender] = useState(true)

    const { regions, districts, fetchDistricts } = useRegionDistrict()

    const [timeline, setTimeline] = useState([])
    const [timelineLoading, setTimelineLoading] = useState(false)
    const [selectedKeys, setSelectedKeys] = useState([])
    const [submitting, setSubmitting] = useState(false)

    const lang = t('data_lang') === 'Ru' ? 'ru' : t('data_lang') === 'En' ? 'en' : 'uz'

    const {
        patcient, loading, loadingSave, checkReady,
        phoneValue, setPhoneValue,
        searchPatcient, savePatcient, resetPatient,
    } = usePatientSearch({ form, getDistricts: fetchDistricts })

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

    const resetData = useCallback(() => {
        resetPatient()
        setTimeline([])
        setSelectedKeys([])
        form.resetFields()
    }, [resetPatient, form])

    /** Tanlangan qatorlarni `{type, id}` ko'rinishiga o'giradi. */
    const selectedItems = selectedKeys
        .map((key) => timeline.find((row) => `${row.type}-${row.id}` === key))
        .filter(Boolean)
        .map((row) => ({ type: row.type, id: row.id }))

    const submit = async () => {
        setSubmitting(true)
        try {
            const res = await create_combined_analysis({
                patientId: patcient.id,
                items: selectedItems,
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

    const columns = [
        {
            title: t('analyse_type', { defaultValue: 'Tahlil turi' }),
            dataIndex: 'type',
            key: 'type',
            render: (type) => {
                const meta = TYPE_META[type]
                return meta ? <Tag color={meta.color}>{t(meta.key)}</Tag> : <Tag>{type}</Tag>
            },
        },
        {
            title: t('document_number', { defaultValue: 'Hujjat raqami' }),
            dataIndex: 'documentNumber',
            key: 'documentNumber',
            render: (value) => value || <Text type="secondary">—</Text>,
        },
        {
            title: t('analyse_date', { defaultValue: 'Tahlil sanasi' }),
            key: 'date',
            render: (_, row) =>
                row.analysisDate
                    ? formatDate(row.analysisDate)
                    : row.createdAt ? formatDateTime(row.createdAt) : '—',
        },
        {
            title: t('conclusion', { defaultValue: 'Xulosa' }),
            dataIndex: 'severity',
            key: 'severity',
            align: 'center',
            render: (severity) =>
                severity == null
                    ? <Text type="secondary">—</Text>
                    : <Tag color={severityColor(severity)}>{severityLabel(severity, t)}</Tag>,
        },
        {
            title: t('doctor', { defaultValue: 'Shifokor' }),
            dataIndex: 'doctorName',
            key: 'doctorName',
            render: (value) => value || <Text type="secondary">—</Text>,
        },
    ]

    const canSubmit = selectedItems.length >= COMBINE_MIN && selectedItems.length <= COMBINE_MAX

    return (
        <div>
            {/* ═══════ Bemor Qidirish ═══════ */}
            <div className="main_card">
                <h1>
                    {t('patcient_info')}{' '}
                    <Tooltip placement="bottomRight" title={t('alert_patcient')}>
                        <span className="alert_icon"><IoAlertCircleSharp /></span>
                    </Tooltip>
                </h1>
                <div className="main_card_content">
                    <PatientSearchSection
                        form={form1}
                        onFinish={searchPatcient}
                        onReset={resetData}
                        loading={loading}
                    />
                    <PatientInfoForm
                        form={form}
                        patcient={patcient}
                        onFinish={savePatcient}
                        loading={loadingSave}
                        phoneValue={phoneValue}
                        setPhoneValue={setPhoneValue}
                        gender={gender}
                        setGender={setGender}
                        regions={regions}
                        districts={districts}
                        fetchDistricts={fetchDistricts}
                    />
                </div>
            </div>

            {/* ═══════ Tahlillarni tanlash ═══════ */}
            {checkReady && (
                <div className="main_card">
                    <h1>
                        <span>{t('select_analyses_to_combine', {
                            defaultValue: 'Birgalikda tahlil qilinadigan tahlillarni tanlang',
                        })}</span>
                    </h1>
                    <div className="main_card_content big_card_content">
                        <Alert
                            type="info"
                            showIcon
                            style={{ marginBottom: 16 }}
                            message={t('combine_hint', {
                                defaultValue: 'Faqat AI natijasi tayyor bo\'lgan tahlillarni birlashtirish mumkin.',
                            })}
                            description={t('combine_deep_note', {
                                defaultValue: 'Tahlillarning AI xulosalari bilan birga EKG rasmlari ham AI ga yuboriladi, shuning uchun javob bir necha daqiqa olishi mumkin.',
                            })}
                        />

                        {/* Hisoblagich chapda, tugma komponentning O'NG
                            chekkasiga yopishadi — bemor kartasidagi
                            "Birgalikda AI tahlil qilish" tugmasi kabi */}
                        <div
                            style={{
                                marginBottom: 12,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 12,
                                flexWrap: 'wrap',
                            }}
                        >
                            <Text type="secondary">
                                {t('selected_count', { defaultValue: 'Tanlandi' })}: {selectedItems.length}
                            </Text>
                            <Button
                                type="primary"
                                icon={<ExperimentOutlined />}
                                loading={submitting}
                                disabled={!canSubmit}
                                onClick={submit}
                            >
                                {t('send_to_ai', { defaultValue: 'AI ga yuborish' })}
                            </Button>
                        </div>

                        <Table
                            scroll={{ x: 'max-content' }}
                            rowKey={(row) => `${row.type}-${row.id}`}
                            loading={timelineLoading}
                            dataSource={timeline}
                            columns={columns}
                            pagination={{ pageSize: 10, showSizeChanger: false }}
                            rowSelection={{
                                selectedRowKeys: selectedKeys,
                                onChange: setSelectedKeys,
                                // Tayyor bo'lmagan (AI natijasi yo'q) va
                                // shifokor xulosasi turidagi yozuvlar tanlanmaydi
                                getCheckboxProps: (row) => ({
                                    disabled: !TYPE_META[row.type] || row.status !== 2,
                                }),
                            }}
                            locale={{
                                emptyText: (
                                    <EmptyState
                                        icon={<FaUserInjured />}
                                        message={t('no_analyses', { defaultValue: 'Tahlillar topilmadi' })}
                                    />
                                ),
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
