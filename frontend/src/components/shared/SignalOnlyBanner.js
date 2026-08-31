import React from 'react'
import { Alert, Typography } from 'antd'
import { useTranslation } from 'react-i18next'

const { Text } = Typography

/**
 * "AI ishlamadi, lekin o'lchovlar bor" ogohlantirishi (T-029).
 *
 * EKG signal fayllari uchun raqamli o'lchovlar (QRS davomiyligi, PR
 * interval, QTc, ST siljishi, yurak o'qi) **sun'iy intellektsiz**,
 * matematik yo'l bilan hisoblanadi. Bu hisob AI chaqiruvidan oldin
 * bajariladi va undan mustaqil.
 *
 * Ilgari AI xatolik bersa bu natijalar ham tashlab yuborilardi va
 * shifokor faqat qizil "Xatolik" chipini ko'rardi — ya'ni OpenAI
 * ishlamasa butun mahsulot ishlamas edi.
 *
 * Endi o'lchovlar saqlanadi va ko'rsatiladi. Bu banner ularning
 * MANBASINI aniq aytadi: raqamlar ishonchli, AI xulosasi esa yo'q.
 * Buni aytmaslik xavfli bo'lardi — shifokor o'lchovlarni AI tasdiqlagan
 * deb o'ylashi mumkin.
 */
export default function SignalOnlyBanner({ result }) {
    const { t } = useTranslation()

    if (!result || result.signal_measurements_only !== true) return null

    return (
        <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message={
                <Text strong>
                    {t('signal_only_title', {
                        defaultValue: 'AI xulosasi olinmadi, o\'lchovlar mavjud',
                    })}
                </Text>
            }
            description={
                <>
                    <div style={{ marginBottom: 8 }}>
                        {t('signal_only_desc', {
                            defaultValue:
                                'Quyidagi raqamli o\'lchovlar EKG signalidan matematik '
                                + 'yo\'l bilan hisoblangan va ishonchli. Sun\'iy intellekt '
                                + 'xulosasi esa olinmadi — uni qayta urinish orqali '
                                + 'olishingiz mumkin.',
                        })}
                    </div>
                    {result.xabar ? (
                        <Text type="secondary">{result.xabar}</Text>
                    ) : null}
                </>
            }
        />
    )
}
