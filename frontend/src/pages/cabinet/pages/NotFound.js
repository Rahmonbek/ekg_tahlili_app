import React from 'react'
import { Button, Result } from 'antd'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import useDocumentTitle from '../../../tools/useDocumentTitle';

/**
 * 404 — sahifa topilmadi.
 *
 * Ilgari noma'lum marshrut jimgina bosh sahifaga yo'naltirilardi: foydalanuvchi
 * havolani noto'g'ri yozgani yoki sahifa ko'chirilganini bilmasdi — shunchaki
 * "nima uchun men bosh sahifadaman?" degan savol qolardi.
 */
export default function NotFound() {
    const { t } = useTranslation()
    useDocumentTitle(t('page_not_found', { defaultValue: "Sahifa topilmadi" }))
    const navigate = useNavigate()
    const location = useLocation()

    return (
        <div className="main_card">
            <div className="main_card_content">
                <Result
                    status="404"
                    title="404"
                    subTitle={
                        <>
                            {t('page_not_found', { defaultValue: 'Bunday sahifa topilmadi' })}
                            <div style={{ marginTop: 8, fontSize: 13, color: '#94a3b8', wordBreak: 'break-all' }}>
                                {location.pathname}
                            </div>
                        </>
                    }
                    extra={
                        <>
                            <Button type="primary" onClick={() => navigate('/')}>
                                {t('go_home', { defaultValue: 'Bosh sahifaga' })}
                            </Button>
                            <Button onClick={() => navigate(-1)}>
                                {t('back', { defaultValue: 'Orqaga' })}
                            </Button>
                        </>
                    }
                />
            </div>
        </div>
    )
}
