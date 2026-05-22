import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
    Button, Table, Modal, Form, InputNumber, message, Typography, Select
} from 'antd';
import { ArrowLeftOutlined, SearchOutlined, UserAddOutlined } from '@ant-design/icons';
import Cleave from 'cleave.js/react';
import {
    searchDoctors,
    inviteDoctor,
    getConsultationClinicOptions,
    getConsultationBadgeCounts
} from '../../../host/requests/ConsultationRequest';
import { get_region_data, get_districts_data } from '../../../host/requests/RegionRequest';
import { useStore } from '../../../store/Store';
import { formatPhoneNumber } from '../../../tools/formatters';
import './Consultation.css';

const { Title, Text } = Typography;

export default function AddConsultantPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { setConsultationBadge } = useStore();

    const [filters, setFilters] = useState({
        phone: '',
        regionId: undefined,
        districtId: undefined,
        clinicId: undefined,
    });
    const [regions, setRegions] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [clinics, setClinics] = useState([]);
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [inviteModal, setInviteModal] = useState(false);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [inviteLoading, setInviteLoading] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => {
        loadRegions();
        loadClinics({});
        handleSearch({});
    }, []);

    const loadRegions = async () => {
        try {
            const res = await get_region_data();
            setRegions(res.data || []);
        } catch {
            message.error(t('error'));
        }
    };

    const loadDistricts = async (regionId) => {
        if (!regionId) {
            setDistricts([]);
            return;
        }
        try {
            const res = await get_districts_data({ region_id: regionId });
            setDistricts(res.data || []);
        } catch {
            message.error(t('error'));
        }
    };

    const loadClinics = async (params) => {
        try {
            const res = await getConsultationClinicOptions(params);
            setClinics(res.data || []);
        } catch {
            message.error(t('error'));
        }
    };

    const updateFilter = (key, value) => {
        const next = { ...filters, [key]: value };
        if (key === 'regionId') {
            next.districtId = undefined;
            next.clinicId = undefined;
            loadDistricts(value);
            loadClinics(value ? { regionId: value } : {});
        }
        if (key === 'districtId') {
            next.clinicId = undefined;
            loadClinics(value ? { districtId: value } : { regionId: next.regionId });
        }
        setFilters(next);
    };

    const buildParams = (source = filters) => ({
        phone: formatPhoneNumber(source.phone)?.trim() || undefined,
        regionId: source.regionId,
        districtId: source.districtId,
        clinicId: source.clinicId,
    });

    const handleSearch = async (source = filters) => {
        setSearching(true);
        try {
            const res = await searchDoctors(buildParams(source));
            setResults(res.data || []);
        } catch {
            message.error(t('error'));
        } finally {
            setSearching(false);
        }
    };

    const openInviteModal = (doctor) => {
        setSelectedDoctor(doctor);
        form.resetFields();
        setInviteModal(true);
    };

    const handleInvite = async () => {
        try {
            const values = await form.validateFields();
            setInviteLoading(true);
            await inviteDoctor({
                doctorId: selectedDoctor.doctorId,
                pricePerSession: values.pricePerSession,
            });
            message.success(t('invitation_sent'));
            setInviteModal(false);
            setResults((prev) => prev.filter((item) => item.doctorId !== selectedDoctor.doctorId));
            getConsultationBadgeCounts().then((res) => setConsultationBadge(res.data || {})).catch(() => {});
        } catch (err) {
            if (err?.errorFields) return;
            message.error(t('error'));
        } finally {
            setInviteLoading(false);
        }
    };

    const columns = [
        {
            title: t('FIO'),
            dataIndex: 'fullName',
            key: 'fullName',
        },
        {
            title: t('position'),
            dataIndex: 'position',
            key: 'position',
        },
        {
            title: t('phone_number'),
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: t('clinic_name'),
            dataIndex: 'clinicName',
            key: 'clinicName',
        },
        {
            title: '',
            key: 'actions',
            render: (_, record) => (
                <Button
                    type="primary"
                    size="small"
                    icon={<UserAddOutlined />}
                    onClick={() => openInviteModal(record)}
                >
                    {t('invite_doctor')}
                </Button>
            ),
        },
    ];

    return (
        <div className="consultation-page">
            <div className="consultation-shell">
                <div className="consultation-header">
                    <div>
                        <Button
                            type="text"
                            icon={<ArrowLeftOutlined />}
                            onClick={() => navigate('/consultants')}
                            style={{ marginBottom: 4, padding: 0 }}
                        >
                            {t('back')}
                        </Button>
                        <Title level={4} className="consultation-title">{t('add_consultant')}</Title>
                        <Text className="consultation-subtitle">{t('search_doctor')}</Text>
                    </div>
                </div>
                <div className="consultation-body">
                    <div className="consultation-filter-grid consultation-filter-grid-consultants">
                        <Cleave
                            options={{
                                prefix: '+998',
                                delimiters: [' (', ') ', '-', '-'],
                                blocks: [4, 2, 3, 2, 2],
                                numericOnly: true,
                            }}
                            value={filters.phone}
                            onChange={(e) => updateFilter('phone', e.target.value)}
                            placeholder="+998 (__) ___-__-__"
                            className="ant-input claveInput"
                        />
                        <Select
                            allowClear
                            showSearch
                            placeholder={t('region')}
                            value={filters.regionId}
                            onChange={(value) => updateFilter('regionId', value)}
                            optionFilterProp="label"
                            options={regions.map((item) => ({
                                value: item.id,
                                label: item.nameUz || item.nameRu || item.name
                            }))}
                        />
                        <Select
                            allowClear
                            showSearch
                            placeholder={t('district')}
                            value={filters.districtId}
                            onChange={(value) => updateFilter('districtId', value)}
                            optionFilterProp="label"
                            options={districts.map((item) => ({
                                value: item.id,
                                label: item.nameUz || item.nameRu || item.name
                            }))}
                        />
                        <Select
                            allowClear
                            showSearch
                            placeholder={t('clinic_name')}
                            value={filters.clinicId}
                            onChange={(value) => updateFilter('clinicId', value)}
                            optionFilterProp="label"
                            options={clinics.map((item) => ({
                                value: item.id,
                                label: item.clinicName
                            }))}
                        />
                        <Button
                            type="primary"
                            icon={<SearchOutlined />}
                            loading={searching}
                            onClick={() => handleSearch()}
                        >
                            {t('search')}
                        </Button>
                    </div>

                    <Table
                        rowKey="doctorId"
                        dataSource={results}
                        columns={columns}
                        loading={searching}
                        pagination={{ pageSize: 20 }}
                        scroll={{ x: 700 }}
                    />
                </div>
            </div>

            <Modal
                className="consultation-modal"
                open={inviteModal}
                title={t('invite_doctor')}
                onCancel={() => setInviteModal(false)}
                onOk={handleInvite}
                okText={t('send_request')}
                cancelText={t('cancel')}
                confirmLoading={inviteLoading}
            >
                {selectedDoctor && (
                    <div style={{ marginBottom: 16 }}>
                        <Text strong>{selectedDoctor.fullName}</Text>
                        <br />
                        <Text type="secondary">{selectedDoctor.position}</Text>
                    </div>
                )}
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="pricePerSession"
                        label={t('price_per_session')}
                        rules={[{ required: true, message: t('not_empty') }]}
                    >
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
