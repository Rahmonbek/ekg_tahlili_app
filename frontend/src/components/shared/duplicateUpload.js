import { Modal, Button } from 'antd';
import { ExclamationCircleOutlined, EyeOutlined } from '@ant-design/icons';
import React from 'react';

/**
 * Takroriy fayl yuklashda tasdiq so'rash (T-096).
 *
 * Server bir xil bemorga aynan bir xil mazmunli fayl kelganini aniqlasa
 * `409` va `{"code": "DUPLICATE_FILE", "existing": {...}}` qaytaradi.
 * So'rov to'xtatiladi — hech qanday yozuv yaratilmaydi va sun'iy
 * intellektga hech narsa yuborilmaydi.
 *
 * Nima uchun avtomatik rad etilmaydi: qonuniy takrorlar ham bo'ladi.
 * Masalan bemor tekshiruvni takrorlagan va apparat aynan bir xil fayl
 * bergan. Shuning uchun qaror foydalanuvchida qoladi — u mavjud tahlilni
 * ochishi yoki "baribir yuklash" ni tanlashi mumkin.
 *
 * Boshqa bemorga bir xil fayl yuklash takror HISOBLANMAYDI — tekshiruv
 * har doim bitta bemor doirasida ishlaydi.
 */

/** Xatolik aynan takroriy fayl haqidami? */
export const isDuplicateError = (err) =>
    err?.response?.status === 409 &&
    err?.response?.data?.detail?.code === 'DUPLICATE_FILE';

/** Mavjud tahlil haqidagi ma'lumot: `{ id, document_number, created_at }`. */
export const duplicateInfo = (err) => err?.response?.data?.detail?.existing || null;

/**
 * Foydalanuvchidan tasdiq so'raydi.
 *
 * @param {object} err  axios xatoligi
 * @param {function} t  i18n tarjimon
 * @param {function} [onOpenExisting] mavjud tahlilni ochish (berilsa
 *        oynada uchinchi tugma sifatida chiqadi)
 * @returns {Promise<boolean>} `true` — baribir yuklash
 */
export const askDuplicate = (err, t, onOpenExisting) =>
    new Promise((resolve) => {
        const info = duplicateInfo(err);
        const created = info?.created_at
            ? new Date(info.created_at).toLocaleString()
            : null;
        const canOpen = typeof onOpenExisting === 'function' && info?.id;

        let modal;
        // Mavjud tahlilni ochadigan ALOHIDA tugma — u modalni yopib, o'sha
        // tahlil ko'rish sahifasiga o'tkazadi (Cancel bilan chalkashtirmaymiz).
        const openExisting = () => {
            resolve(false);
            modal?.destroy();
            onOpenExisting(info.id);
        };

        modal = Modal.confirm({
            title: t('duplicate_file_title', {
                defaultValue: 'Bu fayl allaqachon yuklangan',
            }),
            icon: <ExclamationCircleOutlined style={{ color: '#D97706' }} />,
            content: (
                <div>
                    <p style={{ marginBottom: 8 }}>
                        {t('duplicate_file_desc', {
                            defaultValue:
                                'Aynan shu fayl shu bemor uchun allaqachon yuklangan. '
                                + 'Ehtimol tugma ikki marta bosilgan yoki tahlil oldin '
                                + 'boshqa xodim tomonidan kiritilgan.',
                        })}
                    </p>
                    {info?.document_number && (
                        <p style={{ marginBottom: 4 }}>
                            <b>{t('document_number', { defaultValue: 'Hujjat raqami' })}:</b>{' '}
                            {info.document_number}
                        </p>
                    )}
                    {created && (
                        <p style={{ marginBottom: canOpen ? 12 : 0 }}>
                            <b>{t('created_at', { defaultValue: 'Yuklangan' })}:</b> {created}
                        </p>
                    )}
                    {canOpen && (
                        <Button type="primary" ghost icon={<EyeOutlined />} onClick={openExisting} block>
                            {t('open_uploaded_analysis', { defaultValue: 'Yuklangan tahlilni ochish' })}
                        </Button>
                    )}
                </div>
            ),
            okText: t('upload_anyway', { defaultValue: 'Baribir yuklash' }),
            okButtonProps: { danger: true },
            cancelText: t('cancel', { defaultValue: 'Bekor qilish' }),
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
        });
    });

/**
 * Formaning nusxasini `force_duplicate` bayrog'i bilan qaytaradi.
 *
 * Nusxa olinadi, chunki asl forma allaqachon yuborilgan va yuborilgandan
 * keyin sahifadagi holat tozalanadi — formani `state` dan qaytadan
 * yig'ish endi ishlamaydi.
 */
export const withForce = (formData) => {
    const copy = new FormData();
    for (const [key, value] of formData.entries()) {
        copy.append(key, value);
    }
    copy.append('force_duplicate', 'true');
    return copy;
};
