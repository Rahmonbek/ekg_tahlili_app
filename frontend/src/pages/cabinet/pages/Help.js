import React from 'react'
import { Button, Card, Col, Collapse, Row, Space, Typography } from 'antd'
import { MailOutlined, PhoneOutlined, QuestionCircleOutlined, SendOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import useDocumentTitle from '../../../tools/useDocumentTitle';
import { useTour } from '../../../components/shared/TourProvider';

const { Paragraph, Text, Title } = Typography

/** Qo'llab-quvvatlash aloqalari — `ClinicActivationGate` bilan bir xil manba. */
const SUPPORT = {
    phone: process.env.REACT_APP_SUPPORT_PHONE || '+998 71 200 00 00',
    email: process.env.REACT_APP_SUPPORT_EMAIL || 'support@nmed.uz',
    telegram: process.env.REACT_APP_SUPPORT_TELEGRAM || 'https://t.me/nmed_support',
}

/**
 * Yordam va ko'p so'raladigan savollar.
 *
 * Platformada hech qanday yordam bo'limi yo'q edi: foydalanuvchi savol
 * bilan qolganda kimga murojaat qilishni ham bilmasdi. Sahifadagi savollar
 * auditda aniqlangan haqiqiy chalkashliklarga javob beradi.
 */
export default function Help() {
    const tour = useTour();
    const { t } = useTranslation()
    useDocumentTitle(t('help', { defaultValue: "Yordam" }))

    const faq = [
        {
            key: 'ai-vs-doctor',
            label: t('faq_ai_title', { defaultValue: 'AI xulosasi tashxis o\'rnini bosadimi?' }),
            children: t('faq_ai_body', {
                defaultValue: 'Yo\'q. AI xulosasi — yordamchi vosita. Yakuniy tashxisni faqat malakali shifokor qo\'yadi. Hujjatda ham shu ogohlantirish bosilgan.',
            }),
        },
        {
            key: 'save-vs-ai',
            label: t('faq_save_title', { defaultValue: '"Faqat saqlash" va "AI bilan tahlil" farqi nima?' }),
            children: t('faq_save_body', {
                defaultValue: '"Faqat saqlash" — yozuv yaratiladi, lekin AI ishga tushmaydi; keyinroq yuborish mumkin. "AI bilan tahlil" — fayl darhol sun\'iy intellektga yuboriladi va natija bir necha daqiqada tayyor bo\'ladi.',
            }),
        },
        {
            key: 'colors',
            label: t('faq_colors_title', { defaultValue: 'Ro\'yxatdagi ranglar nimani anglatadi?' }),
            children: t('faq_colors_body', {
                defaultValue: 'Yashil — norma, sariq — o\'rtacha (kuzatuv kerak), qizil — xavfli (shoshilinch e\'tibor). Kulrang "Baholanmadi" — AI aniq daraja bermagan, xulosani albatta shifokor o\'qishi kerak.',
            }),
        },
        {
            key: 'mismatch',
            label: t('faq_mismatch_title', { defaultValue: '"Fayl mos emas" degan xabar chiqdi. Nima qilish kerak?' }),
            children: t('faq_mismatch_body', {
                defaultValue: 'Yuklangan fayl tanlangan tahlil turiga mos kelmagan (masalan laboratoriya bo\'limiga Holter hisoboti yuklangan). AI bunday holatda ataylab xulosa yozmaydi. Tahlilni oching va "Faylni almashtirish" tugmasi orqali to\'g\'ri faylni yuklang — yangi tahlil yaratish shart emas.',
            }),
        },
        {
            key: 'quality',
            label: t('faq_quality_title', { defaultValue: 'Rasm qanday bo\'lishi kerak?' }),
            children: t('faq_quality_body', {
                defaultValue: 'Rasm aniq bo\'lsin, yozuvlar va to\'lqinlar o\'qilsin. Juda kichik (800×600 dan kichik), xira yoki bo\'sh rasm rad etiladi. Fayl hajmi 25 MB dan oshmasin.',
            }),
        },
        {
            key: 'roles',
            label: t('faq_roles_title', { defaultValue: 'Nima uchun men hamma tahlillarni ko\'rmayapman?' }),
            children: t('faq_roles_body', {
                defaultValue: 'Ko\'rish huquqi rolga bog\'liq. Admin va Direktor klinikaning barcha tahlillarini ko\'radi. Shifokor — faqat o\'ziga biriktirilganlarini. Hamshira — faqat o\'zi yaratganlarini. Tahlil yaratishda "Davolovchi shifokorlar" maydoni aynan shuni belgilaydi.',
            }),
        },
        {
            key: 'delete',
            label: t('faq_delete_title', { defaultValue: 'Noto\'g\'ri yaratilgan tahlilni o\'chirish mumkinmi?' }),
            children: t('faq_delete_body', {
                defaultValue: 'Ha, Admin va Direktor o\'chira oladi. Sabab ko\'rsatish majburiy. Yozuv bazadan butunlay o\'chirilmaydi — kim, qachon va nima sababdan o\'chirgani jurnalda saqlanadi va zarurat bo\'lsa tiklanadi.',
            }),
        },
        {
            key: 'qr',
            label: t('faq_qr_title', { defaultValue: 'Hujjatdagi QR kod nima uchun kerak?' }),
            children: t('faq_qr_body', {
                defaultValue: 'QR kod orqali hujjatning haqiqiyligini tekshirish mumkin — u NMED platformasida shakllantirilganini tasdiqlaydi. Tekshirish sahifasida bemorning to\'liq ma\'lumotlari ko\'rsatilmaydi, faqat bosh harflari — maxfiylik uchun.',
            }),
        },
        {
            key: 'activation',
            label: t('faq_activation_title', { defaultValue: 'Klinikam faollashtirilmagan. Qancha kutish kerak?' }),
            children: t('faq_activation_body', {
                defaultValue: 'Ariza odatda 1 ish kuni ichida ko\'rib chiqiladi. Tekshiruv haqiqiy tibbiy muassasa ekanini tasdiqlash uchun kerak. Faollashtirilgach sizga xabar beriladi. Shoshilinch bo\'lsa ariza raqamingiz bilan qo\'llab-quvvatlashga murojaat qiling.',
            }),
        },
    ]

    return (
        <div className="main_card">
            <h1><span>{t('help', { defaultValue: 'Yordam' })}</span></h1>

            <div className="main_card_content big_card_content">
                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={15}>
                        <Card size="small" title={t('faq', { defaultValue: 'Ko\'p so\'raladigan savollar' })}>
                            <Collapse accordion ghost items={faq} />
                        </Card>
                    </Col>

                    <Col xs={24} lg={9}>
                        <Card size="small" title={t('page_guide', { defaultValue: "Sahifa bo'yicha qo'llanma" })}>
                            <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 12 }}>
                                {t('help_tour_desc')}
                            </Paragraph>
                            {/* Qo'llanma tugmasi header'da; bu yerdan ham
                                to'g'ridan-to'g'ri ochish mumkin */}
                            <Button
                                type="primary"
                                ghost
                                icon={<QuestionCircleOutlined />}
                                onClick={tour.start}
                                disabled={!tour.available}
                            >
                                {t('start_page_guide', { defaultValue: "Shu sahifa qo'llanmasini ochish" })}
                            </Button>
                        </Card>

                        <Card
                            size="small"
                            style={{ marginTop: 16 }}
                            title={t('activation_contact_title', { defaultValue: 'Savolingiz bormi?' })}
                        >
                            <Space direction="vertical" style={{ width: '100%' }}>
                                <Button block icon={<PhoneOutlined />} href={`tel:${SUPPORT.phone.replace(/[^\d+]/g, '')}`}>
                                    {SUPPORT.phone}
                                </Button>
                                <Button block icon={<MailOutlined />} href={`mailto:${SUPPORT.email}`}>
                                    {SUPPORT.email}
                                </Button>
                                <Button block icon={<SendOutlined />} href={SUPPORT.telegram} target="_blank" rel="noopener noreferrer">
                                    Telegram
                                </Button>
                            </Space>
                        </Card>
                    </Col>
                </Row>
            </div>
        </div>
    )
}
