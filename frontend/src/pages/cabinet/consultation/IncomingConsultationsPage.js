import React, { useState, useEffect, useCallback } from 'react';
import {
    Card, Tag, Button, Select, Typography, Spin, Empty,
    Row, Col, Drawer, List, Modal, Input, notification, Popconfirm, Space
} from 'antd';
import { useTranslation } from 'react-i18next';
import {
    getIncomingConsultations,
    getConsultationAnalyses,
    acceptConsultation,
    rejectConsultation
} from '../../../host/requests/ConsultationRequest';
import { useStore } from '../../../store/Store';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

const STATUS_COLORS = {
    pending: 'gold', accepted: 'blue', scheduled: 'purple',
    concluded: 'green', rejected: 'red', expired: 'default', cancelled: 'default',
};

export default function IncomingConsultationsPage() {
    const { t } = useTranslation();
    const { setConsultationBadge } = useStore();

    const [data, setData]           = useState([]);
    const [loading, setLoading]     = useState(false);
    const [statusFilter, setStatusFilter] = useState(null);

    // Tahlillar drawer
    const [drawerOpen, setDrawerOpen]   = useState(false);
    const [drawerData, setDrawerData]   = useState([]);
    const [drawerLoading, setDrawerLoading] = useState(false);

    // Rad etish modal
    const [rejectModal, setRejectModal] = useState({ open: false, id: null });
    const [rejectReason, setRejectReason] = useState('');
    const [rejectLoading, setRejectLoading] = useState(false);

    const [actionLoading, setActionLoading] = useState({});

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = statusFilter ? { status: statusFilter } : {};
            const res = await getIncomingConsultations(params);
            const items = res.data || [];
            setData(items);
            // Pending soni badge uchun
            const pending = items.filter(i => i.status === 'pending').length;
            setConsultationBadge({ doctorPendingCount: pending });
        } catch { }
        finally { setLoading(false); }
    }, [statusFilter, setConsultationBadge]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // SignalR — yangi so'rov kelganda yangilash
    useEffect(() => {
        const handler = () => fetchData();
        window.addEventListener('consultation-request-received', handler);
        window.addEventListener('consultation-status-changed', handler);
        return () => {
            window.removeEventListener('consultation-request-received', handler);
            window.removeEventListener('consultation-status-changed', handler);
        };
    }, [fetchData]);

    const handleViewAnalyses = async (id) => {
        setDrawerLoading(true);
        setDrawerOpen(true);
        try {
            const res = await getConsultationAnalyses(id);
            setDrawerData(res.data || []);
        } catch { }
        finally { setDrawerLoading(false); }
    };

    const handleAccept = async (id) => {
        setActionLoading(p => ({ ...p, [id]: 'accept' }));
        try {
            await acceptConsultation(id);
            notification.success({ message: t('accept') });
            fetchData();
        } catch (e) {
            notification.error({ message: e?.response?.data?.message || 'Xatolik' });
        } finally { setActionLoading(p => ({ ...p, [id]: null })); }
    };

    const handleRejectSubmit = async () => {
        if (!rejectReason.trim()) return;
        setRejectLoading(true);
        try {
            await rejectConsultation(rejectModal.id, { rejectionReason: rejectReason });
            notification.success({ message: t('reject') });
            setRejectModal({ open: false, id: null });
            setRejectReason('');
            fetchData();
        } catch (e) {
            notification.error({ message: e?.response?.data?.message || 'Xatolik' });
        } finally { setRejectLoading(false); }
    };

    const statusOptions = [
        { value: null,                label: t('all_statuses') },
        { value: 'pending',           label: t('cons_status_pending') },
        { value: 'accepted',          label: t('cons_status_accepted') },
        { value: 'scheduled,accepted',label: 'Faol' },
        { value: 'concluded',         label: t('cons_status_concluded') },
        { value: 'rejected',          label: t('cons_status_rejected') },
    ];

    return (
        <div style={{ padding: '0 8px' }}>
            <Title level={4}>{t('incoming_consultations')}</Title>

            <div style={{ marginBottom: 12 }}>
                <Select
                    style={{ width: 200 }}
                    options={statusOptions}
                    value={statusFilter}
                    onChange={setStatusFilter}
                    placeholder={t('filter_by_status')}
                    allowClear
                />
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
            ) : data.length === 0 ? (
                <Empty description={t('no_incoming')} />
            ) : (
                <Row gutter={[12, 12]}>
                    {data.map(item => (
                        <Col key={item.id} xs={24} md={12} lg={8}>
                            <Card
                                size="small"
                                style={{ borderRadius: 10 }}
                                title={
                                    <Space>
                                        <Tag color={STATUS_COLORS[item.status] || 'default'}>
                                            {t(`cons_status_${item.status}`) || item.status}
                                        </Tag>
                                        {item.isFirstRequest && (
                                            <Tag color="cyan" style={{ fontSize: 11 }}>
                                                {t('first_request_badge')}
                                            </Tag>
                                        )}
                                    </Space>
                                }
                            >
                                <div style={{ marginBottom: 4 }}>
                                    <Text strong>{item.clinicName}</Text>
                                </div>
                                <div style={{ marginBottom: 4 }}>
                                    <Text>{item.patientName}</Text>
                                    {item.patientAge && (
                                        <Text type="secondary" style={{ marginLeft: 6 }}>
                                            {item.patientAge} {t('years_old')}
                                        </Text>
                                    )}
                                </div>
                                <div style={{ marginBottom: 4 }}>
                                    {item.analysisSummary?.map(a => (
                                        <Tag key={a.analysisType}>{a.analysisType} ×{a.count}</Tag>
                                    ))}
                                </div>
                                {item.note && (
                                    <div style={{ marginBottom: 8 }}>
                                        <Text type="secondary" italic style={{ fontSize: 12 }}>
                                            "{item.note}"
                                        </Text>
                                    </div>
                                )}
                                <div style={{ marginBottom: 8 }}>
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                        {dayjs(item.createdAt).format('DD.MM.YYYY HH:mm')}
                                    </Text>
                                </div>

                                <Space wrap>
                                    <Button
                                        size="small"
                                        onClick={() => handleViewAnalyses(item.id)}
                                    >
                                        {t('view_analyses')}
                                    </Button>
                                    {item.status === 'pending' && (
                                        <>
                                            <Popconfirm
                                                title={t('confirm_accept')}
                                                onConfirm={() => handleAccept(item.id)}
                                                okText={t('accept')}
                                                cancelText={t('back')}
                                            >
                                                <Button
                                                    type="primary"
                                                    size="small"
                                                    loading={actionLoading[item.id] === 'accept'}
                                                >
                                                    {t('accept')}
                                                </Button>
                                            </Popconfirm>
                                            <Button
                                                danger
                                                size="small"
                                                onClick={() => setRejectModal({ open: true, id: item.id })}
                                            >
                                                {t('reject')}
                                            </Button>
                                        </>
                                    )}
                                </Space>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}

            {/* Tahlillar Drawer */}
            <Drawer
                title={t('shared_analyses')}
                open={drawerOpen}
                onClose={() => { setDrawerOpen(false); setDrawerData([]); }}
                width={360}
            >
                {drawerLoading ? (
                    <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                ) : drawerData.length === 0 ? (
                    <Empty />
                ) : (
                    <List
                        dataSource={drawerData}
                        renderItem={item => (
                            <List.Item>
                                <List.Item.Meta
                                    title={<Tag color="blue">{item.analysisType}</Tag>}
                                    description={
                                        <>
                                            {item.createdAt && (
                                                <div>{dayjs(item.createdAt).format('DD.MM.YYYY')}</div>
                                            )}
                                            {item.aiSummary && (
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    {item.aiSummary}
                                                </Text>
                                            )}
                                        </>
                                    }
                                />
                            </List.Item>
                        )}
                    />
                )}
            </Drawer>

            {/* Rad etish modali */}
            <Modal
                open={rejectModal.open}
                title={t('rejection_reason')}
                onCancel={() => { setRejectModal({ open: false, id: null }); setRejectReason(''); }}
                onOk={handleRejectSubmit}
                okText={t('reject')}
                cancelText={t('back')}
                okButtonProps={{ danger: true, loading: rejectLoading, disabled: !rejectReason.trim() }}
            >
                <TextArea
                    rows={3}
                    placeholder={t('enter_rejection_reason')}
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                />
            </Modal>
        </div>
    );
}
