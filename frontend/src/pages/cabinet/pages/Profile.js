import React, { useState } from 'react'
import { Alert, Avatar, Button, Card, Col, Descriptions, Form, Input, Row, Steps, Tag, Typography } from 'antd'
import { LockOutlined, SafetyOutlined, UserOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../../store/Store'
import { send_reset_code, change_password } from '../../../host/requests/AuthRequest'
import { successAlert, dangerAlert } from '../../../tools/Alerts'
import { formatPhoneNumberForForm, personName } from '../../../tools/formatters'
import { buildFileUrl } from '../../../host/Host'
import RoleConstants from '../../../tools/roles'
import useDocumentTitle from '../../../tools/useDocumentTitle';
import maleStaff from '../../../images/avatars/male.jpg'
import femaleStaff from '../../../images/avatars/female.jpg'
import { useLocation } from 'react-router-dom';

const { Text, Title } = Typography

/**
 * Shaxsiy kabinet sahifasi.
 *
 * Ilgari foydalanuvchi ma'lumotlari faqat modal oyna orqali ko'rinardi va
 * **parolni o'zgartirish imkoniyati kabinet ichida umuman yo'q edi** —
 * parolni almashtirish uchun tizimdan chiqib, kirish sahifasidagi
 * "parolni unutdingizmi?" oqimidan foydalanish kerak edi.
 *
 * Parol almashtirish SMS kod bilan tasdiqlanadi (backend `change-password`
 * endpointi shu tarzda ishlaydi) — bu o'g'irlangan seans orqali parolni
 * almashtirib qo'yishning oldini oladi.
 */
export default function Profile() {
    const { t } = useTranslation()
    useDocumentTitle(t('self_data', { defaultValue: "Shaxsiy ma'lumotlar" }))
    const { user } = useStore()
    const [form] = Form.useForm()

    const [step, setStep] = useState(0)      // 0 — kod so'rash, 1 — kod va yangi parol

    // Vaqtinchalik parol bilan kirgan foydalanuvchi shu manzilga
    // yo'naltiriladi (T-022). Bunday holatda nima uchun bu yerga
    // tushgani tushuntiriladi — aks holda u sahifani tasodifan
    // ochilgan deb o'ylaydi.
    const mustChangePassword = new URLSearchParams(useLocation().search)
        .get('changePassword') === '1'
    const [sending, setSending] = useState(false)
    const [saving, setSaving] = useState(false)

    const doctor = user?.doctor
    const phone = doctor?.phone || user?.phone
    const fio = personName(doctor)

    const handleSendCode = async () => {
        if (!phone) {
            dangerAlert(t('phone_not_found', { defaultValue: 'Telefon raqam topilmadi' }))
            return
        }
        setSending(true)
        try {
            await send_reset_code({ phoneNumber: phone })
            successAlert(t('code_sent_to_phone', { defaultValue: 'Tasdiqlash kodi telefoningizga yuborildi' }))
            setStep(1)
        } catch (err) {
            dangerAlert(
                err?.response?.data?.message ||
                t('code_send_failed', { defaultValue: 'Kod yuborib bo\'lmadi' })
            )
        } finally {
            setSending(false)
        }
    }

    const handleChangePassword = async (values) => {
        setSaving(true)
        try {
            await change_password({
                phoneNumber: phone,
                code: values.code,
                newPassword: values.newPassword,
            })
            successAlert(t('password_changed', { defaultValue: 'Parol o\'zgartirildi' }))
            form.resetFields()
            setStep(0)
        } catch (err) {
            dangerAlert(
                err?.response?.data?.message ||
                t('password_change_failed', { defaultValue: 'Parolni o\'zgartirib bo\'lmadi' })
            )
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="main_card">
            <h1><span>{t('self_data', { defaultValue: 'Shaxsiy ma\'lumotlar' })}</span></h1>

            <div className="main_card_content big_card_content">
                <Row gutter={[16, 16]}>

                    <Col xs={24} lg={12}>
                        <Card size="small" title={t('self_data', { defaultValue: 'Shaxsiy ma\'lumotlar' })}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                                {/* Zaxira rasm header bilan bir xil bo'lsin:
                                    ilgari bu yerda umumiy ikonka, header'da esa
                                    jinsga mos rasm ko'rinardi */}
                                <Avatar
                                    size={64}
                                    icon={<UserOutlined />}
                                    src={doctor?.avatar
                                        ? buildFileUrl(doctor.avatar)
                                        : (doctor?.gender === false ? femaleStaff : maleStaff)}
                                />
                                <div>
                                    <Title level={5} style={{ margin: 0 }}>{fio || '—'}</Title>
                                    <Tag color="blue" style={{ marginTop: 6 }}>
                                        {RoleConstants.name(user?.roleId, t)}
                                    </Tag>
                                </div>
                            </div>

                            <Descriptions column={1} size="small" bordered>
                                <Descriptions.Item label={t('phone_number')}>
                                    {phone ? formatPhoneNumberForForm(phone) : '—'}
                                </Descriptions.Item>
                                <Descriptions.Item label={t('clinic', { defaultValue: 'Klinika' })}>
                                    {user?.clinic?.clinicName || '—'}
                                </Descriptions.Item>
                                <Descriptions.Item label={t('clinic_status', { defaultValue: 'Klinika holati' })}>
                                    {user?.clinic?.isActive
                                        ? <Tag color="success">{t('active', { defaultValue: 'Faol' })}</Tag>
                                        : <Tag color="warning">{t('not_active', { defaultValue: 'Faol emas' })}</Tag>}
                                </Descriptions.Item>
                            </Descriptions>
                        </Card>
                    </Col>

                    <Col xs={24} lg={12}>
                        <Card
                            size="small"
                            title={
                                <span><LockOutlined /> {t('change_password', { defaultValue: 'Parolni o\'zgartirish' })}</span>
                            }
                        >
                            {/* Vaqtinchalik parol bilan kirgan foydalanuvchiga
                                nima uchun bu yerga tushgani tushuntiriladi (T-022) */}
                            {mustChangePassword ? (
                                <Alert
                                    type="warning"
                                    showIcon
                                    style={{ marginBottom: 16 }}
                                    message={t('must_change_password_banner', {
                                        defaultValue: 'Vaqtinchalik parolni almashtiring'
                                    })}
                                    description={t('must_change_password_hint', {
                                        defaultValue: "Hozirgi parolni administrator qo'ygan va uni kamida ikki kishi biladi. Faqat o'zingiz biladigan parol qo'ying."
                                    })}
                                />
                            ) : null}

                            <Steps
                                size="small"
                                current={step}
                                style={{ marginBottom: 20 }}
                                items={[
                                    { title: t('confirm_by_sms', { defaultValue: 'SMS tasdiqlash' }) },
                                    { title: t('new_password', { defaultValue: 'Yangi parol' }) },
                                ]}
                            />

                            {step === 0 ? (
                                <>
                                    <Text type="secondary" style={{ display: 'block', marginBottom: 14 }}>
                                        {t('change_password_hint', {
                                            defaultValue: 'Parolni almashtirish uchun telefoningizga tasdiqlash kodi yuboriladi.',
                                        })}
                                        {phone ? ` (${formatPhoneNumberForForm(phone)})` : ''}
                                    </Text>
                                    <Button
                                        type="primary"
                                        icon={<SafetyOutlined />}
                                        loading={sending}
                                        onClick={handleSendCode}
                                        disabled={!phone}
                                    >
                                        {t('send_code', { defaultValue: 'Kodni yuborish' })}
                                    </Button>
                                </>
                            ) : (
                                <Form form={form} layout="vertical" onFinish={handleChangePassword}>
                                    <Form.Item
                                        name="code"
                                        label={t('sms_code', { defaultValue: 'SMS kod' })}
                                        rules={[{ required: true, message: t('field_required', { defaultValue: 'Maydonni to\'ldiring' }) }]}
                                    >
                                        <Input maxLength={6} placeholder="123456" />
                                    </Form.Item>

                                    <Form.Item
                                        name="newPassword"
                                        label={t('new_password', { defaultValue: 'Yangi parol' })}
                                        rules={[
                                            { required: true, message: t('field_required', { defaultValue: 'Maydonni to\'ldiring' }) },
                                            { min: 8, message: t('password_min_8', { defaultValue: 'Kamida 8 belgi' }) },
                                        ]}
                                    >
                                        <Input.Password />
                                    </Form.Item>

                                    <Form.Item
                                        name="confirmPassword"
                                        label={t('confirm_password', { defaultValue: 'Parolni takrorlang' })}
                                        dependencies={['newPassword']}
                                        rules={[
                                            { required: true, message: t('field_required', { defaultValue: 'Maydonni to\'ldiring' }) },
                                            ({ getFieldValue }) => ({
                                                validator(_, value) {
                                                    if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
                                                    return Promise.reject(new Error(
                                                        t('passwords_do_not_match', { defaultValue: 'Parollar mos kelmadi' })
                                                    ))
                                                },
                                            }),
                                        ]}
                                    >
                                        <Input.Password />
                                    </Form.Item>

                                    <Button type="primary" htmlType="submit" loading={saving}>
                                        {t('save', { defaultValue: 'Saqlash' })}
                                    </Button>
                                    <Button type="text" onClick={() => setStep(0)} style={{ marginLeft: 8 }}>
                                        {t('back', { defaultValue: 'Orqaga' })}
                                    </Button>
                                </Form>
                            )}
                        </Card>
                    </Col>

                </Row>
            </div>
        </div>
    )
}
