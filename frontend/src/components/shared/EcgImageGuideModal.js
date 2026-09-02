import React from 'react';
import { Modal, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaXmark } from 'react-icons/fa6';
import ecgSample from '../../images/ecg_sample.svg';
import ecgWrongSample from '../../images/ecg_wrong_sample.svg';

/**
 * EKG rasmini qanday yuborish kerakligini tushuntiruvchi yo'riqnoma modali.
 *
 * Nima uchun kerak: foydalanuvchilar ko'pincha Telegram orqali SIQILGAN
 * (compress) rasm, skrinshot yoki xira/qiyshiq surat yuboradi — bunday
 * rasmda EKG intervallari o'qilmaydi va AI tahlili noto'g'ri chiqadi.
 * Ushbu modal to'g'ri va noto'g'ri holatlarni SVG bilan ko'rsatadi.
 *
 * Birinchi marta tahlil qilayotgan foydalanuvchida avtomatik ochiladi
 * (EcgAnalyzer localStorage bayrog'iga qaraydi); keyin faqat `.alert_icon`
 * bosilganda ochiladi.
 */
export default function EcgImageGuideModal({ open, onClose }) {
    const { t } = useTranslation();

    const doItems = [
        t('ecg_guide_do_full', { defaultValue: 'Butun EKG lentasi boshidan oxirigacha, barcha kanallar bilan to‘liq ko‘rinsin — hech bir qismi kesilmasin.' }),
        t('ecg_guide_do_flat', { defaultValue: 'Lentani tekis yuzaga yoyib qo‘ying — bukilmagan, g‘ijimlanmagan, buralmagan holatda.' }),
        t('ecg_guide_do_light', { defaultValue: 'Yorug‘ joyda, soya va yorug‘lik aksi (blik) tushmasdan suratga oling.' }),
        t('ecg_guide_do_sharp', { defaultValue: 'Rasm aniq (fokusda) bo‘lsin — xira yoki harakatdan yoyilib ketmagan.' }),
        t('ecg_guide_do_straight', { defaultValue: 'To‘g‘ridan, tepadan oling — qiyshiq yoki yon burchakdan emas.' }),
        t('ecg_guide_do_quality', { defaultValue: 'Iloji boricha yuqori sifatli, asl (original) rasmni yuboring.' }),
    ];

    const dontItems = [
        t('ecg_guide_dont_telegram', { defaultValue: 'Telegram yoki boshqa messenjerda SIQIB (compress) yuborilgan rasmni yubormang — sifati pasayadi. Telegramda «Fayl» (Файл) sifatida, siqmasdan yuboring.' }),
        t('ecg_guide_dont_blurry', { defaultValue: 'Qorong‘i, xira, blik tushgan yoki harakatdan yoyilib ketgan rasmni yubormang.' }),
        t('ecg_guide_dont_partial', { defaultValue: 'Lentaning faqat bir qismi ko‘ringan yoki barmoq bilan yopilgan rasmni yubormang.' }),
        t('ecg_guide_dont_skew', { defaultValue: 'Kuchli qiyshaygan, cho‘zilgan yoki burchakdan olingan rasmni yubormang.' }),
    ];

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={[
                <Button key="ok" type="primary" className="btn_form" onClick={onClose} style={{ width: 'auto', padding: '0 28px' }}>
                    {t('understood', { defaultValue: 'Tushundim' })}
                </Button>,
            ]}
            centered
            width={720}
            className="ecg-guide-modal"
            title={t('ecg_guide_title', { defaultValue: 'EKG rasmini qanday yuborish kerak' })}
        >
            <p className="ecg-guide-intro">
                {t('ecg_guide_intro', { defaultValue: 'To‘g‘ri tahlil bo‘lishi uchun EKG rasmi quyidagi ko‘rinishda bo‘lishi shart. Sifatsiz rasmda intervallar o‘qilmaydi va natija noto‘g‘ri chiqadi.' })}
            </p>

            {/* ─── SVG: to'g'ri va noto'g'ri namuna ─── */}
            <div className="ecg-guide-illus">
                <figure className="ecg-guide-fig ecg-guide-fig--good">
                    {/* Haqiqiy 12-kanalli EKG namunasi — barcha kanallar, grid va
                        apparat o'lchovlari (HR, PR, QRS, QT, QTc, o'qlar) aniq ko'rinadi */}
                    <img className="ecg-guide-real" src={ecgSample} alt={t('ecg_guide_good', { defaultValue: 'To‘g‘ri' })} />
                    <figcaption className="ecg-guide-cap ecg-guide-cap--good">
                        <FaCheck /> {t('ecg_guide_good', { defaultValue: 'To‘g‘ri' })}
                    </figcaption>
                </figure>

                <figure className="ecg-guide-fig ecg-guide-fig--bad">
                    {/* 6 ta noto'g'ri holat: qiyshiq, 90° burilgan, kesilgan,
                        blik, juda uzoq va xira surat */}
                    <img className="ecg-guide-real ecg-guide-real--bad" src={ecgWrongSample} alt={t('ecg_guide_bad', { defaultValue: 'Noto‘g‘ri' })} />
                    <figcaption className="ecg-guide-cap ecg-guide-cap--bad">
                        <FaXmark /> {t('ecg_guide_bad', { defaultValue: 'Noto‘g‘ri' })}
                    </figcaption>
                </figure>
            </div>

            {/* ─── To'g'ri ─── */}
            <div className="ecg-guide-block">
                <h4 className="ecg-guide-h ecg-guide-h--do"><FaCheck /> {t('ecg_guide_do_title', { defaultValue: 'Shunday bo‘lsin' })}</h4>
                <ul className="ecg-guide-list ecg-guide-list--do">
                    {doItems.map((x, i) => <li key={i}><FaCheck className="ecg-guide-ic ecg-guide-ic--do" /><span>{x}</span></li>)}
                </ul>
            </div>

            {/* ─── Noto'g'ri ─── */}
            <div className="ecg-guide-block">
                <h4 className="ecg-guide-h ecg-guide-h--dont"><FaXmark /> {t('ecg_guide_dont_title', { defaultValue: 'Bunday rasm yubormang' })}</h4>
                <ul className="ecg-guide-list ecg-guide-list--dont">
                    {dontItems.map((x, i) => <li key={i}><FaXmark className="ecg-guide-ic ecg-guide-ic--dont" /><span>{x}</span></li>)}
                </ul>
            </div>
        </Modal>
    );
}
