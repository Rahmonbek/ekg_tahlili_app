import React, { useState } from 'react'
import { Button, Tooltip } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import axiosInstance from '../../host/Api'
import { successAlert, dangerAlert } from '../../tools/Alerts'

/**
 * Tahlillar ro'yxatini CSV ga eksport qilish tugmasi.
 *
 * Shifoxonalar oylik hisobot tayyorlashda ma'lumotni ekrandan qo'lda ko'chirib
 * yozishga majbur edi. Eksport ro'yxatdagi joriy filtrlarni hisobga oladi —
 * ya'ni ekranda nimani ko'rsangiz, faylda ham shu bo'ladi.
 *
 * @param {string} type    "ecg" | "holter" | "smad" | "lab"
 * @param {object} filters { search, status, aiStatus, dateFrom, dateTo }
 */
export default function ExportButton({ type, filters = {} }) {
    const { t } = useTranslation()
    const [loading, setLoading] = useState(false)

    const handleExport = async () => {
        setLoading(true)
        try {
            const params = { type }
            if (filters.search) params.search = filters.search
            if (filters.status !== null && filters.status !== undefined) params.status = filters.status
            if (filters.aiStatus !== null && filters.aiStatus !== undefined) params.aiStatus = filters.aiStatus
            if (filters.dateFrom) params.dateFrom = filters.dateFrom
            if (filters.dateTo) params.dateTo = filters.dateTo

            const res = await axiosInstance.get('/analyses/export', {
                params,
                responseType: 'blob',
            })

            // Fayl nomini serverdan olamiz, bo'lmasa o'zimiz yasaymiz
            const disposition = res.headers['content-disposition'] || ''
            const match = disposition.match(/filename=([^;]+)/)
            const fileName = match ? match[1].trim() : `nmed-${type}.csv`

            const url = window.URL.createObjectURL(new Blob([res.data]))
            const link = document.createElement('a')
            link.href = url
            link.download = fileName
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)

            successAlert(t('export_done', { defaultValue: 'Fayl yuklab olindi' }))
        } catch (err) {
            dangerAlert(t('export_failed', { defaultValue: 'Eksport qilib bo\'lmadi' }))
        } finally {
            setLoading(false)
        }
    }

    return (
        <Tooltip title={t('export_hint', { defaultValue: 'Joriy filtrlar bo\'yicha CSV faylga yuklash' })}>
            <Button
                icon={<DownloadOutlined />}
                loading={loading}
                onClick={handleExport}
                data-tour="analysis-export"
            >
                {t('export_csv', { defaultValue: 'CSV ga yuklash' })}
            </Button>
        </Tooltip>
    )
}
