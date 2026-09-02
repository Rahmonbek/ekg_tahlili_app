import React, { useState } from 'react'
import { Button, Tooltip } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { successAlert, dangerAlert } from '../../tools/Alerts'
import { useStore } from '../../store/Store'

// Qayta tahlil progress elementi uchun tur bo'yicha yorliq va ro'yxat yo'li
const RETRY_TYPE_META = {
    ecg: { label: 'EKG AI tahlil', listPath: '/ecg-analyses' },
    holter: { label: 'Holter AI tahlil', listPath: '/holter-analyses' },
    smad: { label: 'SMAD AI tahlil', listPath: '/smad-analyses' },
    lab: { label: 'Laboratoriya AI tahlil', listPath: '/lab-analyses' },
}

/**
 * Xatolik bilan tugagan tahlilni AI ga qayta yuborish tugmasi.
 *
 * Ilgari `status = -1` yozuvida foydalanuvchida **hech qanday harakat
 * imkoniyati yo'q edi**: qayta urinish tugmasi qo'yilmagan, sabab
 * ko'rsatilmagan, o'chirib ham bo'lmasdi. Yozuv shunchaki ro'yxatda
 * abadiy "Xatolik" bo'lib turardi.
 *
 * @param {number}   id       tahlil id
 * @param {function} onRetry  async (id) => ... — tegishli service funksiyasi
 * @param {object}   meta     { age, gender, lang } — qayta tahlil uchun
 * @param {function} onDone   muvaffaqiyatdan keyin (ro'yxatni yangilash)
 */
export default function RetryAnalysisButton({ id, type, onRetry, meta = {}, onDone }) {
    const { t } = useTranslation()
    const [loading, setLoading] = useState(false)
    const { upsertPendingAnalysisByRef } = useStore()

    const handleClick = async (e) => {
        e.stopPropagation()
        setLoading(true)
        try {
            const formData = new FormData()
            formData.append('id', id)
            formData.append('age', meta.age ?? 0)
            formData.append('gender', meta.gender ?? 'erkak')
            formData.append('lang', meta.lang ?? 'uz')

            await onRetry(formData)

            // Qayta yuborilgan tahlilni "Tahlillar" progress paneliga qo'shamiz
            // (id oldindan ma'lum). Backend uni Track qiladi va tugaganda
            // SignalR orqali shu element yangilanadi (websocket + komponent).
            if (type) {
                const tm = RETRY_TYPE_META[type] || { label: t('analysis', { defaultValue: 'Tahlil' }), listPath: '/' }
                upsertPendingAnalysisByRef({
                    key: `analysis-${type}-${id}`,
                    type,
                    analysisId: Number(id),
                    status: 'loading',
                    label: tm.label,
                    listPath: tm.listPath,
                })
            }

            successAlert(t('retry_started', { defaultValue: 'Tahlil qaytadan yuborildi' }))
            if (onDone) onDone()
        } catch (err) {
            dangerAlert(
                err?.response?.data?.message ||
                err?.response?.data?.detail ||
                t('retry_failed', { defaultValue: 'Qayta yuborib bo\'lmadi' })
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <Tooltip title={t('retry_analysis', { defaultValue: 'AI tahlilini qayta ishga tushirish' })}>
            <Button
                type="text"
                size="small"
                icon={<ReloadOutlined />}
                loading={loading}
                onClick={handleClick}
            />
        </Tooltip>
    )
}

/**
 * `ai_answer_data` dan foydalanuvchiga ko'rsatiladigan xatolik sababini oladi.
 *
 * Backend xatoliklarni turkumlab saqlaydi (`ai_errors.py`), muzlab qolgan
 * tahlillarni esa kuzatuvchi belgilaydi — ikkalasi ham bir xil formatda.
 */
export function parseErrorReason(value, t) {
    if (!value) return null

    // Server tayyor xabar yoki xatolik kodini yuboradi (`ErrorReason`).
    // Eski chaqiruvlar bilan moslik uchun to'liq JSON ham qabul qilinadi.
    let code = value
    if (typeof value === 'string' && value.trim().startsWith('{')) {
        try {
            const parsed = JSON.parse(value)
            if (parsed?.xabar) return parsed.xabar
            code = parsed?.xato || parsed?.error
        } catch {
            return value
        }
    }
    if (!code) return null

    const KNOWN = {
        provider_auth_failed: t('err_provider_auth', { defaultValue: 'AI xizmati sozlamalarida muammo. Administratorga murojaat qiling.' }),
        provider_quota_exceeded: t('err_provider_quota', { defaultValue: 'AI xizmati limiti tugagan. Keyinroq urinib ko\'ring.' }),
        provider_timeout: t('err_provider_timeout', { defaultValue: 'AI xizmati javob bermadi. Qayta urinib ko\'ring.' }),
        provider_unavailable: t('err_provider_unavailable', { defaultValue: 'AI xizmati vaqtincha ishlamayapti.' }),
        invalid_file: t('err_invalid_file', { defaultValue: 'Faylni o\'qib bo\'lmadi. Boshqa fayl yuklang.' }),
        tahlil_muzlab_qoldi: t('err_stuck', { defaultValue: 'Tahlil belgilangan vaqt ichida tugamadi.' }),
    }
    // Kod tanilmasa, u allaqachon tayyor xabar bo'lishi mumkin —
    // shunda uni o'zgartirmasdan ko'rsatamiz
    return KNOWN[code] || (typeof code === 'string' && code.includes(' ') ? code
        : t('err_internal', { defaultValue: 'Ichki xatolik yuz berdi.' }))
}
