import React, { useCallback, useEffect, useState } from 'react'
import { Button, Popconfirm, Segmented, Skeleton, Tag } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Bar } from 'react-chartjs-2'
import { FaHospital, FaUsers, FaUserInjured, FaHeartbeat, FaExclamationTriangle, FaHourglassHalf, FaRobot, FaHeartBroken } from 'react-icons/fa'
import '../statistics/statsCommon'
import '../statistics/LabStatistics.css'
import { Ring } from '../statistics/statsUi'
import { sa_overview, sa_set_clinic_active } from '../../../host/requests/SuperAdminRequest'
import { get_system_status } from '../../../host/requests/SystemRequest'
import { roleName } from '../../../tools/roles'
import useDocumentTitle from '../../../tools/useDocumentTitle'
import { ANALYSIS_TYPES, fmtDate, fmtDateTime, fmtNum, typeLabel, TypeTag } from './saCommon'
import './SuperAdmin.css'

const PERIODS = [7, 30, 90, 365]

function Kpi({ icon, label, value, sub, tone, to }) {
    const navigate = useNavigate()
    return (
        <div
            className={`sa-kpi${tone ? ` sa-kpi--${tone}` : ''}${to ? ' sa-kpi--link' : ''}`}
            onClick={to ? () => navigate(to) : undefined}
            role={to ? 'link' : undefined}
        >
            <div className="sa-kpi-icon">{icon}</div>
            <div className="sa-kpi-body">
                <div className="sa-kpi-label">{label}</div>
                <div className="sa-kpi-value">{value}</div>
                {sub ? <div className="sa-kpi-sub">{sub}</div> : null}
            </div>
        </div>
    )
}

/**
 * SuperAdmin boshqaruv paneli (SA-14): butun platforma bir qarashda —
 * klinikalar, xodimlar, bemorlar, tahlillar oqimi, xatolar, AI xarajati.
 */
export default function SaDashboard() {
    const { t } = useTranslation()
    useDocumentTitle(t('sa_dashboard', { defaultValue: 'Boshqaruv paneli' }))
    const [days, setDays] = useState(30)
    const [data, setData] = useState(null)
    const [health, setHealth] = useState(null)
    const [loading, setLoading] = useState(true)

    const load = useCallback(async (d) => {
        setLoading(true)
        try {
            const res = await sa_overview(d)
            setData(res.data)
        } catch {
            // xabar interceptor'da
        } finally {
            setLoading(false)
        }
        get_system_status().then((r) => setHealth(r.data)).catch(() => setHealth(null))
    }, [])

    useEffect(() => { load(days) }, [days, load])

    const activate = async (id) => {
        try {
            await sa_set_clinic_active(id, true)
            load(days)
        } catch { /* interceptor */ }
    }

    if (!data) {
        return (
            <div className="sa">
                <div className="main_card">
                    <h1><span>{t('sa_dashboard', { defaultValue: 'Boshqaruv paneli' })}</span></h1>
                    <div className="main_card_content"><Skeleton active paragraph={{ rows: 10 }} /></div>
                </div>
            </div>
        )
    }

    const a = data.analyses
    const maxType = Math.max(1, ...a.byType.map((x) => x.period))
    const sp = health?.services

    const chartData = {
        labels: data.series.map((s) => {
            const d = new Date(s.date)
            return days > 90
                ? d.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })
                : d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
        }),
        datasets: ANALYSIS_TYPES.map((m) => ({
            label: typeLabel(m.key, t),
            data: data.series.map((s) => s.counts[m.key] ?? 0),
            backgroundColor: m.color,
            borderRadius: 3,
            stack: 'a',
            maxBarThickness: 26,
        })),
    }

    const sevRows = [
        { key: 'n', label: t('sa_sev_normal', { defaultValue: 'Normal' }), value: data.severity.normal, color: '#16a34a' },
        { key: 'm', label: t('sa_sev_moderate', { defaultValue: "O'rtacha" }), value: data.severity.moderate, color: '#f59e0b' },
        { key: 's', label: t('sa_sev_severe', { defaultValue: 'Jiddiy' }), value: data.severity.severe, color: '#dc2626' },
        { key: 'u', label: t('sa_sev_unknown', { defaultValue: 'Baholanmagan' }), value: data.severity.unknown, color: '#cbd5e1' },
    ]

    const roleRows = data.users.byRole.map((r) => ({
        key: r.roleId,
        label: roleName(r.roleId, t),
        value: r.count,
        color: ['#db2777', '#2563eb', '#4f46e5', '#16a34a', '#0891b2'][r.roleId - 1] ?? '#94a3b8',
    }))

    return (
        <div className="sa">
            <div className="main_card">
                <h1>
                    <span>
                        {t('sa_dashboard', { defaultValue: 'Boshqaruv paneli' })}
                        <span className="sa-head-sub">{t('sa_platform_wide', { defaultValue: 'butun platforma' })}</span>
                    </span>
                    <div className="sa-head-actions">
                        <Segmented
                            value={days}
                            onChange={setDays}
                            options={PERIODS.map((p) => ({ value: p, label: `${p} ${t('sa_days', { defaultValue: 'kun' })}` }))}
                        />
                        <Button icon={<ReloadOutlined />} onClick={() => load(days)} loading={loading} />
                    </div>
                </h1>

                <div className="main_card_content" style={{ background: 'var(--sa-bg)' }}>
                    {/* Tizim holati — bir qatorda */}
                    <div className="sa-health" style={{ marginBottom: 14 }}>
                        {[
                            ['API', sp?.api?.ok],
                            [t('sa_database', { defaultValue: 'Baza' }), sp?.database?.ok],
                            [t('sa_ai_service', { defaultValue: 'AI xizmati' }), sp?.ai?.ok],
                        ].map(([name, ok]) => (
                            <Link to="/system-status" key={name}
                                className={`sa-health-item ${ok === true ? 'sa-health-item--ok' : ok === false ? 'sa-health-item--down' : ''}`}>
                                <i />{name}
                            </Link>
                        ))}
                    </div>

                    <div className="sa-kpis sa-kpis--4">
                        <Kpi icon={<FaHospital />} to="/sa/clinics"
                            label={t('sa_clinics', { defaultValue: 'Klinikalar' })}
                            value={fmtNum(data.clinics.total)}
                            sub={<><b>{data.clinics.active}</b> {t('sa_active', { defaultValue: 'faol' })} · <b>{data.clinics.inactive}</b> {t('sa_inactive', { defaultValue: 'nofaol' })}</>} />
                        <Kpi icon={<FaUsers />} tone="blue" to="/sa/users"
                            label={t('sa_users', { defaultValue: 'Xodimlar' })}
                            value={fmtNum(data.users.total)}
                            sub={<><b>{data.users.blocked}</b> {t('sa_blocked', { defaultValue: 'bloklangan' })}</>} />
                        <Kpi icon={<FaUserInjured />} tone="violet" to="/sa/patients"
                            label={t('sa_patients', { defaultValue: 'Bemorlar' })}
                            value={fmtNum(data.patients.total)}
                            sub={<>+<b>{fmtNum(data.patients.newInPeriod)}</b> {t('sa_in_period', { defaultValue: 'davr ichida' })}</>} />
                        <Kpi icon={<FaHeartbeat />} to="/sa/analyses"
                            label={t('sa_analyses', { defaultValue: 'Tahlillar' })}
                            value={fmtNum(a.total)}
                            sub={<><b>{fmtNum(a.period)}</b> {t('sa_in_period', { defaultValue: 'davr ichida' })} · <b>{a.today}</b> {t('sa_today', { defaultValue: 'bugun' })}</>} />
                        <Kpi icon={<FaExclamationTriangle />} tone="danger" to="/sa/analyses?status=failed"
                            label={t('sa_failed', { defaultValue: 'AI xatolari' })}
                            value={fmtNum(a.failed)}
                            sub={t('sa_all_time', { defaultValue: 'jami' })} />
                        <Kpi icon={<FaHourglassHalf />} tone="warn" to="/sa/analyses?status=pending"
                            label={t('sa_pending', { defaultValue: 'Navbatda' })}
                            value={fmtNum(a.pending)}
                            sub={t('sa_pending_sub', { defaultValue: 'AI natijasini kutmoqda' })} />
                        <Kpi icon={<FaHeartBroken />} tone="danger" to="/sa/analyses?status=severe"
                            label={t('sa_severe_results', { defaultValue: 'Jiddiy natijalar' })}
                            value={fmtNum(data.severity.severe)}
                            sub={t('sa_in_period', { defaultValue: 'davr ichida' })} />
                        <Kpi icon={<FaRobot />} tone="violet" to="/sa/ai-usage"
                            label={t('sa_ai_cost', { defaultValue: 'AI xarajati' })}
                            value={data.ai?.available ? `$${Number(data.ai.costUsd).toFixed(2)}` : '—'}
                            sub={data.ai?.available
                                ? <><b>{fmtNum(data.ai.calls)}</b> {t('sa_ai_calls', { defaultValue: 'chaqiruv' })}</>
                                : t('sa_ai_no_data', { defaultValue: "ma'lumot yo'q" })} />
                    </div>

                    <div className="sa-grid sa-grid--2">
                        <section className="sa-panel">
                            <div className="sa-panel-head">
                                <h3>{t('sa_daily_flow', { defaultValue: 'Kunlik tahlillar oqimi' })}</h3>
                                <span className="sa-muted">{fmtDate(data.from)} — {fmtDate(new Date())}</span>
                            </div>
                            <div className="sa-chart">
                                <Bar
                                    data={chartData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        interaction: { mode: 'index', intersect: false },
                                        plugins: {
                                            legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, padding: 12 } },
                                        },
                                        scales: {
                                            x: { stacked: true, grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
                                            y: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#eef2f7' } },
                                        },
                                    }}
                                />
                            </div>
                        </section>

                        <section className="sa-panel">
                            <div className="sa-panel-head">
                                <h3>{t('sa_by_type', { defaultValue: 'Turlar bo\'yicha (davr)' })}</h3>
                            </div>
                            <div className="sa-type-rows">
                                {a.byType.map((x) => {
                                    const m = ANALYSIS_TYPES.find((tt) => tt.key === x.type)
                                    return (
                                        <React.Fragment key={x.type}>
                                            <div className="sa-type-row">
                                                <span className="sa-type-name"><i style={{ background: m.color }} />{typeLabel(x.type, t)}</span>
                                                <span className="sa-type-bar"><span style={{ width: `${(x.period / maxType) * 100}%`, background: m.color }} /></span>
                                                <span className="sa-type-val">{fmtNum(x.period)}</span>
                                            </div>
                                            <div className="sa-type-meta">
                                                {t('sa_all_time', { defaultValue: 'jami' })} {fmtNum(x.total)}
                                                {x.failed ? <> · <span className="sa-danger">{x.failed} {t('sa_status_failed', { defaultValue: 'xato' }).toLowerCase()}</span></> : null}
                                                {x.severe ? <> · {x.severe} {t('sa_sev_severe', { defaultValue: 'jiddiy' }).toLowerCase()}</> : null}
                                            </div>
                                        </React.Fragment>
                                    )
                                })}
                            </div>
                        </section>
                    </div>

                    <div className="sa-grid sa-grid--halves">
                        <section className="sa-panel">
                            <div className="sa-panel-head"><h3>{t('sa_severity', { defaultValue: 'AI jiddiylik darajasi (davr)' })}</h3></div>
                            <Ring rows={sevRows} layout="split" size={170}
                                totalLabel={t('sa_ready_results', { defaultValue: 'tayyor natija' })}
                                empty={t('sa_no_data', { defaultValue: "Ma'lumot yo'q" })} />
                        </section>
                        <section className="sa-panel">
                            <div className="sa-panel-head">
                                <h3>{t('sa_users_by_role', { defaultValue: 'Xodimlar rollar bo\'yicha' })}</h3>
                                <Link to="/sa/users">{t('sa_all', { defaultValue: 'Barchasi' })} →</Link>
                            </div>
                            <Ring rows={roleRows} layout="split" size={170}
                                totalLabel={t('sa_users', { defaultValue: 'xodim' }).toLowerCase()}
                                empty={t('sa_no_data', { defaultValue: "Ma'lumot yo'q" })} />
                        </section>
                    </div>

                    <div className="sa-grid sa-grid--3">
                        <section className="sa-panel">
                            <div className="sa-panel-head">
                                <h3>{t('sa_top_clinics', { defaultValue: 'Eng faol klinikalar' })}</h3>
                                <Link to="/sa/clinics">{t('sa_all', { defaultValue: 'Barchasi' })} →</Link>
                            </div>
                            {data.topClinics.length === 0 ? <div className="sa-empty">{t('sa_no_data', { defaultValue: "Ma'lumot yo'q" })}</div> : (
                                <ul className="sa-list">
                                    {data.topClinics.map((c) => (
                                        <li key={c.id}>
                                            <div className="sa-list-main">
                                                <Link to={`/sa/clinics/${c.id}`} className="sa-list-title">{c.name}</Link>
                                                <div className="sa-list-sub">
                                                    {fmtNum(c.patients)} {t('sa_patients', { defaultValue: 'bemor' }).toLowerCase()}
                                                    {c.failed ? <> · <span className="sa-danger">{c.failed} {t('sa_status_failed', { defaultValue: 'xato' }).toLowerCase()}</span></> : null}
                                                </div>
                                            </div>
                                            <b className="sa-num">{fmtNum(c.period)}</b>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        <section className="sa-panel">
                            <div className="sa-panel-head">
                                <h3>{t('sa_new_clinics', { defaultValue: 'Yangi klinikalar' })}</h3>
                                <span className="sa-muted">+{data.clinics.newInPeriod}</span>
                            </div>
                            {data.recentClinics.length === 0 ? <div className="sa-empty">{t('sa_no_data', { defaultValue: "Ma'lumot yo'q" })}</div> : (
                                <ul className="sa-list">
                                    {data.recentClinics.map((c) => (
                                        <li key={c.id}>
                                            <div className="sa-list-main">
                                                <Link to={`/sa/clinics/${c.id}`} className="sa-list-title">{c.clinicName || `#${c.id}`}</Link>
                                                <div className="sa-list-sub">{fmtDate(c.createdAt)}{c.adminPhone ? ` · +${c.adminPhone}` : ''}</div>
                                            </div>
                                            {c.isActive
                                                ? <Tag color="success">{t('sa_active', { defaultValue: 'faol' })}</Tag>
                                                : (
                                                    <Popconfirm title={t('sa_activate_confirm', { defaultValue: 'Klinikani faollashtirasizmi?' })} onConfirm={() => activate(c.id)}>
                                                        <Button size="small" type="primary">{t('sa_activate', { defaultValue: 'Faollashtirish' })}</Button>
                                                    </Popconfirm>
                                                )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        <section className="sa-panel">
                            <div className="sa-panel-head">
                                <h3>{t('sa_recent_failed', { defaultValue: 'Oxirgi AI xatolari' })}</h3>
                                <Link to="/sa/analyses?status=failed">{t('sa_all', { defaultValue: 'Barchasi' })} →</Link>
                            </div>
                            {data.recentFailed.length === 0 ? <div className="sa-empty">{t('sa_no_failed', { defaultValue: "Xato yo'q" })}</div> : (
                                <ul className="sa-list">
                                    {data.recentFailed.map((r) => (
                                        <li key={`${r.type}-${r.id}`}>
                                            <div className="sa-list-main">
                                                <Link to={`/sa/analyses?open=${r.type}-${r.id}`} className="sa-list-title">{r.patient || `#${r.id}`}</Link>
                                                <div className="sa-list-sub">{r.clinic || '—'} · {fmtDateTime(r.createdAt)}</div>
                                            </div>
                                            <TypeTag type={r.type} t={t} />
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </div>
                </div>
            </div>
        </div>
    )
}
