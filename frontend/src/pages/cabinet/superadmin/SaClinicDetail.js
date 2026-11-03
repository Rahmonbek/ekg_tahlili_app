import React, { useCallback, useEffect, useState } from 'react'
import { Button, Popconfirm, Skeleton, Switch, Tag } from 'antd'
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { sa_clinic, sa_set_clinic_active } from '../../../host/requests/SuperAdminRequest'
import { buildFileUrl } from '../../../host/Host'
import useDocumentTitle from '../../../tools/useDocumentTitle'
import ClinicFormModal from './ClinicFormModal'
import SaUsers from './SaUsers'
import { ANALYSIS_TYPES, fmtDate, fmtDateTime, fmtNum, fmtPhone, typeLabel } from './saCommon'
import './SuperAdmin.css'

/** Bitta klinika (SA-15): rekvizitlar, tahlil statistikasi, xodimlar boshqaruvi. */
export default function SaClinicDetail() {
    const { t } = useTranslation()
    const { id } = useParams()
    const navigate = useNavigate()
    const [data, setData] = useState(null)
    const [editing, setEditing] = useState(false)
    useDocumentTitle(data?.clinicName)

    const load = useCallback(async () => {
        try {
            const res = await sa_clinic(id)
            setData(res.data)
        } catch {
            setData(false)
        }
    }, [id])

    useEffect(() => { load() }, [load])

    const toggle = async () => {
        try {
            await sa_set_clinic_active(data.id, !data.isActive)
            setData((d) => ({ ...d, isActive: !d.isActive }))
        } catch { /* interceptor */ }
    }

    if (data === false) {
        return (
            <div className="sa"><div className="main_card"><div className="main_card_content">
                <div className="sa-empty">{t('sa_not_found', { defaultValue: 'Topilmadi' })}</div>
                <Button onClick={() => navigate('/sa/clinics')}>{t('back', { defaultValue: 'Orqaga' })}</Button>
            </div></div></div>
        )
    }
    if (!data) {
        return <div className="sa"><div className="main_card"><div className="main_card_content"><Skeleton active paragraph={{ rows: 8 }} /></div></div></div>
    }

    const d = data.detail ?? {}
    const info = [
        ['INN', d.inn],
        [t('address', { defaultValue: 'Manzil' }), d.address],
        [t('district', { defaultValue: 'Tuman' }), d.district],
        [t('sa_clinic_phones', { defaultValue: 'Telefonlar' }), data.phones?.length ? data.phones.map(fmtPhone).join(', ') : null],
        [t('license', { defaultValue: 'Litsenziya' }), d.license],
        [t('bank_name', { defaultValue: 'Bank' }), d.bankName],
        [t('bank_account', { defaultValue: 'Hisob raqami' }), d.bankAccount],
        ['MFO', d.mfo],
        [t('sa_created', { defaultValue: 'Yaratilgan' }), fmtDate(data.createdAt)],
    ]
    const totalAnalyses = data.analyses.reduce((s, x) => s + x.total, 0)

    return (
        <div className="sa">
            <div className="main_card">
                <h1>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/sa/clinics')} />
                        {data.clinicLogo ? <img src={buildFileUrl(data.clinicLogo)} alt="" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 6 }} /> : null}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.clinicName}</span>
                        {data.isActive ? <Tag color="success">{t('sa_active', { defaultValue: 'Faol' })}</Tag> : <Tag color="default">{t('sa_inactive', { defaultValue: 'Nofaol' })}</Tag>}
                    </span>
                    <div className="sa-head-actions">
                        <Popconfirm
                            title={data.isActive ? t('sa_deactivate_confirm', { defaultValue: 'Klinika xodimlari tahlil qila olmay qoladi. Davom etasizmi?' })
                                : t('sa_activate_confirm', { defaultValue: 'Klinikani faollashtirasizmi?' })}
                            onConfirm={toggle}
                        >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                                <Switch checked={data.isActive} size="small" /> {t('sa_active_status', { defaultValue: 'Faol' })}
                            </span>
                        </Popconfirm>
                        <Button icon={<EditOutlined />} onClick={() => setEditing(true)}>{t('edit', { defaultValue: 'Tahrirlash' })}</Button>
                    </div>
                </h1>

                <div className="main_card_content" style={{ background: 'var(--sa-bg)' }}>
                    <div className="sa-kpis sa-kpis--4">
                        <div className="sa-kpi"><div className="sa-kpi-body">
                            <div className="sa-kpi-label">{t('sa_analyses', { defaultValue: 'Tahlillar' })}</div>
                            <div className="sa-kpi-value">{fmtNum(totalAnalyses)}</div>
                        </div></div>
                        <div className="sa-kpi"><div className="sa-kpi-body">
                            <div className="sa-kpi-label">{t('sa_patients', { defaultValue: 'Bemorlar' })}</div>
                            <div className="sa-kpi-value">{fmtNum(data.patientsCount)}</div>
                        </div></div>
                        <div className="sa-kpi"><div className="sa-kpi-body">
                            <div className="sa-kpi-label">{t('sa_users', { defaultValue: 'Xodimlar' })}</div>
                            <div className="sa-kpi-value">{fmtNum(data.users.length)}</div>
                        </div></div>
                        <div className="sa-kpi sa-kpi--danger"><div className="sa-kpi-body">
                            <div className="sa-kpi-label">{t('sa_failed', { defaultValue: 'AI xatolari' })}</div>
                            <div className="sa-kpi-value">{fmtNum(data.analyses.reduce((s, x) => s + x.failed, 0))}</div>
                        </div></div>
                    </div>

                    <div className="sa-grid sa-grid--2">
                        <section className="sa-panel">
                            <div className="sa-panel-head"><h3>{t('sa_requisites', { defaultValue: 'Rekvizitlar' })}</h3></div>
                            <div className="sa-info-grid">
                                {info.map(([label, value]) => (
                                    <div className="sa-info-item" key={label}>
                                        <label>{label}</label>
                                        <div>{value || <span className="sa-muted">—</span>}</div>
                                    </div>
                                ))}
                            </div>
                        </section>
                        <section className="sa-panel">
                            <div className="sa-panel-head">
                                <h3>{t('sa_by_type_all', { defaultValue: 'Tahlillar turlari' })}</h3>
                                <Link to={`/sa/analyses?clinicId=${data.id}`}>{t('sa_all', { defaultValue: 'Barchasi' })} →</Link>
                            </div>
                            <ul className="sa-list">
                                {data.analyses.map((x) => {
                                    const m = ANALYSIS_TYPES.find((tt) => tt.key === x.type)
                                    return (
                                        <li key={x.type}>
                                            <div className="sa-list-main">
                                                <div className="sa-type-name"><i style={{ background: m.color }} />{typeLabel(x.type, t)}</div>
                                                <div className="sa-list-sub">
                                                    {x.lastAt ? `${t('sa_last', { defaultValue: 'oxirgisi' })}: ${fmtDateTime(x.lastAt)}` : '—'}
                                                    {x.failed ? <> · <span className="sa-danger">{x.failed} {t('sa_status_failed', { defaultValue: 'xato' }).toLowerCase()}</span></> : null}
                                                    {x.pending ? <> · {x.pending} {t('sa_status_pending', { defaultValue: 'kutmoqda' }).toLowerCase()}</> : null}
                                                </div>
                                            </div>
                                            <b className="sa-num">{fmtNum(x.total)}</b>
                                        </li>
                                    )
                                })}
                            </ul>
                        </section>
                    </div>

                    <section className="sa-panel">
                        <SaUsers fixedClinicId={data.id} embedded onChanged={load} />
                    </section>
                </div>
            </div>

            <ClinicFormModal
                open={editing}
                clinic={data}
                onClose={() => setEditing(false)}
                onSaved={() => { setEditing(false); load() }}
            />
        </div>
    )
}
