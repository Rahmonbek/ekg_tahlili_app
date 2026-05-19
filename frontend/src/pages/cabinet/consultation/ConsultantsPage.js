import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
    Button, Table, Tag, Modal, Form, InputNumber, DatePicker, message, Typography, Space, Divider
} from 'antd';
import { PlusOutlined, HistoryOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getMyConsultants, getSentInvitations, updateConsultantPrice } from '../../../host/requests/ConsultationRequest';
import './Consultation.css';

const { Title, Text } = Typography;

export default function ConsultantsPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [consultants, setConsultants] = useState([]);
    const [sentInvitations, setSentInvitations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sentLoading, setSentLoading] = useState(false);
    const [priceModal, setPriceModal] = useState(false);
    const [selectedConsultant, setSelectedConsultant] = useState(null);
    const [priceLoading, setPriceLoading] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => {
        loadConsultants();
        loadSentInvitations();
    }, []);

    const loadConsultants = async () => {
        setLoading(true);
        try {
            const res = await getMyConsultants();
            setConsultants(res.data || []);
        } catch {
            message.error(t('error'));
        } finally {
            setLoading(false);
        }
    };

    const loadSentInvitations = async () => {
        setSentLoading(true);
        try {
            const res = await getSentInvitations();
            setSentInvitations(res.data || []);
        } catch {
            message.error(t('error'));
        } finally {
            setSentLoading(false);
        }
    };

    const openPriceModal = (record) => {
        setSelectedConsultant(record);
        form.setFieldsValue({
            newPrice: record.currentPrice,
            effectiveFrom: dayjs(),
        });
        setPriceModal(true);
    };

    const handleUpdatePrice = async () => {
        try {
            const values = await form.validateFields();
            setPriceLoading(true);
            await updateConsultantPrice(selectedConsultant.clinicConsultantId, {
                newPrice: values.newPrice,
                effectiveFrom: values.effectiveFrom.format('YYYY-MM-DD'),
            });
            message.success(t('data_saved'));
            setPriceModal(false);
            loadConsultants();
            loadSentInvitations();
        } catch (err) {
            if (err?.errorFields) return;
            message.error(t('error'));
        } finally {
            setPriceLoading(false);
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
            title: t('price_per_session'),
            dataIndex: 'currentPrice',
            key: 'currentPrice',
            render: (v) => v != null ? `${Number(v).toLocaleString()} UZS` : '—',
        },
        {
            title: t('total_consultations'),
            dataIndex: 'totalConsultations',
            key: 'totalConsultations',
        },
        {
            title: t('created_at'),
            dataIndex: 'linkedAt',
            key: 'linkedAt',
            render: (v) => v ? dayjs(v).format('DD.MM.YYYY') : '—',
        },
        {
            title: '',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button
                        size="small"
                        icon={<HistoryOutlined />}
                        onClick={() => navigate(`/consultants/${record.clinicConsultantId}/history`)}
                    >
                        {t('consultation_history')}
                    </Button>
                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openPriceModal(record)}
                    >
                        {t('update_price')}
                    </Button>
                </Space>
            ),
        },
    ];

    const statusColor = (status) => {
        if (status === 'accepted') return 'green';
        if (status === 'rejected') return 'red';
        if (status === 'pending') return 'gold';
        return 'default';
    };

    const invitationColumns = [
        {
            title: t('FIO'),
            dataIndex: 'doctorFullName',
            key: 'doctorFullName',
        },
        {
            title: t('clinic'),
            dataIndex: 'doctorClinicName',
            key: 'doctorClinicName',
        },
        {
            title: t('position'),
            dataIndex: 'doctorPosition',
            key: 'doctorPosition',
        },
        {
            title: t('price_per_session'),
            dataIndex: 'pricePerSession',
            key: 'pricePerSession',
            render: (v) => v != null ? `${Number(v).toLocaleString()} UZS` : '-',
        },
        {
            title: t('created_at'),
            dataIndex: 'invitedAt',
            key: 'invitedAt',
            render: (v) => v ? dayjs(v).format('DD.MM.YYYY HH:mm') : '-',
        },
        {
            title: t('status'),
            dataIndex: 'status',
            key: 'status',
            render: (status) => <Tag color={statusColor(status)}>{t(`cons_status_${status}`)}</Tag>,
        },
        {
            title: t('responded_at'),
            dataIndex: 'respondedAt',
            key: 'respondedAt',
            render: (v) => v ? dayjs(v).format('DD.MM.YYYY HH:mm') : '-',
        },
    ];

    return (
        <div className="consultation-page">
            <div className="consultation-shell">
                <div className="consultation-header">
                    <div>
                        <Title level={4} className="consultation-title">{t('consultants')}</Title>
                        <Text className="consultation-subtitle">{t('my_consultants')}</Text>
                    </div>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => navigate('/consultants/add')}
                    >
                        {t('add_consultant')}
                    </Button>
                </div>
                <div className="consultation-body">
                    <Table
                        rowKey="clinicConsultantId"
                        dataSource={consultants}
                        columns={columns}
                        loading={loading}
                        pagination={{ pageSize: 20 }}
                        scroll={{ x: 800 }}
                    />

                    <Divider />

                    <div className="consultation-section-head">
                        <Title level={5} className="consultation-section-title">{t('pending_invitations')}</Title>
                        <Text className="consultation-subtitle">{t('sent_invitations')}</Text>
                    </div>
                    <Table
                        rowKey="id"
                        dataSource={sentInvitations}
                        columns={invitationColumns}
                        loading={sentLoading}
                        pagination={{ pageSize: 10 }}
                        scroll={{ x: 900 }}
                    />
                </div>
            </div>

            <Modal
                className="consultation-modal"
                open={priceModal}
                title={t('update_price')}
                onCancel={() => setPriceModal(false)}
                onOk={handleUpdatePrice}
                okText={t('save')}
                cancelText={t('cancel')}
                confirmLoading={priceLoading}
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="newPrice"
                        label={t('price_per_session')}
                        rules={[{ required: true, message: t('not_empty') }]}
                    >
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item
                        name="effectiveFrom"
                        label={t('effective_from')}
                        rules={[{ required: true, message: t('not_empty') }]}
                    >
                        <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
