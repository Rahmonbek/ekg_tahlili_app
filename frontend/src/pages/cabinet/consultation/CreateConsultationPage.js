import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
    Button, Form, Input, DatePicker, Radio, message, Typography, Divider, Space,
    Table, Tag, Alert
} from 'antd';
import { ArrowLeftOutlined, SearchOutlined, SaveOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
    createConsultations,
    findConsultationPatient,
    getConsultationBadgeCounts,
    getMyConsultants
} from '../../../host/requests/ConsultationRequest';
import { useStore } from '../../../store/Store';
import './Consultation.css';

const { Title, Text } = Typography;

export default function CreateConsultationPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { setConsultationBadge } = useStore();

    const [form] = Form.useForm();
    const [consultants, setConsultants] = useState([]);
    const [selectedDoctors, setSelectedDoctors] = useState([]);
    const [patientLookup, setPatientLookup] = useState(null);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadConsultants();
    }, []);

    const loadConsultants = async () => {
        try {
            const res = await getMyConsultants();
            setConsultants(res.data || []);
        } catch {
            message.error(t('error'));
        }
    };

    const handleFindPatient = async () => {
        try {
            const values = await form.validateFields(['passportSeries', 'birthDate']);
            setLookupLoading(true);
            const res = await findConsultationPatient({
                passportSeries: values.passportSeries,
                birthDate: values.birthDate.format('YYYY-MM-DD'),
            });

            const patient = res.data;
            setPatientLookup(patient);

            if (patient?.found) {
                form.setFieldsValue({
                    fullName: patient.fullName,
                    phone: patient.phone,
                    address: patient.address,
                    gender: patient.gender,
                });
                message.success(t('data_found'));
            } else {
                form.setFieldsValue({
                    fullName: '',
                    phone: '',
                    address: '',
                    gender: undefined,
                });
                message.info(t('no_data'));
            }
        } catch (err) {
            if (err?.errorFields) return;
            message.error(t('error'));
        } finally {
            setLookupLoading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            if (!patientLookup) {
                message.warning(t('search'));
                return;
            }
            if (selectedDoctors.length === 0) {
                message.warning(t('select_doctor_of_patcient'));
                return;
            }

            setLoading(true);
            const payload = {
                doctorIds: selectedDoctors,
                consultationDate: values.consultationDate.format('YYYY-MM-DD'),
            };

            if (patientLookup?.found && patientLookup.patientId) {
                payload.patientId = patientLookup.patientId;
            } else {
                payload.newPatient = {
                    passportSeries: values.passportSeries,
                    fullName: values.fullName,
                    birthDate: values.birthDate.format('YYYY-MM-DD'),
                    gender: values.gender,
                    phone: values.phone,
                    address: values.address,
                };
            }

            await createConsultations(payload);
            getConsultationBadgeCounts().then((res) => setConsultationBadge(res.data || {})).catch(() => {});
            message.success(t('data_saved'));
            navigate('/consultations');
        } catch (err) {
            if (err?.errorFields) return;
            message.error(t('error'));
        } finally {
            setLoading(false);
        }
    };

    const consultationDateDisabled = (current) => {
        if (!current) return false;
        const today = dayjs().startOf('day');
        return current.startOf('day').isBefore(today) || current.startOf('day').isAfter(today.add(1, 'month'));
    };

    const consultantColumns = [
        {
            title: t('FIO'),
            dataIndex: 'fullName',
            key: 'fullName',
            render: (value) => <Text strong>{value}</Text>,
        },
        {
            title: t('position'),
            dataIndex: 'position',
            key: 'position',
            render: (value) => value || '-',
        },
        {
            title: t('phone_number'),
            dataIndex: 'phone',
            key: 'phone',
            render: (value) => value || '-',
        },
        {
            title: t('consultation_price'),
            dataIndex: 'currentPrice',
            key: 'currentPrice',
            render: (value) => `${Number(value || 0).toLocaleString()} UZS`,
        },
    ];

    const selectedNames = consultants
        .filter((item) => selectedDoctors.includes(item.doctorId))
        .map((item) => item.fullName);

    return (
        <div className="consultation-page">
            <div className="consultation-shell">
                <div className="consultation-header">
                    <div>
                        <Button
                            type="text"
                            icon={<ArrowLeftOutlined />}
                            onClick={() => navigate('/consultations')}
                            style={{ marginBottom: 4, padding: 0 }}
                        >
                            {t('back')}
                        </Button>
                        <Title level={4} className="consultation-title">{t('create_consultation')}</Title>
                    </div>
                    <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={loading}
                        onClick={handleSubmit}
                    >
                        {t('save')}
                    </Button>
                </div>

                <div className="consultation-body">
                    <Form form={form} layout="vertical">
                        <Divider orientation="left">{t('patient_info')}</Divider>
                        <div className="consultation-patient-search">
                            <Form.Item
                                name="passportSeries"
                                label={t('passport_seria')}
                                rules={[{ required: true, message: t('not_empty') }]}
                            >
                                <Input placeholder="AA1234567" onChange={() => setPatientLookup(null)} />
                            </Form.Item>
                            <Form.Item
                                name="birthDate"
                                label={t('birthdate')}
                                rules={[{ required: true, message: t('not_empty') }]}
                            >
                                <DatePicker
                                    style={{ width: '100%' }}
                                    format="DD.MM.YYYY"
                                    onChange={() => setPatientLookup(null)}
                                />
                            </Form.Item>
                            <Form.Item label=" ">
                                <Button
                                    type="primary"
                                    icon={<SearchOutlined />}
                                    loading={lookupLoading}
                                    onClick={handleFindPatient}
                                >
                                    {t('search')}
                                </Button>
                            </Form.Item>
                        </div>

                        {patientLookup?.found && (
                            <Alert
                                type="success"
                                showIcon
                                className="consultation-inline-alert"
                                message={t('data_found')}
                                description={patientLookup.fullName}
                            />
                        )}

                        {patientLookup && !patientLookup.found && (
                            <Alert
                                type="info"
                                showIcon
                                className="consultation-inline-alert"
                                message={t('new_patient')}
                                description={t('no_data')}
                            />
                        )}

                        {patientLookup && (
                            <div className="consultation-form-grid">
                                <Form.Item
                                    name="fullName"
                                    label={t('FIO')}
                                    rules={[{ required: true, message: t('not_empty') }]}
                                >
                                    <Input disabled={patientLookup.found} />
                                </Form.Item>
                                <Form.Item
                                    name="gender"
                                    label={t('gender')}
                                    rules={[{ required: true, message: t('not_empty') }]}
                                >
                                    <Radio.Group disabled={patientLookup.found}>
                                        <Radio value={true}>{t('male')}</Radio>
                                        <Radio value={false}>{t('female')}</Radio>
                                    </Radio.Group>
                                </Form.Item>
                                <Form.Item
                                    name="phone"
                                    label={t('phone_number')}
                                    rules={[{ required: true, message: t('not_empty') }]}
                                >
                                    <Input disabled={patientLookup.found} />
                                </Form.Item>
                                <Form.Item name="address" label={t('address')}>
                                    <Input disabled={patientLookup.found} />
                                </Form.Item>
                            </div>
                        )}

                        <Divider orientation="left">{t('consultant_doctor')}</Divider>
                        <Table
                            rowKey="doctorId"
                            columns={consultantColumns}
                            dataSource={consultants}
                            pagination={{ pageSize: 8 }}
                            rowSelection={{
                                selectedRowKeys: selectedDoctors,
                                onChange: (keys) => setSelectedDoctors(keys),
                            }}
                            locale={{ emptyText: t('no_data') }}
                            scroll={{ x: 760 }}
                        />

                        {selectedNames.length > 0 && (
                            <Space wrap style={{ marginTop: 12 }}>
                                {selectedNames.map((name) => (
                                    <Tag key={name} color="blue">{name}</Tag>
                                ))}
                            </Space>
                        )}

                        <Divider orientation="left">{t('consultation_date')}</Divider>
                        <Form.Item
                            name="consultationDate"
                            label={t('consultation_date')}
                            rules={[{ required: true, message: t('not_empty') }]}
                        >
                            <DatePicker
                                style={{ width: '100%' }}
                                format="DD.MM.YYYY"
                                disabledDate={consultationDateDisabled}
                            />
                        </Form.Item>

                        <Space>
                            <Button type="primary" icon={<SaveOutlined />} loading={loading} onClick={handleSubmit}>
                                {t('save')}
                            </Button>
                            <Button onClick={() => navigate('/consultations')}>
                                {t('cancel')}
                            </Button>
                        </Space>
                    </Form>
                </div>
            </div>
        </div>
    );
}
