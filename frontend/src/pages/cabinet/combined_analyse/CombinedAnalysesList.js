import React, { useCallback, useEffect, useState } from 'react'
import { Input, Table, Tag, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { FaUserInjured } from 'react-icons/fa'
import { get_combined_analyses_list } from '../../../host/requests/CombinedAnalysisRequest'
import { calculateAge, formatDateTime, rowNumber } from '../../../tools/formatters'
import { severityColor, severityLabel } from '../../../tools/severity'
import EmptyState from '../../../components/shared/EmptyState'
import useDocumentTitle from '../../../tools/useDocumentTitle'

const { Text } = Typography
const PAGE_SIZE = 10

/**
 * Xulosaga kirgan tahlil turi → rang va nom kaliti.
 *
 * Nomlar QISQA (`nav_*`, yon paneldagi bilan bir xil): bitta xulosada
 * o'ntagacha tahlil bo'lishi mumkin va "Laboratoriya tahlillari" kabi
 * uzun teglar ustunni ekrandan chiqarib yuborardi.
 */
const TYPE_META = {
    ecg: { color: 'red', key: 'nav_ecg' },
    holter: { color: 'volcano', key: 'nav_holter' },
    smad: { color: 'blue', key: 'nav_smad' },
    lab: { color: 'green', key: 'nav_lab' },
}

/**
 * "Xulosaga kirgan tahlillar" ustunining eng katta kengligi.
 *
 * Jadval `scroll={{ x: 'max-content' }}` bilan ishlaydi — chegara
 * qo'yilmasa ustun tarkibga qarab cheksiz kengayib, qolgan ustunlarni
 * ekrandan surib chiqarardi. Chegara bilan teglar pastki qatorga tushadi.
 */
const SOURCES_MAX_WIDTH = 280

/** Kompleks xulosa holati (int) → rangli belgi. */
function StatusTag({ status, t }) {
    switch (status) {
        case 2:
            return <Tag color="success">{t('ready', { defaultValue: 'Tayyor' })}</Tag>
        case -1:
            return <Tag color="error">{t('error', { defaultValue: 'Xatolik' })}</Tag>
        case 1:
        case 0:
            return <Tag color="processing">{t('ai_processing', { defaultValue: 'AI tahlil qilmoqda' })}</Tag>
        default:
            return <Text type="secondary">—</Text>
    }
}

/**
 * Kompleks (ko'p tahlilli) AI xulosalarining umumiy ro'yxati.
 *
 * Ilgari bu xulosalar faqat bitta bemor kartasi ichidan ko'rinardi —
 * ya'ni ularni ko'rish uchun avval bemorni topish kerak edi. Bu sahifa
 * ularni bitta joyga yig'adi.
 *
 * Ko'rinish rol bo'yicha cheklangan va bemorlar ro'yxatidagi bilan
 * AYNAN bir xil qoidaga bo'ysunadi (backend: `PatientVisibility`):
 * shifokor — o'zi yuklagan yoki o'ziga biriktirilgan tahlillar
 * bemorlarini, hamshira — faqat o'zi yuklaganlarini, admin va direktor —
 * butun klinikanikini.
 */
export default function CombinedAnalysesList() {
    const { t } = useTranslation()
    const navigate = useNavigate()

    useDocumentTitle(t('combined_analyses', { defaultValue: 'Kompleks AI xulosalari' }))

    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [search, setSearch] = useState('')

    const fetchData = useCallback(async (currentPage, query) => {
        setLoading(true)
        try {
            const params = { page: currentPage, pageSize: PAGE_SIZE }
            if (query) params.search = query
            const res = await get_combined_analyses_list(params)
            setRows(res?.data?.items ?? [])
            setTotal(res?.data?.totalCount ?? 0)
        } catch (err) {
            setRows([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData(page, search)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page])

    const handleSearch = (value) => {
        setSearch(value)
        setPage(1)
        fetchData(1, value)
    }

    const columns = [
        {
            title: '#',
            key: 'index',
            align: 'center',
            width: 60,
            render: rowNumber(page, PAGE_SIZE),
        },
        {
            title: t('patcient', { defaultValue: 'Bemor' }),
            key: 'patient',
            render: (_, row) => (
                <div>
                    <Text strong>
                        {[row.patientLastName, row.patientFirstName].filter(Boolean).join(' ')}
                    </Text>
                    <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {row.patientBirthDate
                                ? `${calculateAge(row.patientBirthDate)} ${t('age', { defaultValue: 'yosh' })}`
                                : ''}
                            {` · ${row.patientGender
                                ? t('male', { defaultValue: 'Erkak' })
                                : t('female', { defaultValue: 'Ayol' })}`}
                        </Text>
                    </div>
                </div>
            ),
        },
        {
            title: t('combined_sources', { defaultValue: 'Xulosaga kirgan tahlillar' }),
            key: 'items',
            width: SOURCES_MAX_WIDTH,
            render: (_, row) => (
                <div style={{
                    display: 'flex',
                    gap: 4,
                    flexWrap: 'wrap',
                    maxWidth: SOURCES_MAX_WIDTH,
                }}>
                    {(row.items ?? []).map((item) => {
                        const meta = TYPE_META[item.type]
                        return (
                            <Tag
                                key={`${item.type}-${item.analysisId}`}
                                color={meta?.color}
                                style={{ marginInlineEnd: 0 }}
                            >
                                {meta ? t(meta.key) : item.type}
                            </Tag>
                        )
                    })}
                </div>
            ),
        },
        {
            title: t('created_at', { defaultValue: 'Yaratilgan' }),
            dataIndex: 'createdAt',
            key: 'createdAt',
            align: 'center',
            render: (value) => (value ? formatDateTime(value) : '—'),
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
    ]

    return (
        <div>
            <div className="main_card">
                <h1>
                    <span>{t('combined_analyses', { defaultValue: 'Kompleks AI xulosalari' })}</span>
                    {/* Boshqa ro'yxat sahifalaridagi kabi — sarlavha bilan
                        bir qatorda, o'ng tomonda */}
                    <button
                        onClick={() => navigate('/combined-analyzer')}
                        className="btn_form"
                        style={{ width: 'auto', padding: '0 24px', marginTop: 0 }}
                    >
                        {t('new_combined_analysis', { defaultValue: 'Yangi kompleks tahlil' })}
                    </button>
                </h1>
                <div className="main_card_content big_card_content">
                    <div style={{ marginBottom: 16 }}>
                        <Input.Search
                            allowClear
                            placeholder={t('search_patient_by_name', {
                                defaultValue: 'Bemor ismi yoki familiyasi bo\'yicha qidirish',
                            })}
                            onSearch={handleSearch}
                            enterButton={t('search', { defaultValue: 'Qidirish' })}
                            style={{ maxWidth: 460 }}
                        />
                    </div>
                    <div className="doctors_table">
                        <Table
                            scroll={{ x: 'max-content' }}
                            rowKey="id"
                            loading={loading}
                            dataSource={rows}
                            columns={columns}
                            onRow={(row) => ({
                                onClick: () => navigate(`/combined-analyses/view/${row.id}`),
                                style: { cursor: 'pointer' },
                            })}
                            locale={{
                                emptyText: (
                                    <EmptyState
                                        icon={<FaUserInjured />}
                                        message={t('no_combined_analyses', {
                                            defaultValue: 'Hozircha kompleks xulosa yaratilmagan. Uni bemor kartasidan yarating.',
                                        })}
                                    />
                                ),
                            }}
                            pagination={{
                                current: page,
                                pageSize: PAGE_SIZE,
                                total: total,
                                showSizeChanger: false,
                                onChange: setPage,
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
