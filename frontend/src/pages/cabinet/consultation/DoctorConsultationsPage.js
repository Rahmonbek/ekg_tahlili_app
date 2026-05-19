import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
    Button, Table, Tag, Select, message, Typography, Space, Modal, Form, Input, Popconfirm
} from 'antd';
import { ReloadOutlined, CheckOutlined, CloseOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
    getMyConsultations, acceptConsultation, rejectConsultation, getConsultationBadgeCounts
} from '../../../host/requests/ConsultationRequest';
import { useStore } from '../../../store/Store';
import './Consultation.css';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const STATUS_COLORS = {
    created: 'gold',
    reviewing: 'blue',
    completed: 'green',
    rejected: 'red',
};

export default function DoctorConsultationsPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { setConsultationBadge } = useStore();

    const [consultations, setConsultations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const [rejectModal, setRejectModal] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [rejectLoading, setRejectLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);
    const [form] = Form.useForm();

    useEffect(() => {
        loadConsultations();
    }, []);

    const loadConsultations = async (status) => {
        setLoading(true);
        try {
            const params = {};
            const s = status !== undefined ? status : statusFilter;
            if (s) params.status = s;
            const res = await getMyConsultations(params);
            setConsultations(res.data || []);
        } catch {
            message.error(t('error'));
        } finally {
            setLoading(false);
        }
    };

    const handleFilter = () => {
        loadConsultations();
    };

    const handleAccept = async (id) => {
        setActionLoading(id);
        try {
            await acceptConsultation(id);
            getConsultationBadgeCounts().then((res) => setConsultationBadge(res.data || {})).catch(() => {});
            message.success(t('success'));
            loadConsultations();
        } catch {
            message.error(t('error'));
        } finally {
            setActionLoading(null);
        }
    };

    const openRejectModal = (id) => {
        setSelectedId(id);
        form.resetFields();
        setRejectModal(true);
    };

    const handleReject = async () => {
        try {
            const values = await form.validateFields();
            setRejectLoading(true);
            await rejectConsultation(selectedId, { rejectionReason: values.rejectionReason });
            getConsultationBadgeCounts().then((res) => setConsultationBadge(res.data || {})).catch(() => {});
            message.success(t('success'));
            setRejectModal(false);
            loadConsultations();
        } catch (err) {
            if (err?.errorFields) return;
            message.error(t('error'));
        } finally {
            setRejectLoading(false);
        }
    };

    const statusLabel = (status) => {
        const map = {
            created: t('cons_status_created'),
            reviewing: t('cons_status_reviewing'),
            completed: t('cons_status_completed'),
            rejected: t('cons_status_rejected'),
        };
        return map[status] || status;
    };

    const columns = [
        {
            title: t('patient_fullname'),
            dataIndex: 'patientFullName',
            key: 'patientFullName',
        },
        {
            title: t('clinic_name'),
            dataIndex: 'clinicName',
            key: 'clinicName',
        },
        {
            title: t('consultation_date'),
            dataIndex: 'consultationDate',
            key: 'consultationDate',
            render: (v) => v ? dayjs(v).format('DD.MM.YYYY') : '—',
        },
        {
            title: t('price_at_creation'),
            dataIndex: 'priceAtCreation',
            key: 'priceAtCreation',
            render: (v) => v != null ? `${Number(v).toLocaleString()} UZS` : '—',
        },
        {
            title: t('ecg_status'),
            dataIndex: 'status',
            key: 'status',
            render: (v) => (
                <Tag color={STATUS_COLORS[v] || 'default'}>{statusLabel(v)}</Tag>
            ),
        },
        {
            title: t('diagnosis'),
            dataIndex: 'hasConclusion',
            key: 'hasConclusion',
            render: (v) => v
                ? <Tag icon={<CheckCircleOutlined />} color="green">{t('has_conclusion')}</Tag>
                : <Tag icon={<CloseCircleOutlined />} color="default">{t('no_conclusion')}</Tag>,
        },
        {
            title: '',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button
                        size="small"
                        onClick={() => navigate(`/doctor/consultations/${record.id}`)}
                    >
                        {t('view')}
                    </Button>
                    {record.status === 'created' && (
                        <>
                            <Popconfirm
                                title={t('confirm_accept')}
                                onConfirm={() => handleAccept(record.id)}
                                okText={t('accept')}
                                cancelText={t('cancel')}
                            >
                                <Button
                                    size="small"
                                    type="primary"
                                    icon={<CheckOutlined />}
                                    loading={actionLoading === record.id}
                                >
                                    {t('accept_consultation')}
                                </Button>
                            </Popconfirm>
                            <Button
                                size="small"
                                danger
                                icon={<CloseOutlined />}
                                onClick={() => openRejectModal(record.id)}
                            >
                                {t('reject_consultation')}
                            </Button>
                        </>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div className="consultation-page">
            <div className="consultation-shell">
                <div className="consultation-header">
                    <div>
                        <Title level={4} className="consultation-title">{t('consultation')}</Title>
                    </div>
                </div>
                <div className="consultation-body">
                    <div className="consultation-filter-row">
                        <Select
                            value={statusFilter}
                            onChange={(v) => setStatusFilter(v)}
                            style={{ width: 200 }}
                            placeholder={t('filter_by_status')}
                        >
                            <Option value="">{t('all_statuses')}</Option>
                            <Option value="created">{t('cons_status_created')}</Option>
                            <Option value="reviewing">{t('cons_status_reviewing')}</Option>
                            <Option value="completed">{t('cons_status_completed')}</Option>
                            <Option value="rejected">{t('cons_status_rejected')}</Option>
                        </Select>
                        <Button icon={<ReloadOutlined />} onClick={handleFilter}>
                            {t('refresh')}
                        </Button>
                    </div>

                    <Table
                        rowKey="id"
                        dataSource={consultations}
                        columns={columns}
                        loading={loading}
                        pagination={{ pageSize: 20 }}
                        scroll={{ x: 1000 }}
                    />
                </div>
            </div>

            <Modal
                className="consultation-modal"
                open={rejectModal}
                title={t('reject_consultation')}
                onCancel={() => setRejectModal(false)}
                onOk={handleReject}
                okText={t('reject')}
                cancelText={t('cancel')}
                okButtonProps={{ danger: true }}
                confirmLoading={rejectLoading}
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="rejectionReason"
                        label={t('reject_reason')}
                        rules={[{ required: true, message: t('not_empty') }]}
                    >
                        <TextArea rows={4} placeholder={t('enter_rejection_reason')} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
