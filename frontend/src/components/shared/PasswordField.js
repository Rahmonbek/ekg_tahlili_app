import React, { useMemo } from 'react';
import { Input, Progress } from 'antd';
import { LockOutlined, CheckCircleFilled, CloseCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

/**
 * Parol maydoni — talablar ro'yxati va kuch ko'rsatkichi bilan (T-022).
 *
 * Ilgari parolga hech qanday talab yo'q edi va bazada `1` parolli
 * xodimlar paydo bo'lgan. Server endi parolni rad etadi, lekin faqat
 * server tomonidagi tekshiruv yetarli emas: foydalanuvchi formani
 * to'ldirib, yuborib, keyin xatolik oladi va nima kerakligini taxmin
 * qiladi. Shuning uchun talablar **yozish davomida** ko'rsatiladi.
 *
 * Qoidalar `Services/PasswordPolicy.cs` bilan bir xil bo'lishi SHART —
 * ular ikki joyda yozilgan, chunki biri foydalanuvchiga yo'l ko'rsatadi,
 * ikkinchisi esa haqiqiy himoya (frontendni chetlab o'tish mumkin).
 */

const MIN_LENGTH = 8;
const PASSPHRASE_LENGTH = 12;

/** `PasswordPolicy.Common` bilan bir xil ro'yxat. */
const COMMON = new Set([
    '12345678', '123456789', '1234567890', 'password', 'parol123',
    'qwertyui', 'qwerty123', '11111111', '00000000', '87654321',
    'admin123', 'adminadmin', 'doctor123', 'nmed1234', 'nmedadmin',
    'iloveyou', 'welcome1', 'abc12345', '1q2w3e4r', 'zxcvbnm1',
]);

/** Parol qoidalarini tekshiradi. Formaning `rules` da ham ishlatiladi. */
export function checkPassword(value) {
    const v = value || '';
    const longEnough = v.length >= MIN_LENGTH;
    const hasLetter = /\p{L}/u.test(v);
    // Uzun parol iborasi raqamsiz ham kuchli
    const hasDigit = /\d/.test(v) || v.length >= PASSPHRASE_LENGTH;
    const varied = new Set(v).size >= 4;
    const notCommon = !COMMON.has(v.toLowerCase());

    return {
        longEnough,
        hasLetter,
        hasDigit,
        varied,
        notCommon,
        valid: longEnough && hasLetter && hasDigit && varied && notCommon,
    };
}

/** i18n uchun tarjimon berilishi kerak — komponentdan tashqarida ham ishlatiladi. */
export function passwordRule(t) {
    return {
        validator: (_, value) => {
            if (!value) return Promise.resolve();   // `required` alohida qoida
            const r = checkPassword(value);
            if (r.valid) return Promise.resolve();
            if (!r.longEnough) {
                return Promise.reject(new Error(
                    t('pw_min_length', { defaultValue: `Kamida ${MIN_LENGTH} ta belgi`, count: MIN_LENGTH })));
            }
            if (!r.notCommon) {
                return Promise.reject(new Error(
                    t('pw_too_common', { defaultValue: 'Bu parol juda ko\'p ishlatiladi' })));
            }
            if (!r.hasLetter) {
                return Promise.reject(new Error(t('pw_need_letter', { defaultValue: 'Kamida bitta harf' })));
            }
            if (!r.hasDigit) {
                return Promise.reject(new Error(t('pw_need_digit', { defaultValue: 'Kamida bitta raqam' })));
            }
            return Promise.reject(new Error(
                t('pw_need_variety', { defaultValue: 'Kamida 4 xil belgi' })));
        },
    };
}

function Requirement({ ok, text }) {
    return (
        <li style={{
            listStyle: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: ok ? '#059669' : '#94A3B8',
            fontSize: 12,
            lineHeight: 1.7,
        }}>
            {ok ? <CheckCircleFilled /> : <CloseCircleOutlined />}
            <span>{text}</span>
        </li>
    );
}

export default function PasswordField({ value, onChange, showRequirements = true, ...rest }) {
    const { t } = useTranslation();
    const result = useMemo(() => checkPassword(value), [value]);

    const passed = [result.longEnough, result.hasLetter, result.hasDigit,
                    result.varied, result.notCommon].filter(Boolean).length;
    const percent = (passed / 5) * 100;

    return (
        <div>
            <Input.Password
                prefix={<LockOutlined />}
                value={value}
                onChange={onChange}
                {...rest}
            />

            {showRequirements && value ? (
                <div style={{ marginTop: 8 }}>
                    <Progress
                        percent={percent}
                        showInfo={false}
                        size="small"
                        strokeColor={percent < 60 ? '#DC2626' : percent < 100 ? '#D97706' : '#059669'}
                    />
                    <ul style={{ margin: '6px 0 0', padding: 0 }}>
                        <Requirement ok={result.longEnough}
                            text={t('pw_min_length', { defaultValue: `Kamida ${MIN_LENGTH} ta belgi`, count: MIN_LENGTH })} />
                        <Requirement ok={result.hasLetter}
                            text={t('pw_need_letter', { defaultValue: 'Kamida bitta harf' })} />
                        <Requirement ok={result.hasDigit}
                            text={t('pw_need_digit', { defaultValue: 'Kamida bitta raqam' })} />
                        <Requirement ok={result.varied}
                            text={t('pw_need_variety', { defaultValue: 'Kamida 4 xil belgi' })} />
                        <Requirement ok={result.notCommon}
                            text={t('pw_not_common', { defaultValue: 'Ko\'p ishlatiladigan parol emas' })} />
                    </ul>
                </div>
            ) : null}
        </div>
    );
}
