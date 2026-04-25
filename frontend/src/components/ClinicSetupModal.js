import React, { useState, useEffect } from 'react'
import { Button, Form, Input, Modal, Select, Steps } from 'antd'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store/Store'
import { send_clinic_info, send_clinic_detail } from '../host/requests/ClinicRequest'
import { get_region_data, get_districts_data } from '../host/requests/RegionRequest'
import { get_user_data } from '../host/requests/UserRequest'
import { dangerAlert, successAlert } from '../tools/Alerts'
import { FaBuilding, FaLocationDot } from 'react-icons/fa6'

const { Option } = Select

/**
 * ClinicSetupModal — Admin onboarding 2-bosqichi.
 * Klinika nomi, viloyat, tuman va manzilni to'ldirish.
 * clinic_setup_modal=true bo'lganda ko'rsatiladi.
 */
export default function ClinicSetupModal() {
    const { t } = useTranslation()
    const { user, setuser, clinic_setup_modal, setclinic_setup_modal } = useStore()
    const [form] = Form.useForm()
    const [loading, setloading] = useState(false)
    const [regions, setregions] = useState([])
    const [districts, setdistricts] = useState([])

    useEffect(() => {
        if (clinic_setup_modal) {
            loadRegions()
            // Mavjud ma'lumotlarni to'ldirish
            if (user?.clinic) {
                form.setFieldsValue({
                    clinicName: user.clinic.clinicName || '',
                    address: user.clinic.clinicDetail?.address || '',
                })
            }
        }
    }, [clinic_setup_modal])

    const loadRegions = async () => {
        try {
            const res = await get_region_data()
            setregions(res.data || [])
        } catch (err) {
            console.error('Region yuklashda xatolik:', err)
        }
    }

    const handleRegionChange = async (regionId) => {
        form.setFieldValue('districtId', undefined)
        setdistricts([])
        try {
            const res = await get_districts_data({ region_id: regionId })
            setdistricts(res.data || [])
        } catch (err) {
            console.error('Tuman yuklashda xatolik:', err)
        }
    }

    const onFinish = async (values) => {
        setloading(true)
        try {
            // 1. Klinika asosiy ma'lumotlarini saqlash
            const clinicId = user?.clinic?.id
            if (!clinicId) throw new Error('Klinika ID topilmadi')

            const formData = new FormData()
            formData.append('Id', clinicId)
            formData.append('ClinicName', values.clinicName)
            await send_clinic_info(formData)

            // 2. Klinika tafsilotlarini saqlash
            const detailFormData = new FormData()
            detailFormData.append('Id', user?.clinic?.clinicDetail?.id || 0)
            detailFormData.append('ClinicId', clinicId)
            detailFormData.append('DistrictId', values.districtId)
            detailFormData.append('Address', values.address || '')
            await send_clinic_detail(detailFormData)

            // 3. User ma'lumotlarini yangilash
            const userRes = await get_user_data()
            setuser(userRes.data)

            successAlert(t('success'))
            setclinic_setup_modal(false)
        } catch (err) {
            dangerAlert(t('error'))
            console.error('Klinika ma\'lumotlarini saqlashda xatolik:', err)
        } finally {
            setloading(false)
        }
    }

    return (
        <Modal
            open={clinic_setup_modal}
            closable={false}
            maskClosable={false}
            footer={null}
            width={560}
            centered
        >
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <FaBuilding size={40} color="#1D9E75" />
                <h2 style={{ marginTop: 12, marginBottom: 4, color: '#2C3E6B' }}>
                    {t('clinic_setup_title')}
                </h2>
                <p style={{ color: '#666', fontSize: 14 }}>
                    {t('clinic_setup_desc')}
                </p>
            </div>

            <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
            >
                <Form.Item
                    name="clinicName"
                    label={t('clinic_name_label')}
                    rules={[{ required: true, message: t('not_empty') }]}
                >
                    <Input
                        prefix={<FaBuilding color="#1D9E75" />}
                        className="login_input"
                        placeholder={t('clinic_name_label')}
                    />
                </Form.Item>

                <Form.Item
                    name="regionId"
                    label={t('select_region')}
                    rules={[{ required: true, message: t('not_empty') }]}
                >
                    <Select
                        placeholder={t('select_region')}
                        onChange={handleRegionChange}
                        showSearch
                        filterOption={(input, option) =>
                            option?.children?.toLowerCase().includes(input.toLowerCase())
                        }
                    >
                        {regions.map(r => (
                            <Option key={r.id} value={r.id}>
                                {r.nameUz || r.nameRu}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    name="districtId"
                    label={t('select_district')}
                    rules={[{ required: true, message: t('not_empty') }]}
                >
                    <Select
                        placeholder={t('select_district')}
                        disabled={districts.length === 0}
                        showSearch
                        filterOption={(input, option) =>
                            option?.children?.toLowerCase().includes(input.toLowerCase())
                        }
                    >
                        {districts.map(d => (
                            <Option key={d.id} value={d.id}>
                                {d.nameUz || d.nameRu}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>

                <Form.Item
                    name="address"
                    label={t('clinic_address_label')}
                    rules={[{ required: true, message: t('not_empty') }]}
                >
                    <Input
                        prefix={<FaLocationDot color="#1D9E75" />}
                        className="login_input"
                        placeholder={t('clinic_address_label')}
                    />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        className="btn_form"
                        block
                        style={{ background: '#1D9E75', borderColor: '#1D9E75' }}
                    >
                        {t('save')}
                    </Button>
                </Form.Item>
            </Form>
        </Modal>
    )
}
