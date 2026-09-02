import React, { useState } from 'react'
import { Alert, Avatar, Button, Card, Col, Descriptions, Row, Tag, Typography } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../../store/Store'
import ChangePasswordModal from '../../../components/shared/ChangePasswordModal'
import DoctorDashboard from '../../../components/DoctorDashboard'
import { formatPhoneNumberForForm, personName } from '../../../tools/formatters'
import { buildFileUrl } from '../../../host/Host'
import RoleConstants from '../../../tools/roles'
import useDocumentTitle from '../../../tools/useDocumentTitle';
import maleStaff from '../../../images/avatars/male.jpg'
import femaleStaff from '../../../images/avatars/female.jpg'
import { useLocation } from 'react-router-dom';

const { Title } = Typography

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

    // Parolni o'zgartirish — alohida bosqichma-bosqich modal
    const [changePwdOpen, setChangePwdOpen] = useState(false)

    // Vaqtinchalik parol bilan kirgan foydalanuvchi shu manzilga
    // yo'naltiriladi (T-022) — bu holatda modal avtomatik ochiladi.
    const mustChangePassword = new URLSearchParams(useLocation().search)
        .get('changePassword') === '1'

    const doctor = user?.doctor
    const phone = doctor?.phone || user?.phone
    const fio = personName(doctor)

    // Modal AVTOMATIK ochilmaydi — parol o'zgartirish ixtiyoriy, faqat
    // "Parolni o'zgartirish" tugmasi bosilganda ochiladi (foydalanuvchi so'rovi).

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
                                <Descriptions.Item label={t('clinic', { defaultValue: 'Shifoxona' })}>
                                    {user?.clinic?.clinicName || '—'}
                                </Descriptions.Item>
                                <Descriptions.Item label={t('clinic_status', { defaultValue: 'Shifoxona holati' })}>
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

                            <p className="pwd-change-hint">
                                {t('change_password_desc', { defaultValue: 'Parolni almashtirish uchun telefon raqamingiz SMS kod bilan tasdiqlanadi. Jarayon bosqichma-bosqich oynada bajariladi.' })}
                            </p>
                            <Button
                                type="primary"
                                block
                                className="btn_form"
                                icon={<LockOutlined />}
                                onClick={() => setChangePwdOpen(true)}
                            >
                                {t('change_password', { defaultValue: 'Parolni o\'zgartirish' })}
                            </Button>
                        </Card>
                    </Col>

                </Row>

                {/* Shifokor uchun: unga yuborilgan tahlillar statistikasi va
                    hali xulosa yozilmagan tahlillar ro'yxati */}
                {user?.roleId === RoleConstants.DOCTOR && <DoctorDashboard />}
            </div>

            <ChangePasswordModal
                open={changePwdOpen}
                onClose={() => setChangePwdOpen(false)}
                phone={phone}
            />
        </div>
    )
}
