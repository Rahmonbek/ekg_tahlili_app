import React, { useEffect, useState } from 'react'
import { Tag } from 'antd'
import { getTokenAccess, setTokenAccess } from '../../../host/Host'
import { sa_clinics } from '../../../host/requests/SuperAdminRequest'
import { ROLE, roleName } from '../../../tools/roles'

// SuperAdmin kabineti uchun umumiy konstantalar va kichik komponentlar.

/** Tahlil turlari: nom kaliti (mavjud i18n), rang. */
export const ANALYSIS_TYPES = [
    { key: 'ecg', labelKey: 'nav_ecg', fallback: 'EKG', color: '#E5484D' },
    { key: 'holter', labelKey: 'nav_holter', fallback: 'Holter', color: '#8B5CF6' },
    { key: 'smad', labelKey: 'nav_smad', fallback: 'SMAD', color: '#3B82F6' },
    { key: 'lab', labelKey: 'nav_lab', fallback: 'Laboratoriya', color: '#14A38B' },
    { key: 'combined', labelKey: 'nav_combined', fallback: 'Kompleks AI', color: '#F5A524' },
    { key: 'parasitology', labelKey: 'sa_type_parasitology', fallback: 'Parazitologiya', color: '#64748B' },
]

export const typeMeta = (key) => ANALYSIS_TYPES.find((x) => x.key === key) ?? ANALYSIS_TYPES[0]
export const typeLabel = (key, t) => {
    const m = typeMeta(key)
    return t(m.labelKey, { defaultValue: m.fallback })
}

export function TypeTag({ type, t }) {
    const m = typeMeta(type)
    return <Tag color={m.color} style={{ marginInlineEnd: 0 }}>{typeLabel(type, t)}</Tag>
}

/** Tahlil holati (umumiy kodlar: 0/1 kutmoqda, 2 tayyor, -1 xato). */
export function StatusTag({ status, t }) {
    const s = typeof status === 'string'
        ? ({ pending: 0, analyzed: 2, not_analyzed: 2, failed: -1 }[status] ?? null)
        : status
    if (s === 2) return <Tag color="success">{t('sa_status_ready', { defaultValue: 'Tayyor' })}</Tag>
    if (s === -1) return <Tag color="error">{t('sa_status_failed', { defaultValue: 'Xato' })}</Tag>
    if (s === 0 || s === 1) return <Tag color="processing">{t('sa_status_pending', { defaultValue: 'Kutmoqda' })}</Tag>
    return <Tag>—</Tag>
}

/** AI jiddiyligi: 1 normal, 2 o'rtacha, 3 jiddiy. */
export function SeverityTag({ value, t }) {
    const v = value == null ? null : String(value)
    if (v === '1') return <Tag color="green">{t('sa_sev_normal', { defaultValue: 'Normal' })}</Tag>
    if (v === '2') return <Tag color="orange">{t('sa_sev_moderate', { defaultValue: "O'rtacha" })}</Tag>
    if (v === '3') return <Tag color="red">{t('sa_sev_severe', { defaultValue: 'Jiddiy' })}</Tag>
    return <span className="sa-muted">—</span>
}

export const ROLE_COLORS = {
    [ROLE.SUPER_ADMIN]: 'magenta',
    [ROLE.ADMIN]: 'blue',
    [ROLE.DIRECTOR]: 'geekblue',
    [ROLE.DOCTOR]: 'green',
    [ROLE.NURSE]: 'cyan',
}

export const roleOptions = (t) => Object.values(ROLE).map((id) => ({ value: id, label: roleName(id, t) }))

export function RoleTag({ roleId, t }) {
    return <Tag color={ROLE_COLORS[roleId]}>{roleName(roleId, t)}</Tag>
}

export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
}) : '—')
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('ru-RU') : '—')
export const fmtNum = (n) => (n == null ? '—' : Number(n).toLocaleString('ru-RU'))
export const fmtPhone = (p) => {
    const s = String(p ?? '').replace(/\D/g, '')
    if (s.length !== 12) return p || '—'
    return `+${s.slice(0, 3)} ${s.slice(3, 5)} ${s.slice(5, 8)}-${s.slice(8, 10)}-${s.slice(10)}`
}
export const personFullName = (r) =>
    [r?.lastName, r?.firstName, r?.sureName].filter((x) => x && String(x).trim()).join(' ') || '—'

/** Klinikalar ro'yxati (filtr va formadagi tanlov uchun). */
export function useClinicOptions() {
    const [options, setOptions] = useState([])
    useEffect(() => {
        let alive = true
        sa_clinics({ page: 1, pageSize: 100 })
            .then((res) => {
                if (!alive) return
                setOptions((res.data?.data ?? []).map((c) => ({
                    value: c.id,
                    label: c.clinicName || `#${c.id}`,
                })))
            })
            .catch(() => { /* toast interceptor'da */ })
        return () => { alive = false }
    }, [])
    return options
}

// ── Xodim sifatida kirish (SA-07) ──────────────────────────────────────────
// SuperAdmin tokeni shu yorliq sessiyasida saqlanadi: "Qaytish" bosilganda
// tiklanadi. Yorliq yopilsa — qayta login (xavfsizroq).
const RETURN_KEY = 'NMED_sa_return'

export function startImpersonation(token) {
    try { sessionStorage.setItem(RETURN_KEY, getTokenAccess() ?? '') } catch { /* private rejim */ }
    setTokenAccess(token)
    window.location.href = '/'
}

export function isImpersonating() {
    try { return !!sessionStorage.getItem(RETURN_KEY) } catch { return false }
}

export function clearImpersonation() {
    try { sessionStorage.removeItem(RETURN_KEY) } catch { /* private rejim */ }
}

export function stopImpersonation() {
    let token = null
    try {
        token = sessionStorage.getItem(RETURN_KEY)
        sessionStorage.removeItem(RETURN_KEY)
    } catch { /* private rejim */ }
    if (token) setTokenAccess(token)
    window.location.href = token ? '/sa/users' : '/login'
}
