import React, { useRef, useState } from 'react';
import { Alert, Button, Space, Typography } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { successAlert, dangerAlert } from '../../tools/Alerts';
import { appendPatientMeta } from '../../tools/formatters';
import { extractApiError } from '../../tools/apiError';
import { validateAnalysisFile } from '../../tools/fileQualityValidator';

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
 * @param {boolean}  multiple  bir nechta fayl (laboratoriya) — tanlanganlar
 *                             tahlilning BARCHA fayllarini almashtiradi
 * @param {number}   [maxFiles]       fayllar soni chegarasi (`multiple` da)
 * @param {number}   [maxTotalBytes]  fayllarning jami hajmi chegarasi
 */
export default function FileMismatchBanner({
    info,
    analysisId,
    onReplace,
    meta = {},
    onSuccess,
    accept = '.pdf,.png,.jpg,.jpeg',
    multiple = false,
    maxFiles = null,
    maxTotalBytes = null,
}) {
    const { t } = useTranslation();
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef(null);

    if (!info) return null;

    /**
     * Tanlangan fayllarni yuborishdan OLDIN tekshiradi (L-21): soni, jami
     * hajmi, har birining kengaytmasi/hajmi/sifati — yuklash sahifasidagi
     * bilan bir xil qoidalar. Ilgari hech narsa tekshirilmasdi va katta
     * fayllar to'liq yuklanib bo'lgach server rad etardi.
     * @returns {Promise<string|null>} xato matni yoki `null`
     */
    const checkFiles = async (files) => {
        const limit = multiple ? maxFiles : 1;
        if (limit && files.length > limit) {
            return t('analyzer_max_files', {
                count: limit,
                defaultValue: `Ko'pi bilan ${limit} ta fayl biriktirish mumkin`,
            });
        }
        const total = files.reduce((sum, f) => sum + (f.size || 0), 0);
        if (maxTotalBytes && total > maxTotalBytes) {
            const mb = Math.round(maxTotalBytes / (1024 * 1024));
            return t('analyzer_max_total_size', {
                mb,
                defaultValue: `Fayllarning jami hajmi ${mb} MB dan oshmasligi kerak`,
            });
        }
        const exts = accept.split(',').map((e) => e.trim().replace(/^\./, '').toLowerCase()).filter(Boolean);
        for (const file of files) {
            const res = await validateAnalysisFile(file, t, exts);
            if (!res.ok) return files.length > 1 ? `${file.name}: ${res.message}` : res.message;
        }
        return null;
    };

    const handleFiles = async (fileList) => {
        const files = Array.from(fileList || []);
        if (files.length === 0) return;
        setUploading(true);
        try {
            const problem = await checkFiles(files);
            if (problem) {
                dangerAlert(problem);
                return;
            }
            const formData = new FormData();
            formData.append('id', analysisId);
            files.forEach((file) => formData.append('file', file));
            appendPatientMeta(formData, meta);
            formData.append('lang', meta.lang ?? 'uz');

            await onReplace(formData);
            successAlert(
                t('file_replaced_reanalyzing', { defaultValue: 'Fayl almashtirildi. Tahlil qaytadan boshlandi.' })
            );
            if (onSuccess) onSuccess();
        } catch (err) {
            // Server sababi: 409 `detail` ("tahlil hali ishlanmoqda"), 413
            // `message` (jami hajm) va h.k.; bo'lmasa umumiy xabar
            dangerAlert(
                extractApiError({ response: err?.response }, '')
                || t('file_replace_failed', { defaultValue: 'Faylni almashtirib bo\'lmadi. Qaytadan urinib ko\'ring.' })
            );
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const description = (
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
            {/* Bir nechta fayl bo'lsa — aynan qaysi biri mos kelmagani */}
            {info.fayl_raqami && info.fayllar_soni > 1 ? (
                <Text strong>
                    {t('mismatch_file_number', {
                        index: info.fayl_raqami,
                        count: info.fayllar_soni,
                        defaultValue: `${info.fayllar_soni} ta fayldan ${info.fayl_raqami}-fayl`,
                    })}
                </Text>
            ) : null}
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
                    {multiple
                        ? t('replace_files', { defaultValue: 'Fayllarni almashtirish' })
                        : t('replace_file', { defaultValue: 'Faylni almashtirish' })}
                </Button>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {multiple
                        ? t('replace_files_hint', { defaultValue: "Yangi tahlil yaratilmaydi — tanlangan fayllar shu tahlilning barcha fayllari o'rniga qo'yiladi va qayta tahlil qilinadi. To'g'ri fayllarning hammasini birga tanlang." })
                        : t('replace_file_hint', { defaultValue: 'Yangi tahlil yaratilmaydi — shu yozuvning fayli almashtiriladi va qayta tahlil qilinadi.' })}
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
            multiple={multiple}
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
            onChange={(e) => handleFiles(e.target.files)}
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
