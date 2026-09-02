import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, Space, Steps, Tag, Typography } from 'antd'
import {
    CheckCircleFilled,
    ClockCircleOutlined,
    MailOutlined,
    PhoneOutlined,
    SendOutlined,
} from '@ant-design/icons'
import { useStore } from '../store/Store'

const { Text, Title, Paragraph } = Typography

/**
 * Shifoxona hali faollashtirilmagan bo'lsa ko'rsatiladigan holat sahifasi.
 *
 * Shifoxonani SuperAdmin bazada qo'lda faollashtiradi — bu ataylab shunday,
 * haqiqiy tibbiy muassasa ekanini tasdiqlash uchun. Muammo faollashtirish
 * tartibida emas, **kutish davridagi tajribada** edi: foydalanuvchi
 * ro'yxatdan o'tishga 10-15 daqiqa sarflab, oxirida "Shifoxonangiz hali
 * faollashtirilmagan" degan bitta jumlani ko'rardi va nima qilish, qancha
 * kutish, kimga murojaat qilish kerakligini bilmasdi.
 *
 * Endi sahifada: qadamlar holati, kutilayotgan muddat, ariza raqami va
 * bog'lanish tugmalari bor.
 */

/** Qo'llab-quvvatlash aloqalari — bir joyda, `.env` orqali o'zgartiriladi. */
const SUPPORT = {
    phone: process.env.REACT_APP_SUPPORT_PHONE || '+998 71 200 00 00',
    email: process.env.REACT_APP_SUPPORT_EMAIL || 'support@nmed.uz',
    telegram: process.env.REACT_APP_SUPPORT_TELEGRAM || 'https://t.me/nmed_support',
}

export default function ClinicActivationGate({ isActive, children }) {
    const { t } = useTranslation()
    const { user } = useStore()

    if (isActive) return children

    const clinic = user?.clinic
    // Ariza raqami — murojaat qilganda operator shifoxonani darhol topishi uchun
    const requestNumber = clinic?.id
        ? `NMED-CL-${String(clinic.id).padStart(6, '0')}`
        : null

    const phoneHref = `tel:${SUPPORT.phone.replace(/[^\d+]/g, '')}`

    return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 16px' }}>
            <Card
                style={{ maxWidth: 720, width: '100%' }}
                styles={{ body: { padding: 32 } }}
            >
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        background: '#E6F7F4',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 16,
                    }}>
                        <ClockCircleOutlined style={{ fontSize: 30, color: '#00B39A' }} />
                    </div>

                    <Title level={4} style={{ marginBottom: 8 }}>
                        {t('clinic_not_active_title')}
                    </Title>

                    <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                        {t('activation_intro', {
                            defaultValue: 'Ma\'lumotlaringiz qabul qilindi. Haqiqiy tibbiy muassasa ekanini tasdiqlash uchun ariza qo\'lda tekshiriladi.',
                        })}
                    </Paragraph>
                </div>

                <Steps
                    direction="vertical"
                    size="small"
                    current={1}
                    style={{ marginBottom: 28 }}
                    items={[
                        {
                            title: t('activation_step_registered', { defaultValue: 'Ro\'yxatdan o\'tildi' }),
                            description: t('activation_step_registered_desc', {
                                defaultValue: 'Shifoxona ma\'lumotlari va admin profili saqlandi',
                            }),
                            status: 'finish',
                            icon: <CheckCircleFilled style={{ color: '#16A34A' }} />,
                        },
                        {
                            title: t('activation_step_review', { defaultValue: 'Tekshiruvda' }),
                            description: t('activation_step_review_desc', {
                                defaultValue: 'Odatda 1 ish kuni ichida ko\'rib chiqiladi',
                            }),
                            status: 'process',
                        },
                        {
                            title: t('activation_step_active', { defaultValue: 'Faollashtirish' }),
                            description: t('activation_step_active_desc', {
                                defaultValue: 'Tasdiqlangach barcha tahlil bo\'limlari ochiladi va sizga xabar beriladi',
                            }),
                            status: 'wait',
                        },
                    ]}
                />

                {requestNumber ? (
                    <div style={{
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: 10,
                        padding: '14px 16px',
                        marginBottom: 20,
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 10,
                    }}>
                        <Text type="secondary">
                            {t('activation_request_number', { defaultValue: 'Ariza raqami' })}:
                        </Text>
                        <Tag color="blue" style={{ fontSize: 14, padding: '2px 10px', margin: 0 }}>
                            {requestNumber}
                        </Tag>
                        {clinic?.clinicName ? (
                            <Text type="secondary">· {clinic.clinicName}</Text>
                        ) : null}
                    </div>
                ) : null}

                <Text strong style={{ display: 'block', marginBottom: 10 }}>
                    {t('activation_contact_title', { defaultValue: 'Savolingiz bormi?' })}
                </Text>

                <Space wrap size={10}>
                    <Button icon={<PhoneOutlined />} href={phoneHref}>
                        {SUPPORT.phone}
                    </Button>
                    <Button icon={<MailOutlined />} href={`mailto:${SUPPORT.email}`}>
                        {SUPPORT.email}
                    </Button>
                    <Button
                        icon={<SendOutlined />}
                        href={SUPPORT.telegram}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Telegram
                    </Button>
                </Space>

                <Paragraph type="secondary" style={{ fontSize: 13, marginTop: 20, marginBottom: 0 }}>
                    💡 {t('waiting_activation_hint')}
                </Paragraph>
            </Card>
        </div>
    )
}
