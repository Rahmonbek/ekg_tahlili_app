import React, { useCallback, useEffect, useState } from 'react'
import { Button, Col, DatePicker, Form, Input, Modal, Popconfirm, Radio, Row, Select, Table, Tooltip } from 'antd'
import { DeleteOutlined, EditOutlined, FileSearchOutlined, IdcardOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { sa_delete_patient, sa_patients, sa_update_patient } from '../../../host/requests/SuperAdminRequest'
import { calculateAge, genderLabel } from '../../../tools/formatters'
import { latinNameRule } from '../../../tools/latinInput'
import useDocumentTitle from '../../../tools/useDocumentTitle'
import { fmtDate, fmtNum, fmtPhone, personFullName, useClinicOptions } from './saCommon'
import './SuperAdmin.css'

const PAGE_SIZE = 20

/** Bemorlar (SA-17): butun baza, qidiruv, tahrirlash, o'chirish. */
export default function SaPatients() {
    const { t } = useTranslation()
    useDocumentTitle(t('sa_patients', { defaultValue: 'Bemorlar' }))
    const navigate = useNavigate()
    const clinics = useClinicOptions()
    const [rows, setRows] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [clinicId, setClinicId] = useState(null)
    const [editing, setEditing] = useState(null)

    const load = useCallback(async (p = page) => {
        setLoading(true)
        try {
            const params = { page: p, pageSize: PAGE_SIZE }
            if (search.trim()) params.search = search.trim()
            if (clinicId) params.clinicId = clinicId
            const res = await sa_patients(params)
            setRows(res.data?.data ?? [])
            setTotal(res.data?.totalCount ?? 0)
        } catch { /* interceptor */ } finally {
            setLoading(false)
        }
    }, [page, search, clinicId])

    useEffect(() => { load(page) }, [page, clinicId]) // eslint-disable-line react-hooks/exhaustive-deps

    const remove = async (r) => {
        try { await sa_delete_patient(r.id); load(page) } catch { /* interceptor */ }
    }

    const countCell = (r) => {
        const parts = [['EKG', r.ecg], ['Holter', r.holter], ['SMAD', r.smad], ['Lab', r.lab], ['AI', r.combined]]
            .filter(([, n]) => n > 0)
        const sum = parts.reduce((s, [, n]) => s + n, 0)
        return (
            <Tooltip title={parts.map(([k, n]) => `${k}: ${n}`).join(' · ') || null}>
                <span className="sa-num">{fmtNum(sum)}</span>
            </Tooltip>
        )
    }

    const columns = [
        { title: '#', dataIndex: 'id', width: 64, className: 'sa-num' },
        {
            title: t('sa_full_name', { defaultValue: 'F.I.Sh.' }), key: 'name',
            render: (_, r) => (
                <div>
                    <div className="sa-cell-main">{personFullName(r)}</div>
                    <div className="sa-cell-sub">{r.passport || ''}{r.phone ? ` · ${fmtPhone(r.phone)}` : ''}</div>
                </div>
            ),
        },
        {
            title: t('sa_age_gender', { defaultValue: 'Yosh / jins' }), key: 'age', width: 130,
            render: (_, r) => {
                const age = r.birthDate ? calculateAge(r.birthDate) : null
                const g = genderLabel(r.gender, t)
                return [age != null ? `${age} ${t('sa_years', { defaultValue: 'yosh' })}` : null, g].filter(Boolean).join(' · ') || <span className="sa-muted">—</span>
            },
        },
        { title: t('sa_last_clinic', { defaultValue: 'Klinika' }), dataIndex: 'lastClinic', ellipsis: true, render: (v) => v || <span className="sa-muted">—</span> },
        { title: t('sa_analyses', { defaultValue: 'Tahlillar' }), key: 'cnt', width: 90, align: 'right', render: (_, r) => countCell(r) },
        { title: t('sa_created', { defaultValue: 'Yaratilgan' }), dataIndex: 'createdAt', width: 110, render: fmtDate },
        {
            title: '', key: 'actions', width: 160, fixed: 'right',
            render: (_, r) => (
                <div className="sa-actions">
                    <Tooltip title={t('sa_patient_analyses', { defaultValue: 'Tahlillari' })}>
                        <Button type="text" icon={<FileSearchOutlined />} onClick={() => navigate(`/sa/analyses?patientId=${r.id}`)} />
                    </Tooltip>
                    <Tooltip title={t('sa_patient_card', { defaultValue: 'Bemor kartasi' })}>
                        <Button type="text" icon={<IdcardOutlined />} onClick={() => navigate(`/patcients/${r.id}`)} />
                    </Tooltip>
                    <Tooltip title={t('edit', { defaultValue: 'Tahrirlash' })}>
                        <Button type="text" icon={<EditOutlined />} onClick={() => setEditing(r)} />
                    </Tooltip>
                    <Popconfirm
                        title={t('sa_delete_patient_confirm', { defaultValue: "Bemor o'chirilsinmi? Tahlillari bo'lsa o'chirilmaydi." })}
                        okButtonProps={{ danger: true }}
                        onConfirm={() => remove(r)}
                    >
                        <Tooltip title={t('delete', { defaultValue: "O'chirish" })}>
                            <Button type="text" danger icon={<DeleteOutlined />} />
                        </Tooltip>
                    </Popconfirm>
                </div>
            ),
        },
    ]

    return (
        <div className="sa">
            <div className="main_card">
                <h1><span>{t('sa_patients', { defaultValue: 'Bemorlar' })}<span className="sa-head-sub">{fmtNum(total)}</span></span></h1>
                <div className="main_card_content">
                    <div className="sa-filters">
                        <div className="sa-filter" style={{ gridColumn: 'span 2' }}>
                            <label>{t('search', { defaultValue: 'Qidiruv' })}</label>
                            <Input.Search
                                allowClear
                                placeholder={t('sa_patient_search_ph', { defaultValue: 'Familiya, ism, passport yoki telefon' })}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onSearch={() => { setPage(1); load(1) }}
                            />
                        </div>
                        <div className="sa-filter">
                            <label>{t('sa_clinic', { defaultValue: 'Klinika' })}</label>
                            <Select allowClear showSearch optionFilterProp="label" placeholder={t('sa_all', { defaultValue: 'Barchasi' })}
                                value={clinicId} onChange={(v) => { setPage(1); setClinicId(v ?? null) }} options={clinics} />
                        </div>
                    </div>
                    <Table
                        rowKey="id"
                        size="middle"
                        loading={loading}
                        columns={columns}
                        dataSource={rows}
                        scroll={{ x: 960 }}
                        pagination={{ current: page, pageSize: PAGE_SIZE, total, onChange: setPage, showSizeChanger: false }}
                    />
                </div>
            </div>

            <PatientModal patient={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(page) }} />
        </div>
    )
}

function PatientModal({ patient, onClose, onSaved }) {
    const { t } = useTranslation()
    const [form] = Form.useForm()
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!patient) return
        form.resetFields()
        form.setFieldsValue({
            lastName: patient.lastName, firstName: patient.firstName, sureName: patient.sureName,
            passport: patient.passport, phone: patient.phone, address: patient.address,
            birthDate: patient.birthDate ? dayjs(patient.birthDate) : null,
            gender: patient.gender,
        })
    }, [patient, form])

    const submit = async () => {
        const v = await form.validateFields()
        setSaving(true)
        try {
            await sa_update_patient(patient.id, {
                ...v,
                birthDate: v.birthDate ? v.birthDate.format('YYYY-MM-DD') : null,
                gender: v.gender ?? null,
            })
            onSaved()
        } catch { /* interceptor */ } finally {
            setSaving(false)
        }
    }

    const req = { required: true, message: t('required_field', { defaultValue: 'Majburiy maydon' }) }
    // Ism qoidasi bemor yaratish bilan bir xil: faqat lotin harflari
    const latin = latinNameRule(t)

    return (
        <Modal
            open={!!patient}
            title={t('sa_edit_patient', { defaultValue: 'Bemorni tahrirlash' })}
            onCancel={onClose}
            onOk={submit}
            confirmLoading={saving}
            okText={t('save', { defaultValue: 'Saqlash' })}
            cancelText={t('cancel', { defaultValue: 'Bekor qilish' })}
            width={640}
            destroyOnClose
        >
            <Form form={form} layout="vertical">
                <Row gutter={12}>
                    <Col xs={24} md={8}><Form.Item name="lastName" label={t('lastname', { defaultValue: 'Familiya' })} rules={[req, latin]}><Input /></Form.Item></Col>
                    <Col xs={24} md={8}><Form.Item name="firstName" label={t('firstname', { defaultValue: 'Ism' })} rules={[req, latin]}><Input /></Form.Item></Col>
                    <Col xs={24} md={8}><Form.Item name="sureName" label={t('surename', { defaultValue: 'Otasining ismi' })} rules={[latin]}><Input /></Form.Item></Col>
                    <Col xs={24} md={8}><Form.Item name="passport" label={t('passport', { defaultValue: 'Passport' })}><Input /></Form.Item></Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="birthDate" label={t('birthdate', { defaultValue: "Tug'ilgan sana" })}>
                            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" disabledDate={(d) => d && d.isAfter(dayjs())} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="gender" label={t('gender', { defaultValue: 'Jinsi' })}>
                            <Radio.Group>
                                <Radio value={true}>{t('male', { defaultValue: 'Erkak' })}</Radio>
                                <Radio value={false}>{t('female', { defaultValue: 'Ayol' })}</Radio>
                            </Radio.Group>
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}><Form.Item name="phone" label={t('phone_number', { defaultValue: 'Telefon' })}><Input maxLength={12} /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item name="address" label={t('address', { defaultValue: 'Manzil' })}><Input /></Form.Item></Col>
                </Row>
            </Form>
        </Modal>
    )
}
