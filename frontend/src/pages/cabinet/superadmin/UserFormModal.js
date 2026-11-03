import React, { useEffect, useState } from 'react'
import { Checkbox, Col, Form, Input, Modal, Radio, Row, Select, Switch } from 'antd'
import { useTranslation } from 'react-i18next'
import { sa_create_user, sa_set_password, sa_update_user } from '../../../host/requests/SuperAdminRequest'
import { ROLE } from '../../../tools/roles'
import { roleOptions, useClinicOptions } from './saCommon'

const PHONE_RULE = { pattern: /^998\d{9}$/, message: '998XXXXXXXXX' }

/**
 * Xodim yaratish / tahrirlash (SA-16). Istalgan rol va klinika.
 * SuperAdmin roli tanlansa klinika maydoni yashiriladi (unga klinika yo'q).
 *
 * @param {object|null} user ro'yxat qatori (`sa_users`) yoki null
 * @param {number} [defaultClinicId] klinika sahifasidan ochilganda
 */
export default function UserFormModal({ open, user, defaultClinicId, onClose, onSaved }) {
    const { t } = useTranslation()
    const [form] = Form.useForm()
    const [saving, setSaving] = useState(false)
    const clinics = useClinicOptions()
    const roleId = Form.useWatch('roleId', form)
    const isEdit = !!user

    useEffect(() => {
        if (!open) return
        form.resetFields()
        if (user) {
            form.setFieldsValue({
                firstName: user.firstName, lastName: user.lastName, sureName: user.sureName,
                phone: user.phone, email: user.email?.endsWith('@phone.nmed.local') ? '' : user.email,
                roleId: user.roleId, clinicId: user.clinicId ?? undefined,
                gender: user.gender ?? true, status: user.status,
            })
        } else {
            form.setFieldsValue({
                roleId: ROLE.DOCTOR, clinicId: defaultClinicId, gender: true, status: true, mustChangePassword: true,
            })
        }
    }, [open, user, defaultClinicId, form])

    const submit = async () => {
        const v = await form.validateFields()
        const payload = {
            phone: v.phone, email: v.email || null, roleId: v.roleId,
            clinicId: v.roleId === ROLE.SUPER_ADMIN ? null : v.clinicId,
            firstName: v.firstName, lastName: v.lastName, sureName: v.sureName,
            gender: v.gender, status: v.status,
            password: v.password, mustChangePassword: !!v.mustChangePassword,
        }
        setSaving(true)
        try {
            if (isEdit) await sa_update_user(user.id, payload)
            else await sa_create_user(payload)
            onSaved?.()
        } catch { /* interceptor */ } finally {
            setSaving(false)
        }
    }

    const req = { required: true, message: t('required_field', { defaultValue: 'Majburiy maydon' }) }

    return (
        <Modal
            open={open}
            title={isEdit ? t('sa_edit_user', { defaultValue: 'Xodimni tahrirlash' }) : t('sa_new_user', { defaultValue: 'Yangi xodim' })}
            onCancel={onClose}
            onOk={submit}
            confirmLoading={saving}
            okText={t('save', { defaultValue: 'Saqlash' })}
            cancelText={t('cancel', { defaultValue: 'Bekor qilish' })}
            width={680}
            destroyOnClose
        >
            <Form form={form} layout="vertical">
                <Row gutter={12}>
                    <Col xs={24} md={8}>
                        <Form.Item name="lastName" label={t('lastname', { defaultValue: 'Familiya' })}><Input /></Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="firstName" label={t('firstname', { defaultValue: 'Ism' })} rules={[req]}><Input /></Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="sureName" label={t('surename', { defaultValue: 'Otasining ismi' })}><Input /></Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="phone" label={t('sa_phone_login', { defaultValue: 'Telefon (login)' })} rules={[req, PHONE_RULE]}>
                            <Input placeholder="998901234567" maxLength={12} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}><Input /></Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="roleId" label={t('sa_role', { defaultValue: 'Rol' })} rules={[req]}>
                            <Select options={roleOptions(t)} />
                        </Form.Item>
                    </Col>
                    {roleId !== ROLE.SUPER_ADMIN && (
                        <Col xs={24} md={12}>
                            <Form.Item name="clinicId" label={t('sa_clinic', { defaultValue: 'Klinika' })} rules={[req]}>
                                <Select showSearch optionFilterProp="label" options={clinics} />
                            </Form.Item>
                        </Col>
                    )}
                    <Col xs={24} md={12}>
                        <Form.Item name="gender" label={t('gender', { defaultValue: 'Jinsi' })}>
                            <Radio.Group>
                                <Radio value={true}>{t('male', { defaultValue: 'Erkak' })}</Radio>
                                <Radio value={false}>{t('female', { defaultValue: 'Ayol' })}</Radio>
                            </Radio.Group>
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="status" label={t('sa_account_active', { defaultValue: 'Hisob faol' })} valuePropName="checked">
                            <Switch />
                        </Form.Item>
                    </Col>
                    {!isEdit && (
                        <>
                            <Col xs={24} md={12}>
                                <Form.Item name="password" label={t('password', { defaultValue: 'Parol' })}
                                    rules={[req, { min: 6, message: t('sa_password_rule', { defaultValue: 'Kamida 6 belgi' }) }]}>
                                    <Input.Password autoComplete="new-password" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item name="mustChangePassword" valuePropName="checked" label=" ">
                                    <Checkbox>{t('sa_must_change', { defaultValue: 'Birinchi kirishda parolni almashtirsin' })}</Checkbox>
                                </Form.Item>
                            </Col>
                        </>
                    )}
                </Row>
            </Form>
        </Modal>
    )
}

/** Parolni o'rnatish oynasi (SuperAdmin istalgan xodimga yangi parol beradi). */
export function PasswordModal({ open, user, onClose, onSaved }) {
    const { t } = useTranslation()
    const [form] = Form.useForm()
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (open) { form.resetFields(); form.setFieldsValue({ mustChangePassword: true }) }
    }, [open, form])

    const submit = async () => {
        const v = await form.validateFields()
        setSaving(true)
        try {
            await sa_set_password(user.id, { password: v.password, mustChangePassword: !!v.mustChangePassword })
            onSaved?.()
        } catch { /* interceptor */ } finally {
            setSaving(false)
        }
    }

    return (
        <Modal
            open={open}
            title={t('sa_set_password', { defaultValue: "Parolni o'rnatish" })}
            onCancel={onClose}
            onOk={submit}
            confirmLoading={saving}
            okText={t('save', { defaultValue: 'Saqlash' })}
            cancelText={t('cancel', { defaultValue: 'Bekor qilish' })}
            destroyOnClose
        >
            <p className="sa-muted" style={{ marginBottom: 12 }}>
                {[user?.lastName, user?.firstName].filter(Boolean).join(' ')} · +{user?.phone}
            </p>
            <Form form={form} layout="vertical">
                <Form.Item name="password" label={t('sa_new_password', { defaultValue: 'Yangi parol' })}
                    rules={[{ required: true, min: 6, message: t('sa_password_rule', { defaultValue: 'Kamida 6 belgi' }) }]}>
                    <Input.Password autoComplete="new-password" />
                </Form.Item>
                <Form.Item name="confirm" label={t('sa_confirm_password', { defaultValue: 'Parolni takrorlang' })}
                    dependencies={['password']}
                    rules={[({ getFieldValue }) => ({
                        validator: (_, value) => (value === getFieldValue('password')
                            ? Promise.resolve()
                            : Promise.reject(new Error(t('sa_password_mismatch', { defaultValue: 'Parollar mos emas' })))),
                    })]}>
                    <Input.Password autoComplete="new-password" />
                </Form.Item>
                <Form.Item name="mustChangePassword" valuePropName="checked">
                    <Checkbox>{t('sa_must_change', { defaultValue: 'Birinchi kirishda parolni almashtirsin' })}</Checkbox>
                </Form.Item>
            </Form>
        </Modal>
    )
}
