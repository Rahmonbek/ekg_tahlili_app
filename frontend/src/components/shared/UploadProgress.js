import React from 'react';
import { Button, Progress } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

/**
 * Fayl yuklanayotgandagi jarayon ko'rsatkichi (T-054).
 *
 * Ilgari katta fayl (4.2 MB EKG rasmi, 1.7 MB SMAD PDF) yuklanayotganda
 * foydalanuvchi **hech qanday belgi ko'rmasdi**: tugma bosiladi va sahifa
 * "muzlab" turadi. Sekin internetda bu bir necha daqiqa davom etadi.
 *
 * Oqibati faqat noqulaylik emas: foydalanuvchi hech narsa bo'lmayapti deb
 * o'ylab tugmani qayta bosadi va ikkinchi tahlil yaratiladi. Auditda
 * topilgan takroriy yozuvlar (T-096) aynan shundan.
 *
 * 100% ga yetgach yozuv o'zgaradi: fayl serverga yetdi, endi u qayta
 * ishlanmoqda — bu bosqich uzoqroq davom etishi mumkin va foydalanuvchi
 * buni bilishi kerak.
 */
export default function UploadProgress({ percent, onCancel }) {
    const { t } = useTranslation();

    if (percent === null || percent === undefined) return null;

    const done = percent >= 100;

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 14px',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 10,
            marginBottom: 12,
        }}>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, marginBottom: 4, color: '#475569' }}>
                    {done
                        ? t('upload_processing', {
                            defaultValue: 'Fayl yuborildi, tahlil boshlandi…',
                        })
                        : t('upload_in_progress', {
                            defaultValue: 'Fayl yuklanmoqda… {{percent}}%',
                            percent,
                        })}
                </div>
                <Progress
                    percent={percent}
                    showInfo={false}
                    size="small"
                    status={done ? 'active' : 'normal'}
                />
            </div>

            {/* Yuborilib bo'lgandan keyin bekor qilish ma'nosini yo'qotadi:
                server allaqachon yozuv yaratgan */}
            {!done && onCancel ? (
                <Button
                    size="small"
                    type="text"
                    danger
                    icon={<CloseOutlined />}
                    onClick={onCancel}
                >
                    {t('cancel', { defaultValue: 'Bekor qilish' })}
                </Button>
            ) : null}
        </div>
    );
}
