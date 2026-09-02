import React, { useEffect, useState } from 'react'
import { Card, Col, Empty, Row, Spin, Tag, Button, Tooltip } from 'antd'
import {
    FileTextOutlined, ClockCircleOutlined, CheckCircleOutlined,
    InboxOutlined, RightOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { get_doctor_dashboard } from '../host/requests/DashboardRequest'

// Tahlil turi → ko'rsatish sozlamalari (nom, rang, view sahifasi)
const TYPE_META = {
    ecg:    { label: 'EKG',          color: '#0EA5A4', route: '/ecg-analyses/view' },
    holter: { label: 'Holter',       color: '#6366F1', route: '/holter-analyses/view' },
    smad:   { label: 'SMAD',         color: '#8B5CF6', route: '/smad-analyses/view' },
    lab:    { label: 'Laboratoriya', color: '#F59E0B', route: '/lab-analyses/view' },
}

// AI jiddiylik darajasi → rang/nom (ro'yxat sahifalari bilan bir xil)
const severityTag = (sev, t) => {
    const map = {
        1: { color: 'green', label: t('normal', { defaultValue: 'Normal' }) },
        2: { color: 'gold',  label: t('avarage', { defaultValue: "O'rta" }) },
        3: { color: 'red',   label: t('danger', { defaultValue: 'Xavfli' }) },
    }
    const it = map[sev]
    return (
        <Tag color={it ? it.color : 'default'} style={{ borderRadius: 4, fontWeight: 500, margin: 0 }}>
            {it ? it.label : t('severity_unknown', { defaultValue: 'Baholanmadi' })}
        </Tag>
    )
}

function StatCard({ icon, value, label, color }) {
    return (
        <Card size="small" className="doc-dash-stat" bodyStyle={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="doc-dash-stat-icon" style={{ background: `${color}1A`, color }}>
                    {icon}
                </div>
                <div>
                    <div className="doc-dash-stat-value">{value}</div>
                    <div className="doc-dash-stat-label">{label}</div>
                </div>
            </div>
        </Card>
    )
}

/**
 * Shifokor profili paneli.
 *
 * Shaxsiy ma'lumotlardan keyin ko'rinadi: unga yuborilgan (tayinlangan)
 * tahlillar statistikasi va HALI XULOSA YOZILMAGAN tahlillar ro'yxati.
 * Har bir yozuvdan bevosita tahlil sahifasiga (xulosa yozishga) o'tiladi.
 *
 * Faqat shifokor (roleId=4) uchun ko'rsatiladi — Profile.js shartida.
 */
export default function DoctorDashboard() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState(null)

    useEffect(() => {
        let alive = true
        get_doctor_dashboard(12)
            .then((res) => { if (alive) setData(res.data) })
            .catch(() => { if (alive) setData(null) })
            .finally(() => { if (alive) setLoading(false) })
        return () => { alive = false }
    }, [])

    const items = data?.items || []

    return (
        <div className="doc-dash">
            <h2 className="doc-dash-heading">
                {t('assigned_analyses', { defaultValue: 'Menga yuborilgan tahlillar' })}
            </h2>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
            ) : (
                <>
                    {/* Statistika kartalari */}
                    <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                        <Col xs={24} sm={8}>
                            <StatCard
                                icon={<InboxOutlined />}
                                color="#0EA5A4"
                                value={data?.assigned ?? 0}
                                label={t('total_assigned', { defaultValue: 'Jami yuborilgan' })}
                            />
                        </Col>
                        <Col xs={24} sm={8}>
                            <StatCard
                                icon={<ClockCircleOutlined />}
                                color="#F59E0B"
                                value={data?.pending ?? 0}
                                label={t('pending_conclusion', { defaultValue: 'Xulosa kutmoqda' })}
                            />
                        </Col>
                        <Col xs={24} sm={8}>
                            <StatCard
                                icon={<CheckCircleOutlined />}
                                color="#16A34A"
                                value={data?.concluded ?? 0}
                                label={t('concluded', { defaultValue: 'Xulosa yozilgan' })}
                            />
                        </Col>
                    </Row>

                    {/* Xulosa yozilmagan tahlillar ro'yxati */}
                    <Card
                        size="small"
                        title={
                            <span>
                                <FileTextOutlined style={{ marginRight: 8, color: '#F59E0B' }} />
                                {t('pending_conclusion_list', { defaultValue: 'Xulosa yozilmagan tahlillar' })}
                            </span>
                        }
                    >
                        {items.length === 0 ? (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description={t('no_pending_conclusion', {
                                    defaultValue: 'Xulosa kutayotgan tahlil yo\'q — barchasi yozilgan',
                                })}
                            />
                        ) : (
                            <div className="doc-dash-list">
                                {items.map((it) => {
                                    const meta = TYPE_META[it.type] || { label: it.type, color: '#64748B', route: '' }
                                    const goto = () => meta.route && navigate(`${meta.route}/${it.id}`)
                                    return (
                                        <div key={`${it.type}-${it.id}`} className="doc-dash-row" onClick={goto}>
                                            <span
                                                className="doc-dash-type"
                                                style={{ background: `${meta.color}1A`, color: meta.color }}
                                            >
                                                {meta.label}
                                            </span>
                                            <div className="doc-dash-row-main">
                                                <div className="doc-dash-patient">
                                                    {it.patientName?.trim() || t('unknown_patient', { defaultValue: 'Noma\'lum bemor' })}
                                                </div>
                                                <div className="doc-dash-meta">
                                                    {it.documentNumber ? `№ ${it.documentNumber}` : ''}
                                                    {it.createdAt ? (
                                                        <span className="doc-dash-date">
                                                            {new Date(it.createdAt).toLocaleDateString()}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </div>
                                            {severityTag(it.severity, t)}
                                            <Tooltip title={t('write_conclusion', { defaultValue: 'Xulosa yozish' })}>
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    icon={<RightOutlined />}
                                                    onClick={(e) => { e.stopPropagation(); goto() }}
                                                />
                                            </Tooltip>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </Card>
                </>
            )}
        </div>
    )
}
