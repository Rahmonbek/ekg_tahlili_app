import React, { useCallback, useEffect, useState } from 'react'
import { Button, Input, Table, Tag, Tooltip, Typography } from 'antd'
import { IdcardOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { FaUserInjured } from 'react-icons/fa'
import { get_patcients_of_clinic } from '../../../../host/requests/PatcientRequest'
import { formatPhoneNumberForForm, formatDate, calculateAge , rowNumber } from '../../../../tools/formatters'
import EmptyState from '../../../../components/shared/EmptyState'
import { patientsTour } from '../../../../tools/tourSteps'
import { usePageTour } from '../../../../components/shared/TourProvider';
import useDocumentTitle from '../../../../tools/useDocumentTitle';

const { Text } = Typography
const PAGE_SIZE = 10

/**
 * Shifoxona bemorlari ro'yxati.
 *
 * Bu fayl ilgari Xodimlar sahifasidan nusxa ko'chirilgan edi: "Bemorlar"
 * sarlavhasi ostida `get_doctors_of_clinic()` chaqirilib XODIMLAR ro'yxati
 * ko'rsatilardi, "Yangi xodim qo'shish" tugmasi va `role` ustuni bilan birga.
 * Endi sahifa haqiqiy bemorlar bilan ishlaydi.
 *
 * Maxfiylik: passport seriyasi serverda maskalanadi (`passportMasked`) —
 * to'liq seriya brauzerga umuman yuborilmaydi.
 */
export default function Patcients() {
    // Qo'llanma qadamlari ro'yxatdan o'tkaziladi; tugma header'da
    usePageTour(patientsTour);
    const { t } = useTranslation()
    useDocumentTitle(t('patcients', { defaultValue: "Bemorlar" }))
    const navigate = useNavigate()

    const [patients, setPatients] = useState([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [search, setSearch] = useState('')

    const lang = t('data_lang') === 'Ru' ? 'ru' : t('data_lang') === 'En' ? 'en' : 'uz'

    const fetchData = useCallback(async (currentPage, query) => {
        setLoading(true)
        try {
            const params = { page: currentPage, lang }
            if (query) params.search = query
            const res = await get_patcients_of_clinic(params)
            setPatients(res?.data?.data ?? [])
            setTotal(res?.data?.totalCount ?? 0)
        } catch (err) {
            setPatients([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }, [lang])

    useEffect(() => {
        fetchData(page, search)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, lang])

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
            title: t('FIO'),
            key: 'fio',
            render: (_, row) => (
                <div>
                    <Text strong>
                        {[row.lastName, row.firstName].filter(Boolean).join(' ')}
                    </Text>
                    <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {row.birthDate ? `${calculateAge(row.birthDate)} ${t('age', { defaultValue: 'yosh' })}` : ''}
                            {` · ${row.gender
                                ? t('male', { defaultValue: 'Erkak' })
                                : t('female', { defaultValue: 'Ayol' })}`}
                        </Text>
                    </div>
                </div>
            ),
        },
        {
            title: t('passport', { defaultValue: 'Passport' }),
            dataIndex: 'passportMasked',
            key: 'passport',
            align: 'center',
            render: (value) => (
                <Tooltip title={t('passport_masked_hint', { defaultValue: 'Maxfiylik uchun to\'liq ko\'rsatilmaydi' })}>
                    <Text type="secondary">{value || '—'}</Text>
                </Tooltip>
            ),
        },
        {
            title: t('birth_date', { defaultValue: 'Tug\'ilgan sana' }),
            dataIndex: 'birthDate',
            key: 'birthDate',
            align: 'center',
            render: (value) => (value ? formatDate(value) : '—'),
        },
        {
            title: t('phone_number'),
            dataIndex: 'phone',
            key: 'phone',
            align: 'center',
            render: (value) => (value ? formatPhoneNumberForForm(value) : '—'),
        },
        {
            title: t('addres', { defaultValue: 'Manzil' }),
            key: 'address',
            ellipsis: true,
            render: (_, row) => {
                const parts = [row.regionName, row.districtName, row.address].filter(Boolean)
                return parts.length ? parts.join(', ') : '—'
            },
        },
        {
            title: t('analyses', { defaultValue: 'Tahlillar' }),
            key: 'analyses',
            align: 'center',
            width: 120,
            render: (_, row) =>
                row.analysesCount > 0
                    ? <Tag color="blue">{row.analysesCount}</Tag>
                    : <Text type="secondary">—</Text>,
        },
    ]

    return (
        <div>
            <div className="main_card">
                <h1>
                    <span>{t('patcients', { defaultValue: 'Bemorlar' })}</span>
                </h1>
                <div className="main_card_content big_card_content">
                    <div
                        data-tour="patients-search"
                        style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}
                    >
                        <Input.Search
                            allowClear
                            placeholder={t('search_patient_placeholder', { defaultValue: 'Ism, familiya yoki telefon bo\'yicha qidirish' })}
                            onSearch={handleSearch}
                            // Boshqa ro'yxat sahifalaridagi kabi yozuvli tugma
                            enterButton={t('search', { defaultValue: 'Qidirish' })}
                            style={{ maxWidth: 460, flex: '1 1 320px' }}
                        />
                        {/* Ro'yxat rol bo'yicha cheklangan — bu tugma bazadagi
                            ISTALGAN bemorni passport bo'yicha topish uchun.
                            To'rttala rolda ham ko'rinadi. */}
                        <Button
                            icon={<IdcardOutlined />}
                            onClick={() => navigate('/patcients/search')}
                        >
                            {t('search_by_passport', { defaultValue: 'Passport ma\'lumotlari bilan qidirish' })}
                        </Button>
                    </div>
                    <div className="doctors_table" data-tour="patients-table">
                        <Table
                            scroll={{ x: 'max-content' }}
                            rowKey="id"
                            loading={loading}
                            dataSource={patients}
                            columns={columns}
                            onRow={(row) => ({
                                onClick: () => navigate(`/patcients/${row.id}`),
                                style: { cursor: 'pointer' },
                            })}
                            locale={{
                                emptyText: (
                                    <EmptyState
                                        icon={<FaUserInjured />}
                                        message={t('no_patients', { defaultValue: 'Hech qanday bemor topilmadi' })}
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
