import React, { useState } from 'react';
import { Alert, Button } from 'antd';
import { TranslationOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { translateAnalysis } from '../../host/EkgService';
import { dangerAlert } from '../../tools/Alerts';

/**
 * AI xulosasi boshqa tilda yaratilgani haqida ogohlantirish va tarjima
 * tugmasi (T-059).
 *
 * Tahlil yaratilayotganda "AI tahlil tilini tanlang" maydoni bor va
 * javob o'sha tilda saqlanadi. Amaliy holat: hamshira tahlilni o'zbek
 * tilida yaratadi, keyin rus tilli kardiolog uni ochadi. Interfeys rus
 * tilida, AI matni esa o'zbekcha — shifokor tarjima buzilgan yoki tizim
 * noto'g'ri ishlayapti deb o'ylaydi.
 *
 * Ogohlantirish sababini aytadi, tugma esa matnni haqiqatan tarjima
 * qiladi. Tarjima serverda keshlanadi — ikkinchi marta bosilganda
 * sun'iy intellekt chaqirilmaydi.
 */

const LANGUAGE_NAMES = {
    uz: { uz: "o'zbek", ru: 'узбекском', en: 'Uzbek' },
    ru: { uz: 'rus', ru: 'русском', en: 'Russian' },
    en: { uz: 'ingliz', ru: 'английском', en: 'English' },
};

export default function AiLanguageNotice({ aiLang, kind, analysisId, onTranslated }) {
    const { t, i18n } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [translated, setTranslated] = useState(false);

    const current = (i18n.language || 'uz').slice(0, 2);
    const source = (aiLang || '').slice(0, 2);

    // Til noma'lum (migratsiyadan oldingi yozuvlar) yoki mos kelsa —
    // ogohlantirishning ma'nosi yo'q
    if (!source || source === current) return null;

    const names = LANGUAGE_NAMES[source];
    const languageName = names ? (names[current] || names.en) : source;

    const handleTranslate = async () => {
        setLoading(true);
        try {
            const res = await translateAnalysis(kind, analysisId, current);
            if (res?.result) {
                onTranslated?.(res.result);
                setTranslated(true);
            }
        } catch {
            dangerAlert(t('translation_failed', { defaultValue: 'Tarjima bajarilmadi' }));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message={t('ai_other_language', {
                defaultValue: 'Bu xulosa {{language}} tilida yaratilgan',
                language: languageName,
            })}
            description={
                <>
                    <div style={{ marginBottom: onTranslated ? 10 : 0 }}>
                        {t('ai_other_language_desc', {
                            defaultValue:
                                'Tahlil yaratilganda AI tili tanlangan va matn o\'sha '
                                + 'tilda saqlangan.',
                        })}
                    </div>

                    {/* Tugma faqat natijani almashtira oladigan sahifada */}
                    {onTranslated && !translated ? (
                        <Button
                            size="small"
                            type="primary"
                            ghost
                            loading={loading}
                            icon={<TranslationOutlined />}
                            onClick={handleTranslate}
                        >
                            {loading
                                ? t('translating', { defaultValue: 'Tarjima qilinmoqda…' })
                                : t('translate_conclusion', { defaultValue: 'Xulosani tarjima qilish' })}
                        </Button>
                    ) : null}
                </>
            }
        />
    );
}
