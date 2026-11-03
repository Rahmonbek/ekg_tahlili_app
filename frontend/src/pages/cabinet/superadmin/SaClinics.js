import React, { useCallback, useEffect, useState } from 'react'
import { Button, Input, Popconfirm, Select, Switch, Table, Tooltip } from 'antd'
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { sa_clinic, sa_clinics, sa_delete_clinic, sa_set_clinic_active } from '../../../host/requests/SuperAdminRequest'
import useDocumentTitle from '../../../tools/useDocumentTitle'
import ClinicFormModal from './ClinicFormModal'
import { fmtDate, fmtNum } from './saCommon'
import './SuperAdmin.css'

const PAGE_SIZE = 20

/** Klinikalar ro'yxati (SA-15): qidiruv, faollik, yaratish, tahrirlash, o'chirish. */
export default function SaClinics() {
    const { t } = useTranslation()
    useDocumentTitle(t('sa_clinics', { defaultValue: 'Klinikalar' }))
    const navigate = useNavigate()
    const [rows, setRows] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [active, setActive] = useState(null)
    const [modal, setModal] = useState({ open: false, clinic: null })

    const load = useCallback(async (p = page) => {
        setLoading(true)
        try {
            const params = { page: p, pageSize: PAGE_SIZE }
            if (search.trim()) params.search = search.trim()
            if (active != null) params.active = active
            const res = await sa_clinics(params)
            setRows(res.data?.data ?? [])
            setTotal(res.data?.totalCount ?? 0)
        } catch { /* interceptor */ } finally {
            setLoading(false)
        }
    }, [page, search, active])

    useEffect(() => { load(page) }, [page, active]) // eslint-disable-line react-hooks/exhaustive-deps

    const toggle = async (row, value) => {
        try {
            await sa_set_clinic_active(row.id, value)
            setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, isActive: value } : r)))
        } catch { /* interceptor */ }
    }

    const edit = async (row) => {
        try {
            const res = await sa_clinic(row.id)
            setModal({ open: true, clinic: res.data })
        } catch { /* interceptor */ }
    }

    const remove = async (row) => {
        try {
            await sa_delete_clinic(row.id)
            load(page)
        } catch { /* interceptor: 409 sababi bilan */ }
    }

    const columns = [
        { title: '#', dataIndex: 'id', width: 64, className: 'sa-num' },
        {
            title: t('sa_clinic_name', { defaultValue: 'Klinika nomi' }),
            key: 'name',
            render: (_, r) => (
                <div>
                    <div className="sa-cell-main">{r.clinicName || '—'}</div>
                    <div className="sa-cell-sub">{r.address || ''}</div>
                </div>
            ),
        },
        { title: 'INN', dataIndex: 'inn', width: 120, render: (v) => v || '—' },
        {
            title: t('sa_admin_phone', { defaultValue: 'Admin telefoni' }),
            dataIndex: 'adminPhone', width: 150,
            render: (v) => (v ? `+${v}` : <span className="sa-muted">—</span>),
        },
        { title: t('sa_users', { defaultValue: 'Xodimlar' }), dataIndex: 'usersCount', width: 96, align: 'right', render: fmtNum },
        { title: t('sa_analyses', { defaultValue: 'Tahlillar' }), dataIndex: 'analysesCount', width: 96, align: 'right', render: fmtNum },
        { title: t('sa_created', { defaultValue: 'Yaratilgan' }), dataIndex: 'createdAt', width: 112, render: fmtDate },
        {
            title: t('sa_active_status', { defaultValue: 'Faol' }),
            dataIndex: 'isActive', width: 80, align: 'center',
            // Popconfirm portal'i ham React daraxti bo'ylab qatorga "ko'tariladi" —
            // o'rab olingan span bosishni qator ochilishiga yetkazmaydi
            render: (v, r) => (
                <span onClick={(e) => e.stopPropagation()}>
                    <Popconfirm
                        title={v ? t('sa_deactivate_confirm', { defaultValue: 'Klinika xodimlari tahlil qila olmay qoladi. Davom etasizmi?' })
                            : t('sa_activate_confirm', { defaultValue: 'Klinikani faollashtirasizmi?' })}
                        onConfirm={() => toggle(r, !v)}
                    >
                        <Switch checked={v} size="small" />
                    </Popconfirm>
                </span>
            ),
        },
        {
            title: '', key: 'actions', width: 120, fixed: 'right',
            render: (_, r) => (
                <div className="sa-actions" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title={t('view', { defaultValue: "Ko'rish" })}>
                        <Button type="text" icon={<EyeOutlined />} onClick={() => navigate(`/sa/clinics/${r.id}`)} />
                    </Tooltip>
                    <Tooltip title={t('edit', { defaultValue: 'Tahrirlash' })}>
                        <Button type="text" icon={<EditOutlined />} onClick={() => edit(r)} />
                    </Tooltip>
                    <Popconfirm
                        title={t('sa_delete_clinic_confirm', { defaultValue: "Klinika va uning xodimlari o'chiriladi. Tahlillari bo'lsa o'chirilmaydi." })}
                        okButtonProps={{ danger: true }}
                        onConfirm={() => remove(r)}
                    >
                        <Tooltip title={t('delete', { defaultValue: "O'chirish" })}>
                            <Button type="text" danger icon={<DeleteOutlined />} />
                        </Tooltip>
                    </Popconfirm>
                </div>
            ),
        },
    ]

    return (
        <div className="sa">
            <div className="main_card">
                <h1>
                    <span>{t('sa_clinics', { defaultValue: 'Klinikalar' })}<span className="sa-head-sub">{fmtNum(total)}</span></span>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal({ open: true, clinic: null })}>
                        {t('sa_new_clinic', { defaultValue: 'Yangi klinika' })}
                    </Button>
                </h1>
                <div className="main_card_content">
                    <div className="sa-filters">
                        <div className="sa-filter">
                            <label>{t('search', { defaultValue: 'Qidiruv' })}</label>
                            <Input.Search
                                allowClear
                                placeholder={t('sa_clinic_search_ph', { defaultValue: 'Nomi yoki INN' })}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onSearch={() => { setPage(1); load(1) }}
                            />
                        </div>
                        <div className="sa-filter">
                            <label>{t('sa_active_status', { defaultValue: 'Holati' })}</label>
                            <Select
                                allowClear
                                placeholder={t('sa_all', { defaultValue: 'Barchasi' })}
                                value={active}
                                onChange={(v) => { setPage(1); setActive(v ?? null) }}
                                options={[
                                    { value: true, label: t('sa_active', { defaultValue: 'Faol' }) },
                                    { value: false, label: t('sa_inactive', { defaultValue: 'Nofaol' }) },
                                ]}
                            />
                        </div>
                    </div>

                    <Table
                        rowKey="id"
                        size="middle"
                        loading={loading}
                        columns={columns}
                        dataSource={rows}
                        scroll={{ x: 1000 }}
                        rowClassName={() => 'sa-row-click'}
                        onRow={(r) => ({ onClick: () => navigate(`/sa/clinics/${r.id}`) })}
                        pagination={{ current: page, pageSize: PAGE_SIZE, total, onChange: setPage, showSizeChanger: false }}
                    />
                </div>
            </div>

            <ClinicFormModal
                open={modal.open}
                clinic={modal.clinic}
                onClose={() => setModal({ open: false, clinic: null })}
                onSaved={() => { setModal({ open: false, clinic: null }); load(page) }}
            />
        </div>
    )
}
