import React, { useCallback, useEffect, useState } from 'react'
import { Col, DatePicker, Input, Row, Select, Table, Tag, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { FaShieldAlt } from 'react-icons/fa'
import { get_audit_logs, get_audit_actions } from '../../../host/requests/AuditLogRequest'
import { formatDateTime } from '../../../tools/formatters'
import EmptyState from '../../../components/shared/EmptyState'
import useDocumentTitle from '../../../tools/useDocumentTitle';

const { Text } = Typography
const PAGE_SIZE = 20

/**
 * Audit jurnali sahifasi (Admin / Direktor).
 *
 * `api/audit-logs` endpointi ancha vaqtdan beri ishlab turardi, lekin
 * frontendda uni ko'rsatadigan hech qanday sahifa yo'q edi — ya'ni
 * O'z DSt 2814:2014 ning "Admin uchun loglarni ko'rish interfeysi" talabi
 * amalda bajarilmagan edi.
 */

/** HTTP javob kodiga qarab rang. */
function statusColor(code) {
    if (code == null) return 'default'
    if (code >= 500) return 'error'
    if (code >= 400) return 'warning'
    if (code >= 200 && code < 300) return 'success'
    return 'default'
}

/** Amal turiga qarab rang — xavfsizlik uchun muhimlari ajralib tursin. */
function actionColor(action) {
    if (!action) return 'default'
    if (action.includes('DELETE')) return 'red'
    if (action.includes('LOGIN') || action.includes('AUTH')) return 'blue'
    if (action.includes('CREATE') || action.includes('REGISTER')) return 'green'
    if (action.includes('UPDATE') || action.includes('RESTORE')) return 'gold'
    return 'default'
}

export default function AuditLogs() {
    const { t } = useTranslation()
    useDocumentTitle(t('audit_log', { defaultValue: "Audit jurnali" }))

    const [data, setData] = useState([])
    const [actions, setActions] = useState([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)

    const [action, setAction] = useState(null)
    const [entityType, setEntityType] = useState('')
    const [range, setRange] = useState([null, null])

    const fetchData = useCallback(async (p, filters) => {
        setLoading(true)
        try {
            const params = { page: p, pageSize: PAGE_SIZE }
            if (filters.action) params.action = filters.action
            if (filters.entityType) params.entityType = filters.entityType
            if (filters.range?.[0]) params.fromDate = filters.range[0].startOf('day').toISOString()
            if (filters.range?.[1]) params.toDate = filters.range[1].endOf('day').toISOString()

            const res = await get_audit_logs(params)
            setData(res?.data?.data ?? [])
            setTotal(res?.data?.totalCount ?? 0)
        } catch (err) {
            setData([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData(page, { action, entityType, range })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page])

    useEffect(() => {
        get_audit_actions()
            .then((res) => setActions(res?.data ?? []))
            .catch(() => setActions([]))
    }, [])

    const applyFilters = (next) => {
        setPage(1)
        fetchData(1, next)
    }

    const columns = [
        {
            title: t('date_time', { defaultValue: 'Sana va vaqt' }),
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 170,
            render: (v) => (v ? formatDateTime(v) : '—'),
        },
        {
            title: t('user', { defaultValue: 'Foydalanuvchi' }),
            key: 'user',
            render: (_, row) => (
                <div>
                    <Text>{row.username || '—'}</Text>
                    {row.userId ? (
                        <div><Text type="secondary" style={{ fontSize: 12 }}>ID: {row.userId}</Text></div>
                    ) : null}
                </div>
            ),
        },
        {
            title: t('action', { defaultValue: 'Amal' }),
            dataIndex: 'action',
            key: 'action',
            render: (v) => <Tag color={actionColor(v)}>{v}</Tag>,
        },
        {
            title: t('object', { defaultValue: 'Obyekt' }),
            key: 'entity',
            render: (_, row) =>
                row.entityType
                    ? <Text>{row.entityType}{row.entityId ? ` #${row.entityId}` : ''}</Text>
                    : <Text type="secondary">—</Text>,
        },
        {
            title: t('request', { defaultValue: 'So\'rov' }),
            key: 'request',
            ellipsis: true,
            render: (_, row) => (
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {row.httpMethod} {row.requestPath}
                </Text>
            ),
        },
        {
            // `status` kaliti platformada "Tahlil holati" ma'nosida ishlatiladi —
            // bu yerda HTTP javob kodi, shuning uchun alohida kalit
            title: t('http_status', { defaultValue: 'Javob kodi' }),
            dataIndex: 'responseStatus',
            key: 'responseStatus',
            align: 'center',
            width: 90,
            render: (v) => (v == null ? '—' : <Tag color={statusColor(v)}>{v}</Tag>),
        },
        {
            title: 'IP',
            dataIndex: 'ipAddress',
            key: 'ipAddress',
            width: 130,
            render: (v) => <Text type="secondary" style={{ fontSize: 12 }}>{v || '—'}</Text>,
        },
    ]

    return (
        <div>
            <div className="main_card">
                <h1>
                    <span>{t('audit_log', { defaultValue: 'Audit jurnali' })}</span>
                </h1>

                <div className="main_card_content big_card_content">
                    <div style={{ padding: '0 0 20px 0' }} className="filter_form_box">
                        <Row gutter={[12, 12]} align="bottom">
                            <Col xs={24} sm={12} md={8} lg={6}>
                                <div className="filter_item">
                                    <label className="filter_label">{t('action', { defaultValue: 'Amal' })}</label>
                                    <Select
                                        className="login_input custom_select"
                                        style={{ width: '100%' }}
                                        allowClear
                                        showSearch
                                        placeholder={t('all', { defaultValue: 'Barchasi' })}
                                        value={action}
                                        options={actions.map((a) => ({ value: a, label: a }))}
                                        onChange={(v) => {
                                            setAction(v ?? null)
                                            applyFilters({ action: v ?? null, entityType, range })
                                        }}
                                    />
                                </div>
                            </Col>
                            <Col xs={24} sm={12} md={8} lg={6}>
                                <div className="filter_item">
                                    <label className="filter_label">{t('object', { defaultValue: 'Obyekt' })}</label>
                                    <Input
                                        className="login_input"
                                        allowClear
                                        placeholder="ecg, lab, user…"
                                        value={entityType}
                                        onChange={(e) => setEntityType(e.target.value)}
                                        onPressEnter={() => applyFilters({ action, entityType, range })}
                                    />
                                </div>
                            </Col>
                            <Col xs={24} sm={24} md={8} lg={8}>
                                <div className="filter_item">
                                    <label className="filter_label">{t('date_filter')}</label>
                                    <DatePicker.RangePicker
                                        className="login_input"
                                        style={{ width: '100%' }}
                                        format="DD.MM.YYYY"
                                        allowEmpty={[true, true]}
                                        value={range[0] || range[1] ? range : null}
                                        onChange={(v) => {
                                            const next = v || [null, null]
                                            setRange(next)
                                            applyFilters({ action, entityType, range: next })
                                        }}
                                    />
                                </div>
                            </Col>
                        </Row>
                    </div>

                    <div className="doctors_table">
                        <Table
                            scroll={{ x: 'max-content' }}
                            rowKey="id"
                            loading={loading}
                            dataSource={data}
                            columns={columns}
                            size="small"
                            locale={{
                                emptyText: (
                                    <EmptyState
                                        icon={<FaShieldAlt />}
                                        message={t('no_audit_logs', { defaultValue: 'Jurnalda yozuv topilmadi' })}
                                    />
                                ),
                            }}
                            pagination={{
                                current: page,
                                pageSize: PAGE_SIZE,
                                total,
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
