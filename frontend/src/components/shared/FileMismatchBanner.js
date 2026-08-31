import React, { useRef, useState } from 'react';
import { Alert, Button, Space, Typography } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { successAlert, dangerAlert } from '../../tools/Alerts';

const { Text } = Typography;

/**
 * Tahlil fayli tanlangan tahlil turiga mos kelmaganda ko'rsatiladigan banner.
 *
 * Backend `status = 3` (STATUS_FILE_MISMATCH) qaytarganda `ai_answer_data`
 * ichida quyidagi struktura keladi:
 *   { xato: "fayl_turi_mos_emas", kutilgan_tur, aniqlangan_tur, ishonch, xabar, izoh }
 *
 * Banner foydalanuvchiga nima bo'lganini tushuntiradi va yangi tahlil
 * yaratmasdan, o'sha yozuvning faylini almashtirish imkonini beradi.
 *
 * @param {object}   info      ai_answer_data dan parse qilingan obyekt
 * @param {number}   analysisId
 * @param {function} onReplace async (formData) => ... — tegishli service funksiyasi
 * @param {object}   meta      { age, gender, lang } — qayta tahlil uchun kerak
 * @param {function} onSuccess fayl almashtirilgandan keyin chaqiriladi (ma'lumotni qayta yuklash)
 * @param {string}   accept    input accept atributi
 */
export default function FileMismatchBanner({
    info,
    analysisId,
    onReplace,
    meta = {},
    onSuccess,
    accept = '.pdf,.png,.jpg,.jpeg',
}) {
    const { t } = useTranslation();
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef(null);

    if (!info) return null;

    const handleFile = async (file) => {
        if (!file) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('id', analysisId);
            formData.append('file', file);
            formData.append('age', meta.age ?? 0);
            formData.append('gender', meta.gender ?? 'erkak');
            formData.append('lang', meta.lang ?? 'uz');

            await onReplace(formData);
            successAlert(
                t('file_replaced_reanalyzing', { defaultValue: 'Fayl almashtirildi. Tahlil qaytadan boshlandi.' })
            );
            if (onSuccess) onSuccess();
        } catch (err) {
            dangerAlert(
                err?.response?.data?.message ||
                err?.response?.data?.detail ||
                t('file_replace_failed', { defaultValue: 'Faylni almashtirib bo\'lmadi. Qaytadan urinib ko\'ring.' })
            );
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const description = (
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
            <Text>{info.xabar}</Text>

            {info.izoh ? (
                <Text type="secondary" style={{ fontSize: 13 }}>
                    {(t('file_detected_as', { defaultValue: 'Faylda aniqlangan' }))}: {info.izoh}
                </Text>
            ) : null}

            <Space wrap>
                <Button
                    type="primary"
                    icon={<UploadOutlined />}
                    loading={uploading}
                    onClick={() => fileRef.current?.click()}
                >
                    {t('replace_file', { defaultValue: 'Faylni almashtirish' })}
                </Button>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {t('replace_file_hint', { defaultValue: 'Yangi tahlil yaratilmaydi — shu yozuvning fayli almashtiriladi va qayta tahlil qilinadi.' })}
                </Text>
            </Space>

        </Space>
    );

    // Fayl tanlagich Space dan tashqarida: Space har bir bolani
    // `.ant-space-item` ichiga o'raydi va uni ko'rinadigan qilib qo'yadi.
    const hiddenInput = (
        <input
            ref={fileRef}
            type="file"
            accept={accept}
            hidden
            aria-hidden="true"
            tabIndex={-1}
            // App.css da global `input { display: flex }` qoidasi bor va u `hidden`
            // atributini bekor qiladi — shuning uchun ekrandan chiqarib yuboramiz.
            style={{
                position: 'absolute',
                width: 1,
                height: 1,
                opacity: 0,
                pointerEvents: 'none',
                left: -9999,
            }}
            onChange={(e) => handleFile(e.target.files?.[0])}
        />
    );

    return (
        <>
            <Alert
                type="warning"
                showIcon
                message={
                    <Text strong>
                        {t('file_type_mismatch', { defaultValue: 'Yuklangan fayl bu tahlil turiga mos emas' })}
                    </Text>
                }
                description={description}
                style={{ marginBottom: 16 }}
            />
            {hiddenInput}
        </>
    );
}

/**
 * `ai_answer_data` matnidan mos kelmaslik ma'lumotini ajratib oladi.
 * Mos kelmaslik bo'lmasa `null` qaytaradi.
 */
export function parseFileMismatch(aiAnswerData) {
    if (!aiAnswerData) return null;
    try {
        const parsed = typeof aiAnswerData === 'string'
            ? JSON.parse(aiAnswerData)
            : aiAnswerData;
        return parsed?.xato === 'fayl_turi_mos_emas' ? parsed : null;
    } catch {
        return null;
    }
}
