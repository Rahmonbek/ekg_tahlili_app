import React, { useCallback, useEffect, useState } from 'react'
import { Button, Dropdown, Input, Modal, Popconfirm, Select, Switch, Table, Tooltip } from 'antd'
import { DeleteOutlined, EditOutlined, KeyOutlined, LoginOutlined, MoreOutlined, PlusOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { sa_delete_user, sa_impersonate, sa_set_user_status, sa_users } from '../../../host/requests/SuperAdminRequest'
import { useStore } from '../../../store/Store'
import { ROLE } from '../../../tools/roles'
import useDocumentTitle from '../../../tools/useDocumentTitle'
import UserFormModal, { PasswordModal } from './UserFormModal'
import { fmtDate, fmtNum, fmtPhone, personFullName, RoleTag, roleOptions, startImpersonation, useClinicOptions } from './saCommon'
import './SuperAdmin.css'

const PAGE_SIZE = 20

/**
 * Xodimlar (SA-16): butun platformadagi foydalanuvchilar. Klinika
 * tafsilotida `fixedClinicId` bilan ichki jadval sifatida ham ishlatiladi
 * (`onChanged` — xodim qo'shilgan/o'chirilganda ota sahifa sonlarini yangilaydi).
 */
export default function SaUsers({ fixedClinicId, embedded = false, onChanged }) {
    const { t } = useTranslation()
    useDocumentTitle(embedded ? null : t('sa_users', { defaultValue: 'Xodimlar' }))
    const { user: me } = useStore()
    const clinics = useClinicOptions()
    const [rows, setRows] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [roleId, setRoleId] = useState(null)
    const [clinicId, setClinicId] = useState(fixedClinicId ?? null)
    const [status, setStatus] = useState(null)
    const [form, setForm] = useState({ open: false, user: null })
    const [pwd, setPwd] = useState(null)
    const [confirmDelete, setConfirmDelete] = useState(null)

    const load = useCallback(async (p = page) => {
        setLoading(true)
        try {
            const params = { page: p, pageSize: PAGE_SIZE }
            if (search.trim()) params.search = search.trim()
            if (roleId) params.roleId = roleId
            if (clinicId) params.clinicId = clinicId
            if (status != null) params.status = status
            const res = await sa_users(params)
            setRows(res.data?.data ?? [])
            setTotal(res.data?.totalCount ?? 0)
        } catch { /* interceptor */ } finally {
            setLoading(false)
        }
    }, [page, search, roleId, clinicId, status])

    useEffect(() => { load(page) }, [page, roleId, clinicId, status]) // eslint-disable-line react-hooks/exhaustive-deps

    const toggle = async (r, v) => {
        try {
            await sa_set_user_status(r.id, v)
            setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, status: v } : x)))
        } catch { /* interceptor */ }
    }

    const remove = async (r) => {
        try { await sa_delete_user(r.id); load(page); onChanged?.() } catch { /* interceptor */ }
    }

    const impersonate = async (r) => {
        try {
            const res = await sa_impersonate(r.id)
            if (res.data?.token) startImpersonation(res.data.token)
        } catch { /* interceptor */ }
    }

    const isMe = (r) => r.id === me?.id

    const columns = [
        {
            title: t('sa_full_name', { defaultValue: 'F.I.Sh.' }), key: 'name',
            render: (_, r) => (
                <div>
                    <div className="sa-cell-main">{personFullName(r)}{isMe(r) ? <span className="sa-muted"> ({t('sa_you', { defaultValue: 'siz' })})</span> : null}</div>
                    <div className="sa-cell-sub">{fmtPhone(r.phone)}</div>
                </div>
            ),
        },
        { title: t('sa_role', { defaultValue: 'Rol' }), dataIndex: 'roleId', width: 130, render: (v) => <RoleTag roleId={v} t={t} /> },
        ...(fixedClinicId ? [] : [{
            title: t('sa_clinic', { defaultValue: 'Klinika' }), dataIndex: 'clinicName', ellipsis: true,
            render: (v, r) => (r.clinicId ? <Link to={`/sa/clinics/${r.clinicId}`}>{v || `#${r.clinicId}`}</Link> : <span className="sa-muted">—</span>),
        }]),
        { title: t('sa_analyses', { defaultValue: 'Tahlillar' }), dataIndex: 'analysesCount', width: 90, align: 'right', render: fmtNum },
        { title: t('sa_created', { defaultValue: 'Yaratilgan' }), dataIndex: 'createdAt', width: 110, render: fmtDate },
        {
            title: t('sa_account_active', { defaultValue: 'Faol' }), dataIndex: 'status', width: 70, align: 'center',
            render: (v, r) => (
                <span onClick={(e) => e.stopPropagation()}>
                    <Popconfirm
                        title={v ? t('sa_block_confirm', { defaultValue: 'Xodim tizimga kira olmay qoladi. Bloklaysizmi?' })
                            : t('sa_unblock_confirm', { defaultValue: 'Xodim hisobini ochasizmi?' })}
                        onConfirm={() => toggle(r, !v)}
                        disabled={isMe(r)}
                    >
                        <Switch checked={v} size="small" disabled={isMe(r)} />
                    </Popconfirm>
                </span>
            ),
        },
        {
            title: '', key: 'actions', width: 100, fixed: 'right',
            render: (_, r) => (
                <div className="sa-actions">
                    <Tooltip title={t('edit', { defaultValue: 'Tahrirlash' })}>
                        <Button type="text" icon={<EditOutlined />} onClick={() => setForm({ open: true, user: r })} />
                    </Tooltip>
                    <Dropdown
                        trigger={['click']}
                        menu={{
                            items: [
                                { key: 'pwd', icon: <KeyOutlined />, label: t('sa_set_password', { defaultValue: "Parolni o'rnatish" }) },
                                {
                                    key: 'imp', icon: <LoginOutlined />,
                                    label: t('sa_impersonate', { defaultValue: 'Xodim sifatida kirish' }),
                                    disabled: r.roleId === ROLE.SUPER_ADMIN || !r.status,
                                },
                                { type: 'divider' },
                                { key: 'del', icon: <DeleteOutlined />, danger: true, disabled: isMe(r), label: t('delete', { defaultValue: "O'chirish" }) },
                            ],
                            onClick: ({ key }) => {
                                if (key === 'pwd') setPwd(r)
                                if (key === 'imp') impersonate(r)
                                if (key === 'del') setConfirmDelete(r)
                            },
                        }}
                    >
                        <Button type="text" icon={<MoreOutlined />} />
                    </Dropdown>
                </div>
            ),
        },
    ]

    const table = (
        <>
            <div className="sa-filters">
                <div className="sa-filter">
                    <label>{t('search', { defaultValue: 'Qidiruv' })}</label>
                    <Input.Search
                        allowClear
                        placeholder={t('sa_user_search_ph', { defaultValue: 'Ism, familiya yoki telefon' })}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onSearch={() => { setPage(1); load(1) }}
                    />
                </div>
                <div className="sa-filter">
                    <label>{t('sa_role', { defaultValue: 'Rol' })}</label>
                    <Select allowClear placeholder={t('sa_all', { defaultValue: 'Barchasi' })} value={roleId}
                        onChange={(v) => { setPage(1); setRoleId(v ?? null) }} options={roleOptions(t)} />
                </div>
                {!fixedClinicId && (
                    <div className="sa-filter">
                        <label>{t('sa_clinic', { defaultValue: 'Klinika' })}</label>
                        <Select allowClear showSearch optionFilterProp="label" placeholder={t('sa_all', { defaultValue: 'Barchasi' })}
                            value={clinicId} onChange={(v) => { setPage(1); setClinicId(v ?? null) }} options={clinics} />
                    </div>
                )}
                <div className="sa-filter">
                    <label>{t('sa_account_status', { defaultValue: 'Hisob holati' })}</label>
                    <Select allowClear placeholder={t('sa_all', { defaultValue: 'Barchasi' })} value={status}
                        onChange={(v) => { setPage(1); setStatus(v ?? null) }}
                        options={[
                            { value: true, label: t('sa_active', { defaultValue: 'Faol' }) },
                            { value: false, label: t('sa_blocked', { defaultValue: 'Bloklangan' }) },
                        ]} />
                </div>
            </div>
            <Table
                rowKey="id"
                size="middle"
                loading={loading}
                columns={columns}
                dataSource={rows}
                scroll={{ x: 900 }}
                pagination={{ current: page, pageSize: PAGE_SIZE, total, onChange: setPage, showSizeChanger: false }}
            />

            <UserFormModal
                open={form.open}
                user={form.user}
                defaultClinicId={fixedClinicId}
                onClose={() => setForm({ open: false, user: null })}
                onSaved={() => { setForm({ open: false, user: null }); load(page); onChanged?.() }}
            />
            <PasswordModal open={!!pwd} user={pwd} onClose={() => setPwd(null)} onSaved={() => setPwd(null)} />
            <DeleteConfirm user={confirmDelete} t={t}
                onCancel={() => setConfirmDelete(null)}
                onConfirm={() => { const u = confirmDelete; setConfirmDelete(null); remove(u) }} />
        </>
    )

    const addBtn = (
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setForm({ open: true, user: null })}>
            {t('sa_new_user', { defaultValue: 'Yangi xodim' })}
        </Button>
    )

    if (embedded) {
        return (
            <div>
                <div className="sa-panel-head">
                    <h3>{t('sa_users', { defaultValue: 'Xodimlar' })} <span className="sa-muted">{fmtNum(total)}</span></h3>
                    {addBtn}
                </div>
                {table}
            </div>
        )
    }

    return (
        <div className="sa">
            <div className="main_card">
                <h1>
                    <span>{t('sa_users', { defaultValue: 'Xodimlar' })}<span className="sa-head-sub">{fmtNum(total)}</span></span>
                    {addBtn}
                </h1>
                <div className="main_card_content">{table}</div>
            </div>
        </div>
    )
}

/** Dropdown ichida Popconfirm ishlamaydi (menyu yopiladi) — alohida tasdiq oynasi. */
function DeleteConfirm({ user, t, onCancel, onConfirm }) {
    return (
        <Modal
            open={!!user}
            title={t('sa_delete_user_title', { defaultValue: "Xodimni o'chirish" })}
            onCancel={onCancel}
            onOk={onConfirm}
            okButtonProps={{ danger: true }}
            okText={t('delete', { defaultValue: "O'chirish" })}
            cancelText={t('cancel', { defaultValue: 'Bekor qilish' })}
        >
            {personFullName(user ?? {})} · {fmtPhone(user?.phone)}
            <p className="sa-muted" style={{ marginTop: 8 }}>
                {t('sa_delete_user_hint', { defaultValue: "Xodim yuklagan tahlillar bo'lsa o'chirilmaydi — bunday holatda hisobni bloklang." })}
            </p>
        </Modal>
    )
}
