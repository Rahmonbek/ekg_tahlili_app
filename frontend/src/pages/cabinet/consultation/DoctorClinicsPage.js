import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
    Button, Table, Tag, message, Typography, Divider, Space, Popconfirm, Modal, Empty
} from 'antd';
import { HistoryOutlined, CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
    getMyInvitations,
    acceptInvitation,
    rejectInvitation,
    getMyClinics,
    getConsultationBadgeCounts,
    getDoctorClinicPriceHistory
} from '../../../host/requests/ConsultationRequest';
import { useStore } from '../../../store/Store';
import './Consultation.css';

const { Title, Text } = Typography;

const INV_STATUS_COLORS = {
    pending: 'gold',
    accepted: 'green',
    rejected: 'red',
};

export default function DoctorClinicsPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { setConsultationBadge } = useStore();

    const [invitations, setInvitations] = useState([]);
    const [invLoading, setInvLoading] = useState(false);
    const [clinics, setClinics] = useState([]);
    const [clinicsLoading, setClinicsLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);
    const [priceHistoryModal, setPriceHistoryModal] = useState(false);
    const [selectedClinic, setSelectedClinic] = useState(null);
    const [priceHistory, setPriceHistory] = useState([]);
    const [priceHistoryLoading, setPriceHistoryLoading] = useState(false);

    useEffect(() => {
        loadInvitations();
        loadClinics();
    }, []);

    const loadInvitations = async () => {
        setInvLoading(true);
        try {
            const res = await getMyInvitations();
            setInvitations(res.data || []);
        } catch {
            message.error(t('error'));
        } finally {
            setInvLoading(false);
        }
    };

    const loadClinics = async () => {
        setClinicsLoading(true);
        try {
            const res = await getMyClinics();
            setClinics(res.data || []);
        } catch {
            message.error(t('error'));
        } finally {
            setClinicsLoading(false);
        }
    };

    const handleAccept = async (id) => {
        setActionLoading(id);
        try {
            await acceptInvitation(id);
            getConsultationBadgeCounts().then((res) => setConsultationBadge(res.data || {})).catch(() => {});
            message.success(t('success'));
            loadInvitations();
            loadClinics();
        } catch {
            message.error(t('error'));
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (id) => {
        setActionLoading(id);
        try {
            await rejectInvitation(id);
            getConsultationBadgeCounts().then((res) => setConsultationBadge(res.data || {})).catch(() => {});
            message.success(t('success'));
            loadInvitations();
        } catch {
            message.error(t('error'));
        } finally {
            setActionLoading(null);
        }
    };

    const openPriceHistoryModal = async (record) => {
        setSelectedClinic(record);
        setPriceHistory([]);
        setPriceHistoryModal(true);
        setPriceHistoryLoading(true);
        try {
            const res = await getDoctorClinicPriceHistory(record.clinicConsultantId);
            setPriceHistory(res.data || []);
        } catch {
            message.error(t('error'));
        } finally {
            setPriceHistoryLoading(false);
        }
    };

    const invStatusLabel = (status) => {
        const map = {
            pending: t('cons_status_created'),
            accepted: t('accept'),
            rejected: t('reject'),
        };
        return map[status] || status;
    };

    const invitationColumns = [
        {
            title: t('clinic_name'),
            dataIndex: 'clinicName',
            key: 'clinicName',
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
            render: (v) => v ? dayjs(v).format('DD.MM.YYYY') : '-',
        },
        {
            title: t('ecg_status'),
            dataIndex: 'status',
            key: 'status',
            render: (v) => (
                <Tag color={INV_STATUS_COLORS[v] || 'default'}>{invStatusLabel(v)}</Tag>
            ),
        },
        {
            title: '',
            key: 'actions',
            render: (_, record) => {
                if (record.status !== 'pending') return null;
                return (
                    <Space>
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
                                {t('accept')}
                            </Button>
                        </Popconfirm>
                        <Popconfirm
                            title={t('reject')}
                            onConfirm={() => handleReject(record.id)}
                            okText={t('reject')}
                            cancelText={t('cancel')}
                        >
                            <Button
                                size="small"
                                danger
                                icon={<CloseOutlined />}
                                loading={actionLoading === record.id}
                            >
                                {t('reject')}
                            </Button>
                        </Popconfirm>
                    </Space>
                );
            },
        },
    ];

    const clinicColumns = [
        {
            title: t('clinic_name'),
            dataIndex: 'clinicName',
            key: 'clinicName',
        },
        {
            title: t('price_per_session'),
            dataIndex: 'currentPrice',
            key: 'currentPrice',
            render: (v, record) => (
                <Space size={6}>
                    <Text strong>{v != null ? `${Number(v).toLocaleString()} UZS` : '-'}</Text>
                    <Button
                        size="small"
                        className="table_view_btn"
                        icon={<EyeOutlined />}
                        onClick={() => openPriceHistoryModal(record)}
                    />
                </Space>
            ),
        },
        {
            title: t('created_at'),
            dataIndex: 'linkedAt',
            key: 'linkedAt',
            render: (v) => v ? dayjs(v).format('DD.MM.YYYY') : '-',
        },
        {
            title: t('total_consultations'),
            dataIndex: 'totalConsultations',
            key: 'totalConsultations',
        },
        {
            title: '',
            key: 'actions',
            render: (_, record) => (
                <Button
                    size="small"
                    icon={<HistoryOutlined />}
                    onClick={() => navigate(`/doctor/clinics/${record.clinicConsultantId}/history`)}
                >
                    {t('consultation_history')}
                </Button>
            ),
        },
    ];

    const priceHistoryColumns = [
        {
            title: t('effective_from'),
            dataIndex: 'effectiveFrom',
            key: 'effectiveFrom',
            render: (v) => v ? dayjs(v).format('DD.MM.YYYY') : '-',
        },
        {
            title: t('price_per_session'),
            dataIndex: 'newPrice',
            key: 'newPrice',
            render: (v, record) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{Number(v || 0).toLocaleString()} UZS</Text>
                    {record.isActiveToday && <Tag color="green">Bugun amal qiladi</Tag>}
                </Space>
            ),
        },
        {
            title: t('created_at'),
            dataIndex: 'changedAt',
            key: 'changedAt',
            render: (v) => v ? dayjs(v).format('DD.MM.YYYY HH:mm') : '-',
        },
    ];

    const pendingInvitations = invitations.filter((item) => item.status === 'pending');

    return (
        <div className="consultation-page">
            <div className="consultation-shell">
                <div className="consultation-header">
                    <div>
                        <Title level={4} className="consultation-title">{t('my_clinics')}</Title>
                    </div>
                </div>
                <div className="consultation-body">
                    {pendingInvitations.length > 0 && (
                        <>
                            <Divider orientation="left">{t('incoming_consultations')}</Divider>
                            <Table
                                rowKey="id"
                                dataSource={pendingInvitations}
                                columns={invitationColumns}
                                loading={invLoading}
                                pagination={{ pageSize: 10 }}
                                scroll={{ x: 700 }}
                            />
                        </>
                    )}

                    <Divider orientation="left">{t('linked_clinics')}</Divider>
                    <Table
                        rowKey="clinicConsultantId"
                        dataSource={clinics}
                        columns={clinicColumns}
                        loading={clinicsLoading}
                        pagination={{ pageSize: 10 }}
                        scroll={{ x: 760 }}
                    />
                </div>
            </div>

            <Modal
                className="consultation-modal"
                open={priceHistoryModal}
                title={selectedClinic ? `${selectedClinic.clinicName} - narxlar tarixi` : 'Narxlar tarixi'}
                onCancel={() => setPriceHistoryModal(false)}
                footer={null}
                width={720}
            >
                {priceHistory.length === 0 && !priceHistoryLoading ? (
                    <Empty description="Narx tarixi hali mavjud emas" />
                ) : (
                    <Table
                        rowKey="id"
                        dataSource={priceHistory}
                        columns={priceHistoryColumns}
                        loading={priceHistoryLoading}
                        pagination={false}
                        scroll={{ x: 560 }}
                    />
                )}
            </Modal>
        </div>
    );
}
