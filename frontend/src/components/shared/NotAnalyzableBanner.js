import React from 'react'
import { Alert, Typography } from 'antd'
import { useTranslation } from 'react-i18next'

const { Text } = Typography

/**
 * "Tahlil qilib bo'lmadi" ogohlantirishi.
 *
 * AI ba'zan xulosa matnida "rasmda EKG ko'rinmaydi, qayta yuborish zarur"
 * deb yozadi, lekin jiddiylik darajasiga 1 (= yashil "Normal") qo'yib
 * yuboradi. Backend endi bunday holatda darajani olib tashlaydi va
 * `tahlil_imkonsiz: true` bayrog'ini qo'yadi (T-092).
 *
 * Bu banner shifokorga natija ISHONCHSIZ ekanini aniq aytadi — kulrang
 * "Baholanmadi" chipi o'zi yetarli emas, chunki uni e'tibordan chetda
 * qoldirish oson.
 */
export default function NotAnalyzableBanner({ result }) {
    const { t } = useTranslation()

    if (!result || result.tahlil_imkonsiz !== true) return null

    const reason = result.analiz_mumkin_emas_sababi || result.final_summary

    return (
        <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message={
                <Text strong>
                    {t('not_analyzable_title', {
                        defaultValue: 'AI bu faylni tahlil qila olmadi',
                    })}
                </Text>
            }
            description={
                <>
                    <div style={{ marginBottom: 8 }}>
                        {t('not_analyzable_desc', {
                            defaultValue: 'Natijaga tayanmang: fayl sifati yetarli emas yoki tahlil turi mos kelmagan. Faylni qayta yuklang.',
                        })}
                    </div>
                    {reason ? (
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            {t('reason', { defaultValue: 'Sabab' })}: {reason}
                        </Text>
                    ) : null}
                </>
            }
        />
    )
}

/** `ai_answer_data` matnidan natija obyektini xavfsiz ajratib oladi. */
export function parseAiResult(aiAnswerData) {
    if (!aiAnswerData) return null
    try {
        return typeof aiAnswerData === 'string' ? JSON.parse(aiAnswerData) : aiAnswerData
    } catch {
        return null
    }
}
