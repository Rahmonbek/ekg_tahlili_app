import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Col, Descriptions, Modal, Row, Skeleton, Space, Statistic, Table, Tag, Typography, message } from 'antd'
import { ArrowLeftOutlined, ExperimentOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { FaUserInjured } from 'react-icons/fa'
import { get_patient_card } from '../../../../host/requests/PatcientRequest'
import {
    create_combined_analysis,
    get_combined_analyses_by_patient,
    get_combined_analysis,
} from '../../../../host/requests/CombinedAnalysisRequest'
import CombinedResult from '../../../../components/results/CombinedResult'
import { calculateAge, formatDate, formatDateTime, formatPhoneNumberForForm, personName } from '../../../../tools/formatters'
import { severityColor, severityLabel } from '../../../../tools/severity'
import EmptyState from '../../../../components/shared/EmptyState'
import { patientCardTour } from '../../../../tools/tourSteps'
import { usePageTour } from '../../../../components/shared/TourProvider';
import useDocumentTitle from '../../../../tools/useDocumentTitle'
import LabDynamicsChart from '../../../../components/results/LabDynamicsChart'

const { Text, Title } = Typography

/**
 * Bemor kartasi — bitta bemorning barcha tahlillari yagona xronologik lentada.
 *
 * Ilgari platformada bemorga oid hech qanday umumiy ko'rinish yo'q edi: EKG,
 * Holter, SMAD, Laboratoriya va shifokor xulosalari beshta alohida ro'yxatda
 * yashiringan edi va shifokor bir bemorning tarixini ko'rish uchun beshta
 * sahifani qo'lda kezib chiqishi kerak edi.
 */

/** Tahlil turi → ko'rish sahifasi manzili va ko'rinadigan nomi. */
const TYPE_META = {
    ecg: { path: 'ecg-analyses', color: 'red', key: 'analyse_ecg' },
    holter: { path: 'holter-analyses', color: 'volcano', key: 'analyse_holter' },
    smad: { path: 'smad-analyses', color: 'blue', key: 'analyse_smad' },
    lab: { path: 'lab-analyses', color: 'green', key: 'analyse_lab' },
    diagnose: { path: 'patient-diagnoses', color: 'purple', key: 'patient_diagnostics' },
}

/**
 * Kompleks AI tahliliga qo'shish mumkin bo'lgan turlar.
 * Shifokor xulosasi (`diagnose`) AI natijasi emas, shuning uchun yo'q.
 */
const COMBINABLE_TYPES = ['ecg', 'holter', 'smad', 'lab']

/** Kompleks tahlildagi tahlillar soni chegarasi (backend bilan bir xil). */
const COMBINE_MIN = 2
const COMBINE_MAX = 10

/** Tahlil holati (int) → rangli belgi. */
function StatusTag({ status, t }) {
    switch (status) {
        case 2:
            return <Tag color="success">{t('ready', { defaultValue: 'Tayyor' })}</Tag>
        case 3:
            return <Tag color="warning">{t('file_type_mismatch_short', { defaultValue: 'Fayl mos emas' })}</Tag>
        case -1:
            return <Tag color="error">{t('error', { defaultValue: 'Xatolik' })}</Tag>
        case 1:
            return <Tag color="processing">{t('ai_processing', { defaultValue: 'AI tahlil qilmoqda' })}</Tag>
        case 0:
            return <Tag>{t('waiting', { defaultValue: 'Kutmoqda' })}</Tag>
        default:
            return <Text type="secondary">—</Text>
    }
}

export default function PatcientCard() {
    // Qo'llanma qadamlari ro'yxatdan o'tkaziladi; tugma header'da
    usePageTour(patientCardTour);
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { id } = useParams()

    const [card, setCard] = useState(null)
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)

    // ── Kompleks (ko'p tahlilli) AI xulosasi ─────────────────────────────
    const [selectedKeys, setSelectedKeys] = useState([])
    const [combinedList, setCombinedList] = useState([])
    const [combineOpen, setCombineOpen] = useState(false)
    const [combining, setCombining] = useState(false)
    // Ochilgan kompleks xulosalar va ularning to'liq mazmuni.
    // Ro'yxat endpointi javob matnini qaytarmaydi (ro'yxat og'irlashmasin),
    // shuning uchun qator ochilganda alohida so'raladi va keshlanadi.
    const [expandedCombined, setExpandedCombined] = useState([])
    const [combinedDetails, setCombinedDetails] = useState({})

    // Bemor kartasi yorlig'i bemor ismi bilan nomlanadi
    useDocumentTitle(
        card
            ? [card.lastName, card.firstName].filter(Boolean).join(' ')
            : t('patcients', { defaultValue: 'Bemorlar' })
    )

    const lang = t('data_lang') === 'Ru' ? 'ru' : t('data_lang') === 'En' ? 'en' : 'uz'

    const fetchCard = useCallback(async () => {
        setLoading(true)
        try {
            const res = await get_patient_card(id, { lang })
            setCard(res?.data ?? null)
            setNotFound(false)
        } catch (err) {
            setCard(null)
            setNotFound(true)
        } finally {
            setLoading(false)
        }
    }, [id, lang])

    const fetchCombined = useCallback(async () => {
        try {
            const res = await get_combined_analyses_by_patient(id)
            setCombinedList(Array.isArray(res?.data) ? res.data : [])
        } catch (err) {
            // Kompleks xulosalar — qo'shimcha ma'lumot: ular yuklanmasa ham
            // bemor kartasi ochilishi kerak
            setCombinedList([])
        }
    }, [id])

    useEffect(() => { fetchCard() }, [fetchCard])
    useEffect(() => { fetchCombined() }, [fetchCombined])

    /** Tanlangan qatorlar — `type-id` kalitidan qayta tiklanadi. */
    const selectedItems = useMemo(() => {
        const timeline = card?.timeline ?? []
        return selectedKeys
            .map((key) => timeline.find((row) => `${row.type}-${row.id}` === key))
            .filter(Boolean)
            .map((row) => ({ type: row.type, id: row.id }))
    }, [selectedKeys, card])

    /** Qator ochilganda xulosaning to'liq mazmunini yuklaydi. */
    const onCombinedExpand = useCallback(async (keys) => {
        setExpandedCombined(keys)

        const missing = keys.filter((key) => !combinedDetails[key])
        if (missing.length === 0) return

        const loaded = await Promise.all(missing.map(async (key) => {
            try {
                const res = await get_combined_analysis(key)
                return [key, res?.data ?? null]
            } catch (err) {
                // Bitta xulosa ochilmasa qolganlari ishlashda davom etadi
                return [key, null]
            }
        }))

        setCombinedDetails((prev) => ({ ...prev, ...Object.fromEntries(loaded) }))
    }, [combinedDetails])

    const startCombine = async () => {
        setCombining(true)
        try {
            // Rejim tanlovi yo'q — kompleks tahlil doim chuqur bajariladi
            const res = await create_combined_analysis({
                patientId: Number(id),
                items: selectedItems,
                lang,
            })
            const combinedId = res?.data?.combined_id
            setCombineOpen(false)
            setSelectedKeys([])
            if (res?.data?.reused) {
                // Takror yaratilmadi — mavjudi ochiladi. Foydalanuvchi nima
                // uchun yangi xulosa chiqmaganini bilishi kerak.
                message.warning(t('combined_duplicate', {
                    defaultValue: 'Bu tahlillar allaqachon AI ga birgalikda yuborilgan. Mavjud xulosa ochildi.',
                }), 6)
            }
            if (combinedId) navigate(`/combined-analyses/view/${combinedId}`)
        } catch (err) {
            message.error(
                err?.response?.data?.message
                || t('combined_failed', { defaultValue: 'Kompleks tahlil bajarilmadi. Qayta urinib ko\'ring.' })
            )
        } finally {
            setCombining(false)
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
            title: t('status', { defaultValue: 'Holat' }),
            dataIndex: 'status',
            key: 'status',
            align: 'center',
            render: (status) => <StatusTag status={status} t={t} />,
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

    if (loading) {
        return (
            <div className="main_card">
                <div className="main_card_content big_card_content">
                    <Skeleton active paragraph={{ rows: 8 }} />
                </div>
            </div>
        )
    }

    if (notFound || !card) {
        return (
            <div className="main_card">
                <div className="main_card_content big_card_content">
                    <EmptyState
                        icon={<FaUserInjured />}
                        message={t('patient_not_found', { defaultValue: 'Bemor topilmadi yoki sizda ko\'rish huquqi yo\'q' })}
                    />
                    <div style={{ textAlign: 'center' }}>
                        <Button onClick={() => navigate('/patcients')} icon={<ArrowLeftOutlined />}>
                            {t('back', { defaultValue: 'Orqaga' })}
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    const fio = personName(card)
    const address = [card.regionName, card.districtName, card.address].filter(Boolean).join(', ')

    return (
        <div className="main_card">
            <div className="main_card_content big_card_content">

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                    <Button onClick={() => navigate('/patcients')} icon={<ArrowLeftOutlined />}>
                        {t('back', { defaultValue: 'Orqaga' })}
                    </Button>
                    <Title level={4} style={{ margin: 0 }}>{fio}</Title>
                </div>

                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={14} data-tour="card-info">
                        <Card size="small" title={t('patient_info', { defaultValue: 'Bemor ma\'lumotlari' })}>
                            <Descriptions column={{ xs: 1, sm: 1, md: 2 }} size="small" bordered>
                                <Descriptions.Item label={t('birth_date', { defaultValue: 'Tug\'ilgan sana' })}>
                                    {card.birthDate
                                        ? `${formatDate(card.birthDate)} (${calculateAge(card.birthDate)} ${t('age', { defaultValue: 'yosh' })})`
                                        : '—'}
                                </Descriptions.Item>
                                <Descriptions.Item label={t('gender', { defaultValue: 'Jinsi' })}>
                                    {card.gender ? t('male', { defaultValue: 'Erkak' }) : t('female', { defaultValue: 'Ayol' })}
                                </Descriptions.Item>
                                <Descriptions.Item label={t('passport', { defaultValue: 'Passport' })}>
                                    {card.passportMasked || '—'}
                                </Descriptions.Item>
                                <Descriptions.Item label={t('phone_number')}>
                                    {card.phone ? formatPhoneNumberForForm(card.phone) : '—'}
                                </Descriptions.Item>
                                <Descriptions.Item label={t('addres', { defaultValue: 'Manzil' })} span={2}>
                                    {address || '—'}
                                </Descriptions.Item>
                            </Descriptions>
                        </Card>
                    </Col>

                    <Col xs={24} lg={10} data-tour="card-counts">
                        <Card size="small" title={t('analyses', { defaultValue: 'Tahlillar' })}>
                            <Row gutter={[8, 8]}>
                                <Col xs={12} sm={8}><Statistic title={t('analyse_ecg')} value={card.ecgCount} /></Col>
                                <Col xs={12} sm={8}><Statistic title={t('analyse_holter')} value={card.holterCount} /></Col>
                                <Col xs={12} sm={8}><Statistic title={t('analyse_smad')} value={card.smadCount} /></Col>
                                <Col xs={12} sm={8}><Statistic title={t('analyse_lab')} value={card.labCount} /></Col>
                                <Col xs={12} sm={8}><Statistic title={t('patient_diagnostics')} value={card.diagnoseCount} /></Col>
                            </Row>
                        </Card>
                    </Col>
                </Row>

                {combinedList.length > 0 && (
                    <Card
                        size="small"
                        style={{ marginTop: 16 }}
                        title={t('combined_analyses', { defaultValue: 'Kompleks AI xulosalari' })}
                    >
                        <Table
                            scroll={{ x: 'max-content' }}
                            rowKey="id"
                            size="small"
                            dataSource={combinedList}
                            pagination={false}
                            expandable={{
                                // Xulosa SHU sahifaning o'zida ochiladi —
                                // to'liq sahifaga o'tish shart emas
                                expandedRowKeys: expandedCombined,
                                onExpandedRowsChange: onCombinedExpand,
                                expandedRowRender: (row) => (
                                    <CombinedResult data={combinedDetails[row.id]} embedded />
                                ),
                            }}
                            columns={[
                                {
                                    title: t('created_at', { defaultValue: 'Yaratilgan' }),
                                    dataIndex: 'createdAt',
                                    key: 'createdAt',
                                    render: (value) => (value ? formatDateTime(value) : '—'),
                                },
                                {
                                    title: t('analyses', { defaultValue: 'Tahlillar' }),
                                    dataIndex: 'itemCount',
                                    key: 'itemCount',
                                    align: 'center',
                                    width: 110,
                                },
                                {
                                    title: t('status', { defaultValue: 'Holat' }),
                                    dataIndex: 'status',
                                    key: 'status',
                                    align: 'center',
                                    render: (status) => <StatusTag status={status} t={t} />,
                                },
                                {
                                    title: t('conclusion', { defaultValue: 'Xulosa' }),
                                    dataIndex: 'aiStatus',
                                    key: 'aiStatus',
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
                                {
                                    title: '',
                                    key: 'open',
                                    align: 'right',
                                    width: 100,
                                    render: (_, row) => (
                                        <Button
                                            size="small"
                                            onClick={() => navigate(`/combined-analyses/view/${row.id}`)}
                                        >
                                            {t('open', { defaultValue: 'Ochish' })}
                                        </Button>
                                    ),
                                },
                            ]}
                        />
                    </Card>
                )}

                {/* Bemor kartasi — dinamikaning eng tabiiy joyi: bu yerda
                    savol aynan "bu bemorda ko'rsatkich qanday o'zgardi"
                    bo'ladi. Kamida ikkita o'lchov bo'lmasa komponent o'zi
                    bo'sh holatni ko'rsatadi (T-035). */}
                <Card
                    size="small"
                    style={{ marginTop: 16 }}
                    title={t('indicator_dynamics', { defaultValue: "Ko'rsatkich dinamikasi" })}
                >
                    <LabDynamicsChart patcientId={card.patcient?.id ?? Number(id)} showTitle={false} />
                </Card>

                <Card
                    size="small"
                    data-tour="card-timeline"
                    style={{ marginTop: 16 }}
                    title={t('analyse_history', { defaultValue: 'Tahlillar tarixi' })}
                    extra={
                        <Space wrap>
                            <Text type="secondary">
                                {t('selected_count', { defaultValue: 'Tanlandi' })}: {selectedKeys.length}
                            </Text>
                            <Button
                                type="primary"
                                icon={<ExperimentOutlined />}
                                disabled={selectedItems.length < COMBINE_MIN || selectedItems.length > COMBINE_MAX}
                                onClick={() => setCombineOpen(true)}
                            >
                                {t('combine_with_ai', { defaultValue: 'Birgalikda AI tahlil qilish' })}
                            </Button>
                        </Space>
                    }
                >
                    <Table
                        scroll={{ x: 'max-content' }}
                        rowKey={(row) => `${row.type}-${row.id}`}
                        dataSource={card.timeline}
                        columns={columns}
                        pagination={{ pageSize: 10, showSizeChanger: false }}
                        rowSelection={{
                            selectedRowKeys: selectedKeys,
                            onChange: setSelectedKeys,
                            // Faqat AI natijasi TAYYOR bo'lgan tahlillarni
                            // birlashtirish mumkin — backend ham shu shartni
                            // tekshiradi, bu yerdagi cheklov shunchaki
                            // foydalanuvchini keraksiz xatolikdan asraydi
                            getCheckboxProps: (row) => ({
                                disabled: !COMBINABLE_TYPES.includes(row.type) || row.status !== 2,
                            }),
                        }}
                        onRow={(row) => ({
                            onClick: (event) => {
                                // Checkbox ustuniga bosilganda sahifa
                                // almashmasin — tanlash bekor bo'lib ketardi
                                if (event.target.closest?.('.ant-table-selection-column')) return
                                const meta = TYPE_META[row.type]
                                if (meta) navigate(`/${meta.path}/view/${row.id}`)
                            },
                            style: { cursor: 'pointer' },
                        })}
                        locale={{
                            emptyText: (
                                <EmptyState
                                    icon={<FaUserInjured />}
                                    message={t('no_analyses', { defaultValue: 'Tahlillar topilmadi' })}
                                />
                            ),
                        }}
                    />
                </Card>

                <Modal
                    open={combineOpen}
                    title={t('combine_with_ai', { defaultValue: 'Birgalikda AI tahlil qilish' })}
                    okText={t('send_to_ai', { defaultValue: 'AI ga yuborish' })}
                    cancelText={t('cancel', { defaultValue: 'Bekor qilish' })}
                    confirmLoading={combining}
                    onOk={startCombine}
                    onCancel={() => setCombineOpen(false)}
                >
                    <p>
                        {t('combine_confirm', {
                            defaultValue: 'Tanlangan {{count}} ta tahlil AI ga birgalikda yuboriladi va yagona yakuniy xulosa olinadi.',
                            count: selectedItems.length,
                        })}
                    </p>

                    <Alert
                        type="info"
                        showIcon
                        style={{ marginTop: 12 }}
                        message={t('combine_hint', {
                            defaultValue: 'Faqat AI natijasi tayyor bo\'lgan tahlillarni birlashtirish mumkin.',
                        })}
                        description={t('combine_deep_note', {
                            defaultValue: 'Tahlillarning AI xulosalari bilan birga EKG rasmlari ham AI ga yuboriladi, shuning uchun javob bir necha daqiqa olishi mumkin.',
                        })}
                    />
                </Modal>

            </div>
        </div>
    )
}
