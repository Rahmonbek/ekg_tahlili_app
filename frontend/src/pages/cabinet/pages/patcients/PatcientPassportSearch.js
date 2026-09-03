import React, { useState } from 'react'
import { Alert, Button, Card, Col, Form, Input, Row, Table, Tag, Typography } from 'antd'
import { ArrowLeftOutlined, SearchOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { FaUserInjured } from 'react-icons/fa'
import { search_patcients_by_passport } from '../../../../host/requests/PatcientRequest'
import DateField, { dateFieldProps } from '../../../../components/shared/DateField'
import { calculateAge, formatDate, formatPhoneNumberForForm } from '../../../../tools/formatters'
import EmptyState from '../../../../components/shared/EmptyState'
import useDocumentTitle from '../../../../tools/useDocumentTitle'

const { Text } = Typography

/**
 * Passport ma'lumotlari bo'yicha bemor qidirish.
 *
 * Nima uchun alohida sahifa: bemorlar ro'yxati rol bo'yicha cheklangan —
 * shifokor faqat o'zi ishlagan bemorlarni ko'radi. Ammo boshqa xodim
 * yuklagan bemor haqida ma'lumot kerak bo'lishi mumkin. Bu sahifa
 * bazadagi ISTALGAN bemorni topa oladi, lekin faqat passport seriyasi
 * VA tug'ilgan sana ikkalasi ham to'g'ri kiritilganda — ya'ni ro'yxatni
 * "kezib" chiqib bo'lmaydi.
 */
export default function PatcientPassportSearch() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [form] = Form.useForm()

    useDocumentTitle(t('search_by_passport', { defaultValue: 'Passport bo\'yicha qidirish' }))

    const [rows, setRows] = useState(null)   // null = hali qidirilmagan
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const lang = t('data_lang') === 'Ru' ? 'ru' : t('data_lang') === 'En' ? 'en' : 'uz'

    const onSearch = async (values) => {
        setLoading(true)
        setError(null)
        try {
            const res = await search_patcients_by_passport({
                passport: values.passport?.trim(),
                birthdate: values.birthdate,
                lang,
            })
            setRows(res?.data?.data ?? [])
        } catch (err) {
            setRows([])
            setError(
                err?.response?.data?.message
                || t('search_failed', { defaultValue: 'Qidiruvda xatolik yuz berdi' })
            )
        } finally {
            setLoading(false)
        }
    }

    const columns = [
        {
            title: t('FIO'),
            key: 'fio',
            render: (_, row) => (
                <div>
                    <Text strong>{[row.lastName, row.firstName, row.sureName].filter(Boolean).join(' ')}</Text>
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
            render: (value) => value || '—',
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
        <div className="main_card">
            <div className="main_card_content big_card_content">

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                    <Button onClick={() => navigate('/patcients')} icon={<ArrowLeftOutlined />}>
                        {t('back', { defaultValue: 'Orqaga' })}
                    </Button>
                    <h1 style={{ margin: 0 }}>
                        {t('search_by_passport', { defaultValue: 'Passport ma\'lumotlari bilan qidirish' })}
                    </h1>
                </div>

                <Card size="small" style={{ marginBottom: 16 }}>
                    <Form form={form} layout="vertical" onFinish={onSearch}>
                        <Row gutter={[12, 0]} align="bottom">
                            <Col xs={24} md={9}>
                                <Form.Item
                                    name="passport"
                                    label={t('passport_series', { defaultValue: 'Passport seriyasi va raqami' })}
                                    rules={[{ required: true, message: t('required_field', { defaultValue: 'Bu maydon to\'ldirilishi shart' }) }]}
                                >
                                    <Input
                                        className="login_input"
                                        placeholder="AB1234567"
                                        maxLength={20}
                                        autoFocus
                                    />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={9}>
                                <Form.Item
                                    name="birthdate"
                                    label={t('birth_date', { defaultValue: 'Tug\'ilgan sana' })}
                                    rules={[{ required: true, message: t('required_field', { defaultValue: 'Bu maydon to\'ldirilishi shart' }) }]}
                                    {...dateFieldProps()}
                                >
                                    <DateField />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={6}>
                                <Form.Item>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        icon={<SearchOutlined />}
                                        loading={loading}
                                        block
                                    >
                                        {t('search', { defaultValue: 'Qidirish' })}
                                    </Button>
                                </Form.Item>
                            </Col>
                        </Row>
                    </Form>

                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {t('passport_search_hint', {
                            defaultValue: 'Bemor topilishi uchun passport seriyasi va tug\'ilgan sana ikkalasi ham aniq kiritilishi kerak.',
                        })}
                    </Text>
                </Card>

                {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

                {rows !== null && (
                    <Table
                        scroll={{ x: 'max-content' }}
                        rowKey="id"
                        loading={loading}
                        dataSource={rows}
                        columns={columns}
                        pagination={false}
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
                    />
                )}

            </div>
        </div>
    )
}
