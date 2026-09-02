import React, { useState } from 'react';
import { Button, Modal, Tooltip } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

/**
 * Jadval katagidagi uzun matn: qator emas, tugma.
 *
 * Muammo
 * ------
 * "AI xulosasi (qisqacha)" va xatolik sababi kabi ustunlarda matn
 * to'g'ridan-to'g'ri katakka chizilardi. Yon panel ochilganda jadvalga
 * qoladigan kenglik ~260 px ga qisqaradi va o'sha matn uch-to'rt
 * qatorga bo'linib ketadi — natijada har bir qator ikki barobar
 * balandlashadi va ekranga atigi to'rt-besh tahlil sig'adi.
 *
 * Tooltip yechim emas: u sensorli ekranda umuman ochilmaydi va uzun
 * matn uchun juda tor.
 *
 * Yechim
 * ------
 * Katakda faqat ko'z tugmasi turadi; matn bosilganda modal oynada
 * to'liq ko'rsatiladi. Qator balandligi endi matn uzunligiga bog'liq
 * emas.
 *
 * @param {string} text        to'liq matn
 * @param {string} title       modal sarlavhasi
 * @param {React.ReactNode} before  tugmadan oldin chiziladigan narsa
 *                                  (masalan holat chipi)
 * @param {string} emptyMark   matn bo'lmaganda ko'rsatiladigan belgi
 */
export default function LongTextCell({ text, title, before = null, emptyMark = '—' }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    const value = typeof text === 'string' ? text.trim() : '';

    if (!value) {
        return before
            ? <>{before}</>
            : <span style={{ color: '#cbd5e1' }}>{emptyMark}</span>;
    }

    const label = t('view_full_text', { defaultValue: "To'liq matnni ko'rish" });

    return (
        <>
            {before}
            <Tooltip title={label}>
                <Button
                    type="primary"
                    size="small"
                    icon={<EyeOutlined />}
                    aria-label={label}
                    onClick={(e) => {
                        // Qator bosilganda tahlil ochiladi — tugma uni
                        // ishga tushirmasligi kerak
                        e.stopPropagation();
                        setOpen(true);
                    }}
                />
            </Tooltip>

            <Modal
                open={open}
                title={title}
                onCancel={(e) => { e?.stopPropagation?.(); setOpen(false); }}
                footer={null}
                width={720}
                centered
            >
                {/* `pre-wrap`: AI matnida xatboshi va ro'yxatlar bo'ladi,
                    ular bir qatorga siqilib qolmasligi kerak */}
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.6,
                        color: '#334155',
                        maxHeight: '60vh',
                        overflowY: 'auto',
                    }}
                >
                    {value}
                </div>
            </Modal>
        </>
    );
}
