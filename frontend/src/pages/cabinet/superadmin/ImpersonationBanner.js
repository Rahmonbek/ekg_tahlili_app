import React from 'react'
import { Button } from 'antd'
import { RollbackOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../../store/Store'
import { isImpersonating, stopImpersonation } from './saCommon'
import './SuperAdmin.css'

/**
 * SuperAdmin "xodim sifatida kirish" rejimida har sahifa tepasida turadi —
 * kim nomidan ishlayotgani doim ko'rinsin va bir bosishda qaytilsin (SA-07).
 */
export default function ImpersonationBanner() {
    const { t } = useTranslation()
    const { user } = useStore()
    if (!isImpersonating() || user?.roleId === 1) return null

    const name = [user?.doctor?.lastName, user?.doctor?.firstName].filter(Boolean).join(' ')
    return (
        <div className="sa-impersonation" role="status">
            <span>
                {t('sa_impersonating', { defaultValue: 'SuperAdmin: siz xodim nomidan ishlayapsiz' })}
                {name ? ` — ${name}` : ''}{user?.clinic?.clinicName ? ` (${user.clinic.clinicName})` : ''}
            </span>
            <Button size="small" icon={<RollbackOutlined />} onClick={stopImpersonation}>
                {t('sa_back_to_superadmin', { defaultValue: 'SuperAdminga qaytish' })}
            </Button>
        </div>
    )
}
