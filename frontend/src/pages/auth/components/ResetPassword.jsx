import React, { useState, useEffect, useRef } from 'react';
import { Form, Button, Alert } from 'antd';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { FaMobileScreenButton, FaShieldHalved, FaLock, FaCircleCheck } from 'react-icons/fa6';
import login_img from '../../../images/login1.jpg';
import ChangeLangs from '../../../components/ChangeLangs';
import PhoneInput from '../../../components/shared/PhoneInput';
import PasswordField, { checkPassword } from '../../../components/shared/PasswordField';
import { formatPhoneNumber } from '../../../tools/formatters';
import { send_reset_code, change_password } from '../../../host/requests/AuthRequest';
import useDocumentTitle from '../../../tools/useDocumentTitle';

/**
 * Parolni tiklash — alohida sahifa (/reset-password), UCH bosqichli.
 *
 *   1) 'phone'    — telefon raqam → SMS kod yuboriladi
 *   2) 'code'     — SMS kodni kiritish
 *   3) 'password' — yangi parol kiritish → parol almashtiriladi
 *   +) 'done'     — muvaffaqiyat, login sahifasiga o'tish
 *
 * Har bir bosqich alohida ko'rinadi (bittada bitta ish), tepada 3 nuqtali
 * bosqich ko'rsatkichi. Kodning haqiqiyligi yakuniy `change-password` da
 * tekshiriladi (alohida verify endpoint yo'q) — noto'g'ri bo'lsa kod
 * bosqichiga qaytish mumkin.
 */

const RESEND_SECONDS = 60;
const STEP_ORDER = ['phone', 'code', 'password'];

export default function ResetPassword() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [form] = Form.useForm();
    useDocumentTitle(t('reset_password', { defaultValue: 'Parolni tiklash' }));

    const [step, setStep] = useState('phone');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [phone, setPhone] = useState('');
    const [resend, setResend] = useState(0);
    const timerRef = useRef(null);

    useEffect(() => () => clearInterval(timerRef.current), []);

    const startResendTimer = () => {
        setResend(RESEND_SECONDS);
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setResend((s) => {
                if (s <= 1) { clearInterval(timerRef.current); return 0; }
                return s - 1;
            });
        }, 1000);
    };

    // ── 1-bosqich: telefon → kod yuborish ────────────────────────────────
    const handleSendCode = async () => {
        setError(null);
        try {
            const values = await form.validateFields(['phone']);
            setLoading(true);
            await send_reset_code({ phoneNumber: formatPhoneNumber(values.phone) });
            setPhone(values.phone);
            setStep('code');
            startResendTimer();
        } catch (err) {
            if (err?.errorFields) return;
            setError(t(err?.response?.data?.message || 'something_went_wrong_try_again'));
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (resend > 0 || loading) return;
        setError(null);
        try {
            setLoading(true);
            await send_reset_code({ phoneNumber: formatPhoneNumber(phone) });
            startResendTimer();
        } catch (err) {
            setError(t(err?.response?.data?.message || 'something_went_wrong_try_again'));
        } finally {
            setLoading(false);
        }
    };

    // ── 2-bosqich: kod → parol bosqichiga o'tish ─────────────────────────
    const handleVerifyStep = async () => {
        setError(null);
        try {
            await form.validateFields(['code']);
            setStep('password');
        } catch (err) {
            if (err?.errorFields) return;
        }
    };

    // ── 3-bosqich: yangi parol → almashtirish ────────────────────────────
    const handleReset = async () => {
        setError(null);
        try {
            const values = await form.validateFields(['newPassword']);
            if (!checkPassword(values.newPassword).valid) {
                setError(t('pw_requirements_not_met', { defaultValue: 'Yangi parol quyidagi talablarga javob berishi kerak.' }));
                return;
            }
            setLoading(true);
            await change_password({
                phoneNumber: formatPhoneNumber(phone),
                code: form.getFieldValue('code'),
                newPassword: values.newPassword,
            });
            setStep('done');
        } catch (err) {
            if (err?.errorFields) return;
            const msg = err?.response?.data?.message;
            setError(t(msg || 'something_went_wrong_try_again'));
            // Kod noto'g'ri/muddati o'tgan bo'lsa — kod bosqichiga qaytaramiz
            if (msg === 'invalid_or_expired_code') setStep('code');
        } finally {
            setLoading(false);
        }
    };

    const stepMeta = {
        phone:    { icon: <FaMobileScreenButton />, title: t('reset_step_phone_title', { defaultValue: 'Telefon raqamingiz' }) },
        code:     { icon: <FaShieldHalved />,       title: t('reset_step_code_title', { defaultValue: 'Tasdiqlash kodi' }) },
        password: { icon: <FaLock />,               title: t('reset_step_password_title', { defaultValue: 'Yangi parol' }) },
        done:     { icon: <FaCircleCheck />,        title: t('reset_done_title', { defaultValue: 'Parol yangilandi' }) },
    }[step];

    const activeIndex = STEP_ORDER.indexOf(step); // done → -1

    return (
        <div className="login_box reset_page">
            <div className="login_form_box">
                <div className="auth_lang">
                    <ChangeLangs />
                </div>

                <div className="login_form reset_page_form">
                    {/* 3 nuqtali bosqich ko'rsatkichi */}
                    <div className="reset-steps">
                        {STEP_ORDER.map((s, i) => {
                            const done = step === 'done' || i < activeIndex;
                            const active = i === activeIndex;
                            return (
                                <React.Fragment key={s}>
                                    {i > 0 && <span className={`reset-step-line ${done ? 'is-done' : ''}`} />}
                                    <span className={`reset-step ${done ? 'is-done' : active ? 'is-active' : ''}`}>
                                        {done ? <FaCircleCheck /> : i + 1}
                                    </span>
                                </React.Fragment>
                            );
                        })}
                    </div>

                    <div className="reset-page-head">
                        <span className={`reset-modal-badge ${step === 'done' ? 'is-done' : ''}`}>
                            {stepMeta.icon}
                        </span>
                        <h1 className="reset-page-title">{stepMeta.title}</h1>
                    </div>

                    <div className="login_form_form reset_page_body">
                        {error ? (
                            <Alert type="error" showIcon message={error} style={{ marginBottom: 16, borderRadius: 10 }} />
                        ) : null}

                        <Form form={form} layout="vertical" requiredMark={false}>
                            {/* ── 1-bosqich: telefon ── */}
                            {step === 'phone' && (
                                <>
                                    <Form.Item
                                        name="phone"
                                        label={t('phone_number', { defaultValue: 'Telefon raqam' })}
                                        rules={[
                                            { required: true, message: t('phone_required') },
                                            { len: 19, message: t('phone_number_invalid') },
                                        ]}
                                    >
                                        <PhoneInput withIcon />
                                    </Form.Item>
                                    <p className="reset-modal-hint">
                                        {t('reset_code_hint', { defaultValue: 'Telefon raqamingizni kiriting — unga tasdiqlash kodi SMS orqali yuboriladi.' })}
                                    </p>
                                    <Button className="btn_form" block htmlType="button" loading={loading} onClick={handleSendCode}>
                                        {t('send_code', { defaultValue: 'Kodni yuborish' })}
                                    </Button>
                                </>
                            )}

                            {/* ── 2-bosqich: SMS kod ── */}
                            {step === 'code' && (
                                <>
                                    <p className="reset-modal-hint">
                                        {t('reset_code_sent_to', { phone, defaultValue: '{{phone}} raqamiga yuborilgan 4 xonali kodni kiriting.' })}
                                    </p>
                                    <Form.Item
                                        name="code"
                                        initialValue=""
                                        label={t('verification_code', { defaultValue: 'Tasdiqlash kodi' })}
                                        rules={[
                                            { required: true, message: t('not_empty') },
                                            { len: 4, message: t('code_len_invalid', { defaultValue: 'Kod 4 xonali bo\'lishi kerak' }) },
                                        ]}
                                    >
                                        <input
                                            className="reset-otp-input"
                                            inputMode="numeric"
                                            autoComplete="one-time-code"
                                            maxLength={4}
                                            placeholder="••••"
                                            autoFocus
                                            onChange={(e) => {
                                                const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                                                form.setFieldsValue({ code: digits });
                                            }}
                                        />
                                    </Form.Item>

                                    <div className="reset-modal-resend">
                                        {resend > 0 ? (
                                            <span className="reset-modal-resend-wait">
                                                {t('resend_in', { seconds: resend, defaultValue: 'Qayta yuborish: {{seconds}} s' })}
                                            </span>
                                        ) : (
                                            <button type="button" className="reset-modal-link" onClick={handleResend} disabled={loading}>
                                                {t('resend_code', { defaultValue: 'Kodni qayta yuborish' })}
                                            </button>
                                        )}
                                    </div>

                                    <Button className="btn_form" block htmlType="button" onClick={handleVerifyStep}>
                                        {t('continue_next', { defaultValue: 'Davom etish' })}
                                    </Button>
                                    <button type="button" className="reset-modal-link reset-modal-back" onClick={() => { setError(null); setStep('phone'); }}>
                                        {t('step_back', { defaultValue: 'Orqaga' })}
                                    </button>
                                </>
                            )}

                            {/* ── 3-bosqich: yangi parol ── */}
                            {step === 'password' && (
                                <>
                                    <Form.Item
                                        name="newPassword"
                                        label={t('new_password', { defaultValue: 'Yangi parol' })}
                                        rules={[{ required: true, message: t('please_enter_password') }]}
                                    >
                                        <PasswordField placeholder={t('enter_new_password', { defaultValue: 'Yangi parol yarating' })} />
                                    </Form.Item>
                                    <Button className="btn_form" block htmlType="button" loading={loading} onClick={handleReset}>
                                        {t('save', { defaultValue: 'Saqlash' })}
                                    </Button>
                                    <button type="button" className="reset-modal-link reset-modal-back" onClick={() => { setError(null); setStep('code'); }}>
                                        {t('step_back', { defaultValue: 'Orqaga' })}
                                    </button>
                                </>
                            )}

                            {/* ── Muvaffaqiyat ── */}
                            {step === 'done' && (
                                <div className="reset-modal-done">
                                    <p className="reset-modal-done-text">
                                        {t('reset_done_desc', { defaultValue: 'Parolingiz muvaffaqiyatli yangilandi. Endi yangi parol bilan tizimga kirishingiz mumkin.' })}
                                    </p>
                                    <Button className="btn_form" block htmlType="button" onClick={() => navigate('/login')}>
                                        {t('go_to_login', { defaultValue: 'Tizimga kirish' })}
                                    </Button>
                                </div>
                            )}
                        </Form>
                    </div>
                </div>

                <div className="login_bottom">
                    <Link to="/login" className="reset-modal-link">
                        {t('back_to_login', { defaultValue: 'Tizimga kirishga qaytish' })}
                    </Link>
                </div>
            </div>

            <div className="login_img">
                <img src={login_img} alt="reset decorative" />
            </div>
        </div>
    );
}
