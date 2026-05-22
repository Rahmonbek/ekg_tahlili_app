import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
    Button, Form, message, Typography, Divider, Space, Table, Tag, Tooltip, Alert, DatePicker
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { IoAlertCircleSharp } from 'react-icons/io5';
import dayjs from 'dayjs';
import {
    createConsultations,
    getConsultationBadgeCounts,
    getMyConsultants
} from '../../../host/requests/ConsultationRequest';
import { useStore } from '../../../store/Store';
import { usePatientSearch } from '../../../hooks/usePatientSearch';
import { useRegionDistrict } from '../../../hooks/useRegionDistrict';
import PatientSearchSection from '../../../components/shared/PatientSearchSection';
import PatientInfoForm from '../../../components/shared/PatientInfoForm';
import './Consultation.css';

const { Title, Text } = Typography;

export default function CreateConsultationPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { setConsultationBadge } = useStore();

    const [patientForm] = Form.useForm();
    const [patientSearchForm] = Form.useForm();
    const [consultationForm] = Form.useForm();
    const [gender, setGender] = useState(true);
    const [consultants, setConsultants] = useState([]);
    const [selectedDoctors, setSelectedDoctors] = useState([]);
    const [loading, setLoading] = useState(false);

    const { regions, districts, fetchDistricts } = useRegionDistrict();
    const {
        patcient,
        loading: patientLoading,
        loadingSave,
        checkReady,
        phoneValue,
        setPhoneValue,
        searchPatcient,
        savePatcient,
        resetPatient,
    } = usePatientSearch({
        form: patientForm,
        getDistricts: fetchDistricts,
    });

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

    const resetPatientBlock = () => {
        resetPatient();
        patientForm.resetFields();
        consultationForm.resetFields();
        setSelectedDoctors([]);
        setGender(true);
    };

    const handleSubmit = async () => {
        try {
            const values = await consultationForm.validateFields();
            if (!checkReady || !patcient?.id) {
                message.warning(t('search_patcient'));
                return;
            }
            if (selectedDoctors.length === 0) {
                message.warning(t('select_doctor_of_patcient'));
                return;
            }

            setLoading(true);
            await createConsultations({
                patientId: patcient.id,
                doctorIds: selectedDoctors,
                consultationDate: values.consultationDate,
            });

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
    const patientIsReady = checkReady && !!patcient?.id;

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
                    <div className="main_card consultation-patient-card">
                        <h1>
                            {t('patcient_info')}{' '}
                            <Tooltip placement="bottomRight" title={t('alert_patcient')}>
                                <span className="alert_icon"><IoAlertCircleSharp /></span>
                            </Tooltip>
                        </h1>
                        <div className="main_card_content">
                            <PatientSearchSection
                                form={patientSearchForm}
                                onFinish={searchPatcient}
                                onReset={resetPatientBlock}
                                loading={patientLoading}
                            />
                            <PatientInfoForm
                                form={patientForm}
                                patcient={patcient}
                                onFinish={savePatcient}
                                loading={loadingSave}
                                phoneValue={phoneValue}
                                setPhoneValue={setPhoneValue}
                                gender={gender}
                                setGender={setGender}
                                regions={regions}
                                districts={districts}
                                fetchDistricts={fetchDistricts}
                            />
                        </div>
                    </div>

                    {patientIsReady && (
                        <Alert
                            type="success"
                            showIcon
                            className="consultation-inline-alert"
                            message={t('data_found')}
                            description={[patcient.lastName, patcient.firstName, patcient.sureName].filter(Boolean).join(' ')}
                        />
                    )}

                    {patientIsReady && (
                        <>
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
                            <Form form={consultationForm} layout="vertical">
                                <Form.Item
                                    name="consultationDate"
                                    label={t('consultation_date')}
                                    rules={[{ required: true, message: t('not_empty') }]}
                                    getValueFromEvent={(value) => value ? value.format('YYYY-MM-DD') : undefined}
                                    getValueProps={(value) => ({ value: value ? dayjs(value) : undefined })}
                                >
                                    <DatePicker
                                        style={{ width: '100%' }}
                                        format="DD.MM.YYYY"
                                        disabledDate={consultationDateDisabled}
                                    />
                                </Form.Item>
                            </Form>

                            <Space>
                                <Button type="primary" icon={<SaveOutlined />} loading={loading} onClick={handleSubmit}>
                                    {t('save')}
                                </Button>
                                <Button onClick={() => navigate('/consultations')}>
                                    {t('cancel')}
                                </Button>
                            </Space>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
