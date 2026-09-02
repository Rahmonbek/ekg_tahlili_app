import React from 'react'
import { Alert, Button, Card, Col, Collapse, Row, Space, Timeline, Typography } from 'antd'
import {
    MailOutlined, PhoneOutlined, QuestionCircleOutlined, SendOutlined,
    TeamOutlined, VideoCameraOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import useDocumentTitle from '../../../tools/useDocumentTitle';
import { useTour } from '../../../components/shared/TourProvider';
import { useStore } from '../../../store/Store'
import RoleConstants from '../../../tools/roles'

const { Paragraph, Text } = Typography

/** Qo'llab-quvvatlash aloqalari — `ClinicActivationGate` bilan bir xil manba. */
const SUPPORT = {
    phone: process.env.REACT_APP_SUPPORT_PHONE || '+998 71 200 00 00',
    email: process.env.REACT_APP_SUPPORT_EMAIL || 'support@nmed.uz',
    telegram: process.env.REACT_APP_SUPPORT_TELEGRAM || 'https://t.me/nmed_support',
}

// Bitta qadam — sarlavha + tavsif (Timeline ichida ko'rsatiladi)
const Step = ({ title, children }) => (
    <div>
        <Text strong style={{ display: 'block', marginBottom: 2 }}>{title}</Text>
        <Text type="secondary" style={{ fontSize: 13 }}>{children}</Text>
    </div>
)

/**
 * Yordam, qo'llanma va ko'p so'raladigan savollar.
 *
 * Sahifada uch qism bor:
 *  1) Onlayn konsultatsiya va video konferensiya bo'yicha bosqichma-bosqich
 *     qo'llanma — foydalanuvchi roliga qarab (Admin/Direktor yoki Shifokor).
 *  2) Ko'p so'raladigan savollar (FAQ) — auditda aniqlangan haqiqiy
 *     chalkashliklarga to'liq javoblar.
 *  3) Qo'llab-quvvatlash aloqalari.
 */
export default function Help() {
    const tour = useTour();
    const { t } = useTranslation()
    const { user } = useStore()
    useDocumentTitle(t('help', { defaultValue: "Yordam" }))

    const isManager = RoleConstants.isClinicManager(user?.roleId) // Admin yoki Direktor
    const isDoctor = user?.roleId === RoleConstants.DOCTOR

    // ── Admin / Direktor (bosh shifokor) uchun konsultatsiya qadamlari ──
    const managerSteps = [
        {
            color: '#0EA5A4',
            children: (
                <Step title={t('guide_m_step1_t', { defaultValue: '1-qadam. Konsultant shifokorlarni yig\'ing' })}>
                    {t('guide_m_step1_b', { defaultValue: 'Yon menyudan "Konsultantlar" bo\'limiga kiring → "Konsultant qo\'shish" → shifokorni ism yoki telefon raqami bo\'yicha qidiring → "Taklif qilish". Taklif qilingan shifokor uni qabul qilgandan keyingina sizning konsultantlaringiz ro\'yxatiga qo\'shiladi va unga konsultatsiya yubora olasiz.' })}
                </Step>
            ),
        },
        {
            color: '#0EA5A4',
            children: (
                <Step title={t('guide_m_step2_t', { defaultValue: '2-qadam. Yangi konsultatsiya yarating' })}>
                    {t('guide_m_step2_b', { defaultValue: '"Konsultatsiyalar" bo\'limi → "Yangi konsultatsiya". Konsultant shifokorni tanlang, bemorni tanlang (yoki yangi bemor qo\'shing) va bemorning kerakli tahlilini (EKG, Holter, SMAD yoki laboratoriya) biriktiring. Yuborilgach, so\'rov "Yaratildi" holatida konsultantga jo\'natiladi.' })}
                </Step>
            ),
        },
        {
            color: '#F59E0B',
            children: (
                <Step title={t('guide_m_step3_t', { defaultValue: '3-qadam. Konsultant javobini kuting' })}>
                    {t('guide_m_step3_b', { defaultValue: 'Konsultant so\'rovni qabul qilsa — holat "Ko\'rib chiqilmoqda"ga o\'tadi; rad etsa — "Rad etilgan" (sabab bilan) bo\'ladi. Yangi o\'zgarish yon menyudagi qizil raqam va ro\'yxatdagi rangli belgi orqali bildiriladi.' })}
                </Step>
            ),
        },
        {
            color: '#6366F1',
            children: (
                <Step title={t('guide_m_step4_t', { defaultValue: '4-qadam. Kerak bo\'lsa — video konferensiya o\'tkazing' })}>
                    {t('guide_m_step4_b', { defaultValue: 'Konsultant bilan jonli muloqot uchun "Video konferensiya" bo\'limiga kiring, tegishli xonani toping va "Boshlash" tugmasini bosing. Konsultant "Qo\'shilish" orqali kiradi. Birinchi kirishda brauzer kamera va mikrofonga ruxsat so\'raydi — "Ruxsat berish"ni bosing.' })}
                </Step>
            ),
        },
        {
            color: '#16A34A',
            children: (
                <Step title={t('guide_m_step5_t', { defaultValue: '5-qadam. Yakuniy xulosani oling' })}>
                    {t('guide_m_step5_b', { defaultValue: 'Konsultant xulosa yozgach, konsultatsiya "Yakunlandi" holatiga o\'tadi. Xulosani konsultatsiya kartochkasida o\'qiysiz — u bemor tarixiga biriktirilgan holda saqlanadi.' })}
                </Step>
            ),
        },
    ]

    // ── Shifokor (konsultant) uchun konsultatsiya qadamlari ──
    const doctorSteps = [
        {
            color: '#0EA5A4',
            children: (
                <Step title={t('guide_d_step1_t', { defaultValue: '1-qadam. Shifoxona taklifini qabul qiling' })}>
                    {t('guide_d_step1_b', { defaultValue: 'Sizni konsultant sifatida taklif qilgan shifoxonalar "Shifoxonalar" (Qabullar) bo\'limida chiqadi. "Qabul qilish" yoki "Rad etish"ni tanlang. Qabul qilsangiz, o\'sha shifoxona sizga konsultatsiya yubora oladi. Yangi taklif yon menyuda qizil raqam bilan belgilanadi.' })}
                </Step>
            ),
        },
        {
            color: '#0EA5A4',
            children: (
                <Step title={t('guide_d_step2_t', { defaultValue: '2-qadam. Konsultatsiya so\'rovini oching' })}>
                    {t('guide_d_step2_b', { defaultValue: '"Mening konsultatsiyalarim" bo\'limida sizga yuborilgan so\'rovlar ko\'rinadi. Har birida bemor, biriktirilgan tahlil va so\'ragan shifoxona ko\'rsatilgan. So\'rovni "Qabul qilish" (ko\'rib chiqishni boshlash) yoki asos bilan "Rad etish" mumkin.' })}
                </Step>
            ),
        },
        {
            color: '#6366F1',
            children: (
                <Step title={t('guide_d_step3_t', { defaultValue: '3-qadam. Tahlilni ko\'rib chiqing' })}>
                    {t('guide_d_step3_b', { defaultValue: 'Konsultatsiyani ochib, biriktirilgan tahlilni — rasm, o\'lchovlar va AI dastlabki natijasini ko\'ring. Rasmni ustiga bosib kattalashtirish mumkin. Zarur bo\'lsa video konferensiya orqali bemorni yuborgan shifokor bilan gaplashing.' })}
                </Step>
            ),
        },
        {
            color: '#6366F1',
            children: (
                <Step title={t('guide_d_step4_t', { defaultValue: '4-qadam. Video konferensiyaga qo\'shiling (ixtiyoriy)' })}>
                    {t('guide_d_step4_b', { defaultValue: '"Video konferensiya" bo\'limidan tegishli xonaga "Qo\'shilish". Birinchi kirishda kamera va mikrofonga ruxsat bering, aks holda sizni ko\'rib/eshitib bo\'lmaydi. Muloqot tugagach "Chiqish" tugmasini bosing.' })}
                </Step>
            ),
        },
        {
            color: '#16A34A',
            children: (
                <Step title={t('guide_d_step5_t', { defaultValue: '5-qadam. Yakuniy xulosa yozing' })}>
                    {t('guide_d_step5_b', { defaultValue: 'Ish maydonida yakuniy xulosangizni yozib yuboring. Shundan so\'ng konsultatsiya "Yakunlandi" holatiga o\'tadi va so\'ragan shifoxona xulosangizni ko\'radi. Diqqat: AI natijasi faqat yordamchi — yakuniy tibbiy xulosa siznikidir.' })}
                </Step>
            ),
        },
    ]

    const steps = isManager ? managerSteps : doctorSteps
    const guideTitle = isManager
        ? t('guide_manager_title', { defaultValue: 'Onlayn konsultatsiya — Admin va Direktor uchun' })
        : t('guide_doctor_title', { defaultValue: 'Onlayn konsultatsiya — Shifokor (konsultant) uchun' })
    const guideIntro = isManager
        ? t('guide_manager_intro', { defaultValue: 'Konsultatsiya — o\'z shifoxonangiz bemori uchun boshqa shifoxonadagi mutaxassis shifokordan masofaviy xulosa olish imkoni. Quyidagi 5 qadam bilan boshdan-oxir bajariladi.' })
        : t('guide_doctor_intro', { defaultValue: 'Siz boshqa shifoxonalar uchun masofaviy konsultant sifatida ishlaysiz: ular yuborgan tahlillarni ko\'rib chiqib, xulosa berasiz. Quyidagi 5 qadam bilan boshdan-oxir bajariladi.' })

    // ── FAQ — to'liq va aniq javoblar ──
    const faq = [
        {
            key: 'consultation-what',
            label: t('faq_cons_title', { defaultValue: 'Onlayn konsultatsiya nima va oddiy tahlildan farqi nimada?' }),
            children: t('faq_cons_body', {
                defaultValue: 'Oddiy tahlilda fayl o\'z shifoxonangiz ichida yuklanadi va tahlil qilinadi. Konsultatsiyada esa bemor tahlili boshqa shifoxonadagi mutaxassis shifokorga masofadan yuboriladi — u ko\'rib chiqib, o\'z xulosasini beradi. Buni Admin yoki Direktor boshlaydi; konsultant shifokor esa so\'rovni qabul qilib, xulosa yozadi. Zarurat bo\'lsa taraflar video konferensiya orqali gaplashishi mumkin.',
            }),
        },
        {
            key: 'video-join',
            label: t('faq_video_title', { defaultValue: 'Video konferensiyada kamera yoki mikrofon ishlamayapti. Nima qilay?' }),
            children: t('faq_video_body', {
                defaultValue: 'Ko\'p hollarda brauzer kamera/mikrofonga ruxsat bermagan bo\'ladi. Manzil satri yonidagi qulf belgisini bosing va kamera hamda mikrofonni "Ruxsat berish" holatiga o\'tkazing, so\'ng sahifani yangilang. Qurilmani boshqa dastur (masalan boshqa qo\'ng\'iroq ilovasi) band qilib turmaganiga ishonch hosil qiling. Xonaga Admin/Direktor "Boshlash", qolganlar "Qo\'shilish" tugmasi orqali kiradi.',
            }),
        },
        {
            key: 'ai-vs-doctor',
            label: t('faq_ai_title', { defaultValue: 'AI xulosasi tashxis o\'rnini bosadimi?' }),
            children: t('faq_ai_body', {
                defaultValue: 'Yo\'q. AI xulosasi — faqat yordamchi vosita. Yakuniy tashxisni har doim malakali shifokor qo\'yadi va u uchun javobgardir. Hujjatda ham shu ogohlantirish bosilgan.',
            }),
        },
        {
            key: 'save-vs-ai',
            label: t('faq_save_title', { defaultValue: '"Faqat saqlash" va "AI bilan tahlil" farqi nima?' }),
            children: t('faq_save_body', {
                defaultValue: '"Faqat saqlash" — yozuv yaratiladi, lekin AI ishga tushmaydi; tahlilni keyinroq ochib, sun\'iy intellektga yuborishingiz mumkin. "AI bilan tahlil" — fayl darhol sun\'iy intellektga yuboriladi va natija odatda bir necha daqiqada tayyor bo\'ladi.',
            }),
        },
        {
            key: 'colors',
            label: t('faq_colors_title', { defaultValue: 'Ro\'yxatdagi ranglar nimani anglatadi?' }),
            children: t('faq_colors_body', {
                defaultValue: 'Yashil — norma, sariq — o\'rtacha (kuzatuv kerak), qizil — xavfli (shoshilinch e\'tibor). Kulrang "Baholanmadi" degani AI aniq daraja bera olmadi — bunday natijani albatta shifokor o\'zi o\'qib baholashi kerak, uni "norma" deb hisoblab bo\'lmaydi.',
            }),
        },
        {
            key: 'roles',
            label: t('faq_roles_title', { defaultValue: 'Nima uchun men hamma tahlillarni ko\'rmayapman?' }),
            children: t('faq_roles_body', {
                defaultValue: 'Ro\'yxat sahifalarida ko\'rish huquqi rolga bog\'liq: Admin va Direktor (bosh shifokor) shifoxonaning barcha xodimlari yuklagan tahlillarni ko\'radi; Shifokor — o\'zi yuklagan hamda o\'ziga "Davolovchi shifokor" sifatida biriktirilgan tahlillarni; Hamshira — faqat o\'zi yuklagan tahlillarni. Muhim: bemor kartochkasi ichida yoki tahlil yuklashda bemorni qidirganda o\'sha bemorning bazadagi barcha tahlillari hamma foydalanuvchiga ko\'rinadi — bu cheklov faqat umumiy ro\'yxat sahifalariga tegishli.',
            }),
        },
        {
            key: 'diagnosis-who',
            label: t('faq_diag_title', { defaultValue: 'Tahlilga tashxis (xulosa)ni kim yoza oladi?' }),
            children: t('faq_diag_body', {
                defaultValue: 'Tashxis yozish imkoni faqat Shifokor rolida mavjud. Admin, Direktor, Hamshira va boshqa rollar tahlilni ko\'ra oladi, lekin tashxis yoza olmaydi — bu tibbiy javobgarlik shifokor zimmasida bo\'lgani uchun.',
            }),
        },
        {
            key: 'delete',
            label: t('faq_delete_title', { defaultValue: 'Noto\'g\'ri yaratilgan tahlilni o\'chirish mumkinmi?' }),
            children: t('faq_delete_body', {
                defaultValue: 'Ha. Har bir foydalanuvchi o\'zi yuklagan tahlilni o\'chira oladi (Shifokor va Hamshira ham). Admin va Direktor esa shifoxonadagi istalgan tahlilni o\'chira oladi. Sabab ko\'rsatish majburiy. Yozuv bazadan butunlay yo\'qolmaydi — kim, qachon va nima sababdan o\'chirgani jurnalda saqlanadi va zarurat bo\'lsa tiklanadi.',
            }),
        },
        {
            key: 'mismatch',
            label: t('faq_mismatch_title', { defaultValue: '"Fayl mos emas" degan xabar chiqdi. Nima qilish kerak?' }),
            children: t('faq_mismatch_body', {
                defaultValue: 'Yuklangan fayl tanlangan tahlil turiga mos kelmagan (masalan, laboratoriya bo\'limiga Holter hisoboti yuklangan). AI bunday holatda ataylab xulosa yozmaydi. Tahlilni oching va faylni to\'g\'risiga almashtiring — yangi tahlil yaratish shart emas.',
            }),
        },
        {
            key: 'quality',
            label: t('faq_quality_title', { defaultValue: 'Rasm qanday bo\'lishi kerak?' }),
            children: t('faq_quality_body', {
                defaultValue: 'Rasm aniq bo\'lsin, yozuvlar va to\'lqinlar o\'qilsin. Juda kichik (800×600 pikseldan kichik), xira yoki bo\'sh rasm rad etiladi. Fayl hajmi 25 MB dan oshmasin. Iloji bo\'lsa tekis, soyasiz va to\'liq kadrga olingan rasmdan foydalaning.',
            }),
        },
        {
            key: 'qr',
            label: t('faq_qr_title', { defaultValue: 'Hujjatdagi QR kod nima uchun kerak?' }),
            children: t('faq_qr_body', {
                defaultValue: 'QR kod orqali hujjatning haqiqiyligini tekshirish mumkin — u NMED platformasida shakllantirilganini tasdiqlaydi. Tekshirish sahifasida bemorning to\'liq ma\'lumotlari emas, faqat bosh harflari ko\'rsatiladi — maxfiylik uchun.',
            }),
        },
        {
            key: 'activation',
            label: t('faq_activation_title', { defaultValue: 'Shifoxonam faollashtirilmagan. Qancha kutish kerak?' }),
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
                        {/* Onlayn konsultatsiya + video konferensiya qo'llanmasi (rolga qarab) */}
                        {(isManager || isDoctor) && (
                            <Card
                                size="small"
                                style={{ marginBottom: 16 }}
                                title={<span><TeamOutlined style={{ marginRight: 8, color: '#0EA5A4' }} />{guideTitle}</span>}
                            >
                                <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 16 }}>
                                    {guideIntro}
                                </Paragraph>
                                <Timeline items={steps} />

                                <Alert
                                    type="info"
                                    showIcon
                                    icon={<VideoCameraOutlined />}
                                    style={{ marginTop: 8 }}
                                    message={t('guide_video_note_title', { defaultValue: 'Video konferensiya haqida qisqacha' })}
                                    description={t('guide_video_note_body', {
                                        defaultValue: 'Xona holatlari: "Rejalashtirilgan", "Taklif qilingan", "Qo\'shilgan", "Yakunlangan". Xonani Admin/Direktor "Boshlaydi", qolgan ishtirokchilar "Qo\'shiladi". Birinchi kirishda brauzer kamera va mikrofonga ruxsat so\'raydi — "Ruxsat berish"ni bosing. Barqaror internet aloqasi tavsiya etiladi.',
                                    })}
                                />
                            </Card>
                        )}

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
