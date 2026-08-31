import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Card, Col, Row, Skeleton, Statistic, Table, Tag, Typography } from 'antd'
import { CheckCircleFilled, CloseCircleFilled, ReloadOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { get_system_status } from '../../../host/requests/SystemRequest'
import { formatDateTime } from '../../../tools/formatters'
import useDocumentTitle from '../../../tools/useDocumentTitle';

const { Text } = Typography

/**
 * Tizim holati / diagnostika sahifasi.
 *
 * Klinika xodimi tahlil natijasi kelmayotganda muammo o'zidami yoki
 * platformadami — buni bilishning yo'li yo'q edi. Endi API, baza va AI
 * xizmatining holati hamda oxirgi 24 soatdagi tahlillar statistikasi
 * bir joyda ko'rinadi.
 */

function StatusBadge({ ok, t }) {
    return ok
        ? <Tag icon={<CheckCircleFilled />} color="success">{t('service_ok', { defaultValue: 'Ishlamoqda' })}</Tag>
        : <Tag icon={<CloseCircleFilled />} color="error">{t('service_down', { defaultValue: 'Ishlamayapti' })}</Tag>
}

export default function SystemStatus() {
    const { t } = useTranslation()
    useDocumentTitle(t('system_status', { defaultValue: "Tizim holati" }))
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await get_system_status()
            setData(res?.data ?? null)
            setError(false)
        } catch {
            setData(null)
            setError(true)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { load() }, [load])

    const services = data?.services
    const stats = data?.last24Hours

    const typeRows = stats?.byType
        ? [
            { key: 'ecg', name: t('analyse_ecg'), ...stats.byType.ecg },
            { key: 'holter', name: t('analyse_holter'), ...stats.byType.holter },
            { key: 'smad', name: t('analyse_smad'), ...stats.byType.smad },
            { key: 'lab', name: t('analyse_lab'), ...stats.byType.lab },
        ]
        : []

    return (
        <div className="main_card">
            <h1>
                <span>{t('system_status', { defaultValue: 'Tizim holati' })}</span>
                <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
                    {t('refresh', { defaultValue: 'Yangilash' })}
                </Button>
            </h1>

            <div className="main_card_content big_card_content">
                {loading && !data ? <Skeleton active paragraph={{ rows: 6 }} /> : null}

                {error ? (
                    <Alert
                        type="error"
                        showIcon
                        message={t('status_load_failed', { defaultValue: 'Holatni olishning iloji bo\'lmadi' })}
                        description={t('status_load_failed_desc', {
                            defaultValue: 'Server bilan bog\'lanib bo\'lmadi. Bu ham platformada muammo borligini bildiradi.',
                        })}
                    />
                ) : null}

                {data ? (
                    <>
                        <Row gutter={[16, 16]}>
                            <Col xs={24} md={8}>
                                <Card size="small" title="API">
                                    <StatusBadge ok={services?.api?.ok} t={t} />
                                    <div style={{ marginTop: 8 }}>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            {t('api_desc', { defaultValue: 'Asosiy server — barcha so\'rovlar shu orqali o\'tadi' })}
                                        </Text>
                                    </div>
                                </Card>
                            </Col>
                            <Col xs={24} md={8}>
                                <Card size="small" title={t('database', { defaultValue: 'Ma\'lumotlar bazasi' })}>
                                    <StatusBadge ok={services?.database?.ok} t={t} />
                                    <div style={{ marginTop: 8 }}>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            {t('database_desc', { defaultValue: 'Bemorlar va tahlillar shu yerda saqlanadi' })}
                                        </Text>
                                    </div>
                                </Card>
                            </Col>
                            <Col xs={24} md={8}>
                                <Card size="small" title={t('ai_service', { defaultValue: 'AI tahlil xizmati' })}>
                                    <StatusBadge ok={services?.ai?.ok} t={t} />
                                    <div style={{ marginTop: 8 }}>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            {services?.ai?.ok
                                                ? t('ai_service_desc', { defaultValue: 'Yuborilgan tahlillar qayta ishlanmoqda' })
                                                : t('ai_service_down_desc', { defaultValue: 'Yangi tahlillar navbatda qoladi va xizmat tiklangach qayta ishlanadi' })}
                                        </Text>
                                    </div>
                                </Card>
                            </Col>
                        </Row>

                        <Card
                            size="small"
                            style={{ marginTop: 16 }}
                            title={t('last_24_hours', { defaultValue: 'Oxirgi 24 soat' })}
                        >
                            <Row gutter={[16, 16]} style={{ marginBottom: 12 }}>
                                <Col xs={8}>
                                    <Statistic title={t('total', { defaultValue: 'Jami' })} value={stats?.total ?? 0} />
                                </Col>
                                <Col xs={8}>
                                    <Statistic
                                        title={t('failed', { defaultValue: 'Xatolik' })}
                                        value={stats?.failed ?? 0}
                                        valueStyle={{ color: stats?.failed ? '#DC2626' : undefined }}
                                    />
                                </Col>
                                <Col xs={8}>
                                    <Statistic
                                        title={t('in_progress', { defaultValue: 'Jarayonda' })}
                                        value={stats?.pending ?? 0}
                                        valueStyle={{ color: stats?.pending ? '#F59E0B' : undefined }}
                                    />
                                </Col>
                            </Row>

                            <Table
                                size="small"
                                rowKey="key"
                                pagination={false}
                                scroll={{ x: 'max-content' }}
                                dataSource={typeRows}
                                columns={[
                                    { title: t('analyse_type', { defaultValue: 'Tahlil turi' }), dataIndex: 'name', key: 'name' },
                                    { title: t('total', { defaultValue: 'Jami' }), dataIndex: 'total', key: 'total', align: 'center' },
                                    {
                                        title: t('failed', { defaultValue: 'Xatolik' }),
                                        dataIndex: 'failed',
                                        key: 'failed',
                                        align: 'center',
                                        render: (v) => (v ? <Tag color="error">{v}</Tag> : <Text type="secondary">0</Text>),
                                    },
                                    {
                                        title: t('in_progress', { defaultValue: 'Jarayonda' }),
                                        dataIndex: 'pending',
                                        key: 'pending',
                                        align: 'center',
                                        render: (v) => (v ? <Tag color="warning">{v}</Tag> : <Text type="secondary">0</Text>),
                                    },
                                ]}
                            />
                        </Card>

                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 12 }}>
                            {t('checked_at', { defaultValue: 'Tekshirilgan vaqt' })}: {formatDateTime(data.checkedAt)}
                        </Text>
                    </>
                ) : null}
            </div>
        </div>
    )
}
