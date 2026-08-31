import React, { useState } from 'react'
import { Button, Input, Modal, Tooltip, Typography } from 'antd'
import { DeleteOutlined, ExclamationCircleFilled } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { delete_analysis } from '../../host/requests/AnalysisDeletionRequest'
import { successAlert, dangerAlert } from '../../tools/Alerts'

const { Text, Paragraph } = Typography

/** Sabab kamida shuncha belgi bo'lishi kerak — backend ham shuni tekshiradi. */
const MIN_REASON = 5

/**
 * Tahlilni o'chirish tugmasi (yumshoq o'chirish).
 *
 * Ilgari platformada tahlilni o'chirish yoki bekor qilish imkoniyati umuman
 * yo'q edi: noto'g'ri bemorga biriktirilgan yoki xato fayl bilan yaratilgan
 * yozuv abadiy ro'yxatda qolardi.
 *
 * Yozuv fizik o'chirilmaydi — `deleted_at` qo'yiladi va audit jurnaliga
 * kim/qachon/nima sababdan o'chirgani yoziladi. Shu sababli sabab majburiy.
 *
 * @param {string}   type     "ecg" | "lab" | "holter" | "smad" | "diagnose"
 * @param {number}   id       tahlil id
 * @param {string}   label    modal sarlavhasida ko'rsatiladigan nom (hujjat raqami)
 * @param {function} onDeleted muvaffaqiyatdan keyin (ro'yxatni yangilash)
 */
export default function DeleteAnalysisButton({ type, id, label, onDeleted }) {
    const { t } = useTranslation()
    const [open, setOpen] = useState(false)
    const [reason, setReason] = useState('')
    const [loading, setLoading] = useState(false)

    const tooShort = reason.trim().length < MIN_REASON

    const handleOk = async () => {
        if (tooShort) return
        setLoading(true)
        try {
            await delete_analysis(type, id, reason.trim())
            successAlert(t('analysis_deleted', { defaultValue: 'Tahlil o\'chirildi' }))
            setOpen(false)
            setReason('')
            if (onDeleted) onDeleted()
        } catch (err) {
            dangerAlert(
                err?.response?.data?.message ||
                t('analysis_delete_failed', { defaultValue: 'Tahlilni o\'chirib bo\'lmadi' })
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <Tooltip title={t('delete', { defaultValue: 'O\'chirish' })}>
                <Button
                    danger
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={(e) => { e.stopPropagation(); setOpen(true) }}
                />
            </Tooltip>

            <Modal
                open={open}
                title={
                    <span>
                        <ExclamationCircleFilled style={{ color: '#faad14', marginRight: 8 }} />
                        {t('delete_analysis_title', { defaultValue: 'Tahlilni o\'chirish' })}
                    </span>
                }
                okText={t('delete', { defaultValue: 'O\'chirish' })}
                cancelText={t('cancel', { defaultValue: 'Bekor qilish' })}
                okButtonProps={{ danger: true, disabled: tooShort, loading }}
                onOk={handleOk}
                onCancel={() => { setOpen(false); setReason('') }}
                destroyOnHidden
            >
                <Paragraph>
                    {label ? <Text strong>{label}</Text> : null}
                    {label ? ' — ' : null}
                    {t('delete_analysis_confirm', {
                        defaultValue: 'Bu tahlil ro\'yxatlardan olib tashlanadi. Yozuv bazadan butunlay o\'chirilmaydi va zarur bo\'lsa tiklanishi mumkin.',
                    })}
                </Paragraph>

                <Text type="secondary" style={{ fontSize: 13 }}>
                    {t('delete_reason_label', { defaultValue: 'O\'chirish sababi (majburiy)' })}
                </Text>
                <Input.TextArea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t('delete_reason_placeholder', {
                        defaultValue: 'Masalan: noto\'g\'ri bemorga biriktirilgan',
                    })}
                    style={{ marginTop: 6 }}
                />
                {tooShort && reason.length > 0 ? (
                    <Text type="danger" style={{ fontSize: 12 }}>
                        {t('delete_reason_too_short', {
                            defaultValue: 'Sabab kamida 5 belgidan iborat bo\'lishi kerak',
                        })}
                    </Text>
                ) : null}
            </Modal>
        </>
    )
}
