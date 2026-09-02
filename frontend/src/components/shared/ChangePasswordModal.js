import React, { useState, useEffect, useRef } from 'react'
import { Modal, Form, Button, Input, Alert } from 'antd'
import { useTranslation } from 'react-i18next'
import { FaMobileScreenButton, FaShieldHalved, FaLock, FaCircleCheck } from 'react-icons/fa6'
import { send_reset_code, change_password } from '../../host/requests/AuthRequest'
import PasswordField, { checkPassword } from './PasswordField'
import { successAlert } from '../../tools/Alerts'
import { formatPhoneNumberForForm } from '../../tools/formatters'

const RESEND_SECONDS = 60
const STEP_ORDER = ['send', 'code', 'password']

/**
 * Parolni o'zgartirish — bosqichma-bosqich modal (SMS tasdiqlash bilan).
 *
 *   1) 'send'     — telefon raqamga SMS kod yuboriladi
 *   2) 'code'     — 4 xonali SMS kod kiritiladi
 *   3) 'password' — yangi parol kiritiladi → parol almashtiriladi
 *   +) 'done'     — muvaffaqiyat
 *
 * Har bosqichda bitta ish — ilgari hammasi bitta ekranga tiqilib, chalkash edi.
 */
export default function ChangePasswordModal({ open, onClose, phone }) {
    const { t } = useTranslation()
    const [form] = Form.useForm()
    const [step, setStep] = useState('send')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [resend, setResend] = useState(0)
    const [resendLoading, setResendLoading] = useState(false)
    const timerRef = useRef(null)

    useEffect(() => () => clearInterval(timerRef.current), [])

    // Modal ochilganda holatni boshidan boshlaymiz
    useEffect(() => {
        if (open) {
            setStep('send'); setError(null); setResend(0)
            clearInterval(timerRef.current); form.resetFields()
        }
    }, [open, form])

    const startTimer = () => {
        setResend(RESEND_SECONDS)
        clearInterval(timerRef.current)
        timerRef.current = setInterval(() => {
            setResend((s) => { if (s <= 1) { clearInterval(timerRef.current); return 0 } return s - 1 })
        }, 1000)
    }

    // ── 1-bosqich: kod yuborish ──
    const handleSend = async () => {
        setError(null)
        if (!phone) { setError(t('phone_not_found', { defaultValue: 'Telefon raqam topilmadi' })); return }
        setLoading(true)
        try {
            await send_reset_code({ phoneNumber: phone })
            startTimer(); setStep('code')
        } catch (err) {
            setError(t(err?.response?.data?.message || 'code_send_failed', { defaultValue: 'Kod yuborib bo\'lmadi' }))
        } finally { setLoading(false) }
    }

    const handleResend = async () => {
        if (resend > 0 || resendLoading || !phone) return
        setError(null); setResendLoading(true)
        try {
            await send_reset_code({ phoneNumber: phone })
            startTimer(); form.resetFields(['code']); successAlert(t('code_resent', { defaultValue: 'Kod qayta yuborildi' }))
        } catch (err) {
            setError(t(err?.response?.data?.message || 'code_send_failed', { defaultValue: 'Kod yuborib bo\'lmadi' }))
        } finally { setResendLoading(false) }
    }

    // ── 2-bosqich: kod → parol bosqichiga ──
    const handleCodeNext = async () => {
        setError(null)
        try { await form.validateFields(['code']); setStep('password') }
        catch (e) { /* validatsiya xatosi maydon ostida ko'rinadi */ }
    }

    // ── 3-bosqich: yangi parol → almashtirish ──
    const handleChange = async () => {
        setError(null)
        try {
            const values = await form.validateFields(['newPassword', 'confirmPassword'])
            if (!checkPassword(values.newPassword).valid) {
                setError(t('pw_requirements_not_met', { defaultValue: 'Parol talablarga javob bermaydi.' }))
                return
            }
            setLoading(true)
            await change_password({
                phoneNumber: phone,
                code: form.getFieldValue('code'),
                newPassword: values.newPassword,
            })
            setStep('done')
        } catch (err) {
            if (err?.errorFields) return
            const msg = err?.response?.data?.message
            setError(t(msg || 'password_change_failed', { defaultValue: 'Parolni o\'zgartirib bo\'lmadi' }))
            // Kod noto'g'ri/muddati o'tgan bo'lsa — kod bosqichiga qaytaramiz
            if (msg === 'invalid_or_expired_code' || msg === 'code_invalid') setStep('code')
        } finally { setLoading(false) }
    }

    const meta = {
        send: { icon: <FaMobileScreenButton />, title: t('change_password', { defaultValue: 'Parolni o\'zgartirish' }) },
        code: { icon: <FaShieldHalved />, title: t('verification_code', { defaultValue: 'Tasdiqlash kodi' }) },
        password: { icon: <FaLock />, title: t('new_password', { defaultValue: 'Yangi parol' }) },
        done: { icon: <FaCircleCheck />, title: t('password_changed', { defaultValue: 'Parol o\'zgartirildi' }) },
    }[step]

    const activeIndex = STEP_ORDER.indexOf(step) // done → -1

    return (
        <Modal open={open} onCancel={onClose} footer={null} centered width={420} className="sms-verify-modal">
            <div className="sms-verify">
                <span className={`reset-modal-badge sms-verify-badge ${step === 'done' ? 'is-done' : ''}`}>
                    {meta.icon}
                </span>

                {/* 3 nuqtali bosqich ko'rsatkichi */}
                <div className="reset-steps" style={{ margin: '0 auto 16px' }}>
                    {STEP_ORDER.map((s, i) => {
                        const done = step === 'done' || i < activeIndex
                        const active = i === activeIndex
                        return (
                            <React.Fragment key={s}>
                                {i > 0 && <span className={`reset-step-line ${done ? 'is-done' : ''}`} />}
                                <span className={`reset-step ${done ? 'is-done' : active ? 'is-active' : ''}`}>
                                    {done ? <FaCircleCheck /> : i + 1}
                                </span>
                            </React.Fragment>
                        )
                    })}
                </div>

                <h2 className="sms-verify-title">{meta.title}</h2>

                {error ? <Alert type="error" showIcon message={error} style={{ margin: '0 0 14px', borderRadius: 10, textAlign: 'left' }} /> : null}

                <Form form={form} className="sms-verify-form" layout="vertical" requiredMark={false}>
                    {/* ── 1-bosqich: kod yuborish ── */}
                    {step === 'send' && (
                        <>
                            <p className="sms-verify-hint">
                                {t('change_password_hint2', { defaultValue: 'Parolni almashtirish uchun quyidagi raqamga 4 xonali tasdiqlash kodi yuboriladi:' })}
                            </p>
                            <div className="sms-verify-phone">{phone ? formatPhoneNumberForForm(phone) : '—'}</div>
                            <Button className="btn_form" block loading={loading} disabled={!phone} onClick={handleSend}>
                                {t('send_code', { defaultValue: 'Kodni yuborish' })}
                            </Button>
                        </>
                    )}

                    {/* ── 2-bosqich: SMS kod ── */}
                    {step === 'code' && (
                        <>
                            <p className="sms-verify-hint">
                                {t('code_sent_to', { phone: formatPhoneNumberForForm(phone), defaultValue: '{{phone}} raqamiga yuborilgan 4 xonali kodni kiriting.' })}
                            </p>
                            <Form.Item name="code" style={{ marginBottom: 0 }}
                                rules={[
                                    { required: true, message: t('not_empty', { defaultValue: 'Bo\'sh bo\'lmasin' }) },
                                    { len: 4, message: t('code_len_invalid', { defaultValue: 'Kod 4 xonali bo\'lishi kerak' }) },
                                ]}>
                                <Input.OTP length={4} size="large" inputMode="numeric" autoFocus
                                    formatter={(v) => v.replace(/\D/g, '')}
                                    onChange={(val) => { if (val?.length === 4) handleCodeNext() }} />
                            </Form.Item>

                            <div className="reset-modal-resend sms-verify-resend">
                                {resend > 0 ? (
                                    <span className="reset-modal-resend-wait">
                                        {t('resend_in', { seconds: resend, defaultValue: 'Qayta yuborish: {{seconds}} s' })}
                                    </span>
                                ) : (
                                    <button type="button" className="reset-modal-link" onClick={handleResend} disabled={resendLoading}>
                                        {resendLoading ? t('sending', { defaultValue: 'Yuborilmoqda…' }) : t('resend_code', { defaultValue: 'Kodni qayta yuborish' })}
                                    </button>
                                )}
                            </div>

                            <Button className="btn_form" block onClick={handleCodeNext}>
                                {t('continue_next', { defaultValue: 'Davom etish' })}
                            </Button>
                            <button type="button" className="reset-modal-link reset-modal-back" onClick={() => { setError(null); setStep('send') }}>
                                {t('step_back', { defaultValue: 'Orqaga' })}
                            </button>
                        </>
                    )}

                    {/* ── 3-bosqich: yangi parol ── */}
                    {step === 'password' && (
                        <>
                            <Form.Item name="newPassword" label={t('new_password', { defaultValue: 'Yangi parol' })}
                                rules={[{ required: true, message: t('please_enter_password', { defaultValue: 'Parol kiriting' }) }]}>
                                <PasswordField placeholder={t('enter_new_password', { defaultValue: 'Yangi parol yarating' })} />
                            </Form.Item>
                            <Form.Item name="confirmPassword" label={t('confirm_password', { defaultValue: 'Parolni takrorlang' })}
                                dependencies={['newPassword']}
                                rules={[
                                    { required: true, message: t('field_required', { defaultValue: 'Maydonni to\'ldiring' }) },
                                    ({ getFieldValue }) => ({
                                        validator(_, value) {
                                            if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
                                            return Promise.reject(new Error(t('passwords_do_not_match', { defaultValue: 'Parollar mos kelmadi' })))
                                        },
                                    }),
                                ]}>
                                <Input.Password placeholder={t('repeat_new_password', { defaultValue: 'Yangi parolni qayta kiriting' })} />
                            </Form.Item>
                            <Button className="btn_form" block loading={loading} onClick={handleChange}>
                                {t('save', { defaultValue: 'Saqlash' })}
                            </Button>
                            <button type="button" className="reset-modal-link reset-modal-back" onClick={() => { setError(null); setStep('code') }}>
                                {t('step_back', { defaultValue: 'Orqaga' })}
                            </button>
                        </>
                    )}

                    {/* ── Muvaffaqiyat ── */}
                    {step === 'done' && (
                        <>
                            <p className="sms-verify-hint">
                                {t('password_changed_desc', { defaultValue: 'Parolingiz muvaffaqiyatli o\'zgartirildi.' })}
                            </p>
                            <Button className="btn_form" block onClick={onClose}>
                                {t('close', { defaultValue: 'Yopish' })}
                            </Button>
                        </>
                    )}
                </Form>
            </div>
        </Modal>
    )
}
