import React, { useEffect, useState } from 'react'
import { Col, Divider, Form, Input, Modal, Row, Select, Switch } from 'antd'
import { useTranslation } from 'react-i18next'
import { get_districts_data, get_region_data } from '../../../host/requests/RegionRequest'
import { sa_create_clinic, sa_update_clinic } from '../../../host/requests/SuperAdminRequest'

/**
 * Klinika yaratish / tahrirlash oynasi. Yaratishda ixtiyoriy ravishda
 * klinika admini hisobi ham ochiladi (admin birinchi kirishda parolni
 * almashtiradi).
 *
 * @param {object|null} clinic tahrirlanayotgan klinika (`sa_clinic` javobi) yoki null
 */
export default function ClinicFormModal({ open, clinic, onClose, onSaved }) {
    const { t } = useTranslation()
    const [form] = Form.useForm()
    const [saving, setSaving] = useState(false)
    const [regions, setRegions] = useState([])
    const [districts, setDistricts] = useState([])
    const regionId = Form.useWatch('regionId', form)
    const isEdit = !!clinic

    useEffect(() => {
        if (!open) return
        get_region_data().then((r) => setRegions(r.data ?? [])).catch(() => setRegions([]))
        form.resetFields()
        if (clinic) {
            form.setFieldsValue({
                clinicName: clinic.clinicName,
                isActive: clinic.isActive,
                inn: clinic.detail?.inn,
                address: clinic.detail?.address,
                regionId: clinic.detail?.regionId ?? undefined,
                districtId: clinic.detail?.districtId ?? undefined,
                bankName: clinic.detail?.bankName,
                bankAccount: clinic.detail?.bankAccount,
                mfo: clinic.detail?.mfo,
                license: clinic.detail?.license,
                phones: (clinic.phones ?? []).join(', '),
            })
        } else {
            form.setFieldsValue({ isActive: true })
        }
    }, [open, clinic, form])

    useEffect(() => {
        if (!regionId) { setDistricts([]); return }
        get_districts_data({ region_id: regionId })
            .then((r) => setDistricts(r.data ?? []))
            .catch(() => setDistricts([]))
    }, [regionId])

    const submit = async () => {
        const v = await form.validateFields()
        const payload = {
            clinicName: v.clinicName,
            isActive: !!v.isActive,
            inn: v.inn,
            address: v.address,
            districtId: v.districtId ?? null,
            bankName: v.bankName,
            bankAccount: v.bankAccount,
            mfo: v.mfo,
            license: v.license,
            phones: String(v.phones ?? '').split(/[,;\n]/).map((x) => x.trim()).filter(Boolean),
        }
        if (!isEdit && v.adminPhone) {
            Object.assign(payload, {
                adminPhone: v.adminPhone,
                adminPassword: v.adminPassword,
                adminFirstName: v.adminFirstName,
                adminLastName: v.adminLastName,
            })
        }
        setSaving(true)
        try {
            const res = isEdit ? await sa_update_clinic(clinic.id, payload) : await sa_create_clinic(payload)
            onSaved?.(isEdit ? clinic.id : res.data?.id)
        } catch {
            // xabar interceptor'da
        } finally {
            setSaving(false)
        }
    }

    const nameOf = (x) => x.nameUz ?? x.name_uz ?? x.name ?? `#${x.id}`

    return (
        <Modal
            open={open}
            title={isEdit ? t('sa_edit_clinic', { defaultValue: 'Klinikani tahrirlash' }) : t('sa_new_clinic', { defaultValue: 'Yangi klinika' })}
            onCancel={onClose}
            onOk={submit}
            confirmLoading={saving}
            okText={t('save', { defaultValue: 'Saqlash' })}
            cancelText={t('cancel', { defaultValue: 'Bekor qilish' })}
            width={760}
            destroyOnClose
        >
            <Form form={form} layout="vertical">
                <Row gutter={12}>
                    <Col xs={24} md={16}>
                        <Form.Item name="clinicName" label={t('sa_clinic_name', { defaultValue: 'Klinika nomi' })}
                            rules={[{ required: true, message: t('required_field', { defaultValue: 'Majburiy maydon' }) }]}>
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="isActive" label={t('sa_active_status', { defaultValue: 'Faol' })} valuePropName="checked">
                            <Switch />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="inn" label="INN"><Input maxLength={14} /></Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="regionId" label={t('region', { defaultValue: 'Viloyat' })}>
                            <Select allowClear showSearch optionFilterProp="label"
                                options={regions.map((r) => ({ value: r.id, label: nameOf(r) }))}
                                onChange={() => form.setFieldValue('districtId', undefined)} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="districtId" label={t('district', { defaultValue: 'Tuman' })}>
                            <Select allowClear showSearch optionFilterProp="label" disabled={!regionId}
                                options={districts.map((r) => ({ value: r.id, label: nameOf(r) }))} />
                        </Form.Item>
                    </Col>
                    <Col xs={24}>
                        <Form.Item name="address" label={t('address', { defaultValue: 'Manzil' })}><Input /></Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="phones" label={t('sa_clinic_phones', { defaultValue: 'Telefonlar (vergul bilan)' })}>
                            <Input placeholder="998901234567, 998711234567" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="license" label={t('license', { defaultValue: 'Litsenziya' })}><Input /></Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="bankName" label={t('bank_name', { defaultValue: 'Bank' })}><Input /></Form.Item>
                    </Col>
                    <Col xs={24} md={10}>
                        <Form.Item name="bankAccount" label={t('bank_account', { defaultValue: 'Hisob raqami' })}><Input /></Form.Item>
                    </Col>
                    <Col xs={24} md={6}>
                        <Form.Item name="mfo" label="MFO"><Input /></Form.Item>
                    </Col>
                </Row>

                {!isEdit && (
                    <>
                        <Divider orientation="left" plain>{t('sa_clinic_admin', { defaultValue: 'Klinika admini (ixtiyoriy)' })}</Divider>
                        <Row gutter={12}>
                            <Col xs={24} md={12}>
                                <Form.Item name="adminFirstName" label={t('firstname', { defaultValue: 'Ism' })}
                                    dependencies={['adminPhone']}
                                    rules={[({ getFieldValue }) => ({ required: !!getFieldValue('adminPhone'), message: t('required_field', { defaultValue: 'Majburiy maydon' }) })]}>
                                    <Input />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item name="adminLastName" label={t('lastname', { defaultValue: 'Familiya' })}><Input /></Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item name="adminPhone" label={t('phone_number', { defaultValue: 'Telefon (login)' })}
                                    rules={[{ pattern: /^998\d{9}$/, message: '998XXXXXXXXX' }]}>
                                    <Input placeholder="998901234567" maxLength={12} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item name="adminPassword" label={t('password', { defaultValue: 'Parol' })}
                                    dependencies={['adminPhone']}
                                    rules={[({ getFieldValue }) => ({ required: !!getFieldValue('adminPhone'), min: 6, message: t('sa_password_rule', { defaultValue: 'Kamida 6 belgi' }) })]}>
                                    <Input.Password autoComplete="new-password" />
                                </Form.Item>
                            </Col>
                        </Row>
                    </>
                )}
            </Form>
        </Modal>
    )
}
