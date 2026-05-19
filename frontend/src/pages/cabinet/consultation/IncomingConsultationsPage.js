import React, { useState, useEffect, useCallback } from 'react';
import {
    Card, Tag, Button, Select, Typography, Spin, Empty,
    Row, Col, Drawer, List, Modal, Input, notification, Popconfirm, Space, Alert
} from 'antd';
import { MedicineBoxOutlined, FileTextOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
    getIncomingConsultations,
    getMyConsultantInvitations,
    getMyLinkedClinics,
    acceptConsultantInvitation,
    rejectConsultantInvitation,
    unlinkConsultantClinic,
    getConsultationAnalyses,
    getConsultationPatientAnalyses,
    acceptConsultation,
    rejectConsultation
} from '../../../host/requests/ConsultationRequest';
import { useStore } from '../../../store/Store';
import dayjs from 'dayjs';
import './Consultation.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

const STATUS_COLORS = {
    pending: 'gold', accepted: 'blue', scheduled: 'purple',
    concluded: 'green', rejected: 'red', expired: 'default', cancelled: 'default',
};

const ANALYSIS_ROUTES = {
    EKG: '/ecg-analyses/view', Lab: '/lab-analyses/view',
    Holter: '/holter-analyses/view', SMAD: '/smad-analyses/view',
    Parasit: '/parasitology-analyses/view',
};

const TYPE_COLOR = {
    EKG: 'blue', Lab: 'green', Holter: 'purple', SMAD: 'orange', Parasit: 'cyan',
};

export default function IncomingConsultationsPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { setConsultationBadge } = useStore();

    const [data, setData]             = useState([]);
    const [loading, setLoading]       = useState(false);
    const [statusFilter, setStatusFilter] = useState(null);
    const [invitations, setInvitations] = useState([]);
    const [linkedClinics, setLinkedClinics] = useState([]);

    // Tahlillar drawer
    const [drawerOpen, setDrawerOpen]       = useState(false);
    const [drawerData, setDrawerData]       = useState([]);
    const [drawerLoading, setDrawerLoading] = useState(false);
    const [allPatAnalyses, setAllPatAnalyses]   = useState([]);
    const [allPatLoading, setAllPatLoading]     = useState(false);

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
            const [invitationRes, clinicsRes] = await Promise.all([
                getMyConsultantInvitations({ status: 'pending,rejected' }),
                getMyLinkedClinics(),
            ]);
            setInvitations(invitationRes.data || []);
            setLinkedClinics(clinicsRes.data || []);
            const pending = items.filter(i => i.status === 'pending').length;
            setConsultationBadge({ doctorPendingCount: pending });
        } catch { }
        finally { setLoading(false); }
    }, [statusFilter, setConsultationBadge]);

    useEffect(() => { fetchData(); }, [fetchData]);

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
        setDrawerOpen(true);
        setDrawerData([]);
        setAllPatAnalyses([]);
        setDrawerLoading(true);
        setAllPatLoading(true);
        try {
            const [shared, all] = await Promise.allSettled([
                getConsultationAnalyses(id),
                getConsultationPatientAnalyses(id),
            ]);
            setDrawerData(shared.status === 'fulfilled' ? (shared.value.data || []) : []);
            setAllPatAnalyses(all.status === 'fulfilled' ? (all.value.data || []) : []);
        } finally {
            setDrawerLoading(false);
            setAllPatLoading(false);
        }
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

    const handleAcceptInvitation = async (id) => {
        await acceptConsultantInvitation(id);
        notification.success({ message: 'Taklif qabul qilindi' });
        fetchData();
    };

    const handleRejectInvitation = async (id) => {
        await rejectConsultantInvitation(id);
        notification.success({ message: 'Taklif rad etildi' });
        fetchData();
    };

    const handleUnlinkClinic = async (id) => {
        await unlinkConsultantClinic(id);
        notification.success({ message: 'Klinika bilan aloqa uzildi' });
        fetchData();
    };

    const statusOptions = [
        { value: null,                label: t('all_statuses') },
        { value: 'pending',           label: t('cons_status_pending') },
        { value: 'accepted',          label: t('cons_status_accepted') },
        { value: 'concluded',         label: t('cons_status_concluded') },
        { value: 'rejected',          label: t('cons_status_rejected') },
    ];

    const consultations   = data.filter(i => !i.isLinkRequest);
    const pendingCount = data.filter(item => item.status === 'pending').length;
    const activeConsultations = consultations.filter(item => item.status === 'accepted' || item.status === 'scheduled');
    const concludedConsultations = consultations.filter(item => item.status === 'concluded');

    const renderCard = (item) => (
        <Col key={item.id} xs={24} md={12} lg={8}>
            <Card
                size="small"
                className="consultation-request-card"
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
                <div className="consultation-card-meta">
                    <Text strong>{item.clinicName}</Text>

                {item.patientName && (
                    <div>
                        <Text>{item.patientName}</Text>
                        {item.patientAge && (
                            <Text type="secondary" style={{ marginLeft: 6 }}>
                                {item.patientAge} {t('years_old')}
                            </Text>
                        )}
                    </div>
                )}

                {item.analysisSummary?.length > 0 && (
                    <div>
                        {item.analysisSummary.map(a => (
                            <Tag key={a.analysisType}>{a.analysisType} ×{a.count}</Tag>
                        ))}
                    </div>
                )}

                {item.note && (
                    <div>
                        <Text type="secondary" italic style={{ fontSize: 12 }}>
                            "{item.note}"
                        </Text>
                    </div>
                )}
                <div>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        {dayjs(item.createdAt).format('DD.MM.YYYY HH:mm')}
                    </Text>
                </div>

                </div>
                <Space wrap className="consultation-card-actions">
                    <Button size="small" onClick={() => handleViewAnalyses(item.id)}>
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
                    {(item.status === 'accepted' || item.status === 'scheduled') && (
                        <Button
                            size="small"
                            icon={<FileTextOutlined />}
                            onClick={() => navigate(`/consultations/${item.id}/work`)}
                        >
                            Ishni davom ettirish
                        </Button>
                    )}
                </Space>
            </Card>
        </Col>
    );

    return (
        <div className="consultation-page">
            <section className="consultation-shell">
                <div className="consultation-header">
                    <div>
                        <Title level={4} className="consultation-title">{t('incoming_consultations')}</Title>
                        <Text className="consultation-subtitle">
                            Yangi so'rovlarni tez ko'ring, tahlillarni oching va navbatdagi harakatni bajaring.
                        </Text>
                    </div>
                </div>
                <div className="consultation-body">
                    <div className="consultation-summary-grid">
                        <div className="consultation-summary-card">
                            <div className="consultation-summary-label">Jami kiruvchi</div>
                            <div className="consultation-summary-value">{data.length}</div>
                        </div>
                        <div className="consultation-summary-card">
                            <div className="consultation-summary-label">Javob kutilmoqda</div>
                            <div className="consultation-summary-value">{pendingCount}</div>
                        </div>
                        <div className="consultation-summary-card">
                            <div className="consultation-summary-label">Klinika takliflari</div>
                            <div className="consultation-summary-value">{invitations.filter(item => item.status === 'pending').length}</div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="consultation-shell">
                <div className="consultation-body">
                    <div className="consultation-flow">
                        <div className="consultation-flow-item">
                            <span className="consultation-flow-step">1</span>
                            <div className="consultation-flow-title">So'rovni ko'ring</div>
                            <div className="consultation-flow-copy">Klinika, bemor va ulashilgan tahlillarni tekshiring.</div>
                        </div>
                        <div className="consultation-flow-item">
                            <span className="consultation-flow-step">2</span>
                            <div className="consultation-flow-title">Qaror bering</div>
                            <div className="consultation-flow-copy">Mos bo'lsa qabul qiling, bo'lmasa sabab bilan rad eting.</div>
                        </div>
                        <div className="consultation-flow-item">
                            <span className="consultation-flow-step">3</span>
                            <div className="consultation-flow-title">Ishni davom ettiring</div>
                            <div className="consultation-flow-copy">Faol konsultatsiyani ish sahifasida yakunlang.</div>
                        </div>
                        <div className="consultation-flow-item">
                            <span className="consultation-flow-step">4</span>
                            <div className="consultation-flow-title">Xulosa yuboring</div>
                            <div className="consultation-flow-copy">Tashxis va tavsiyalarni saqlab jarayonni yakunlang.</div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="consultation-shell">
                <div className="consultation-body">
                    <div className="consultation-queue-grid">
                        <div className="consultation-queue-card is-primary">
                            <div className="consultation-queue-title">1. Yangi so'rovlar</div>
                            <div className="consultation-queue-copy">Avval pending so'rovlarni ko'ring va qaror qiling. Hozir: {pendingCount}</div>
                        </div>
                        <div className="consultation-queue-card">
                            <div className="consultation-queue-title">2. Faol ishlar</div>
                            <div className="consultation-queue-copy">Qabul qilingan konsultatsiyalar davom ettiriladi. Hozir: {activeConsultations.length}</div>
                        </div>
                        <div className="consultation-queue-card">
                            <div className="consultation-queue-title">3. Yakunlanganlar</div>
                            <div className="consultation-queue-copy">Xulosa yuborilgan konsultatsiyalar arxivda qoladi. Hozir: {concludedConsultations.length}</div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="consultation-shell">
                <div className="consultation-header">
                    <div>
                        <Title level={5} className="consultation-title">Men konsultant bo'lgan klinikalar</Title>
                        <Text className="consultation-subtitle">
                            Qaysi klinikalar sizni online konsultant sifatida biriktirganini shu yerda boshqarasiz.
                        </Text>
                    </div>
                </div>
                <div className="consultation-body">
                    {linkedClinics.length === 0 ? (
                        <Empty description="Hozircha biriktirilgan klinika yo'q" />
                    ) : (
                        <Row gutter={[12, 12]}>
                            {linkedClinics.map(item => (
                                <Col key={item.clinicConsultantId} xs={24} md={12} lg={8}>
                                    <Card size="small" className="consultation-request-card">
                                        <Text strong>{item.clinicName}</Text>
                                        <div style={{ marginTop: 8 }}>
                                            <Text type="secondary">
                                                Jami konsultatsiyalar: {item.totalConsultations}
                                            </Text>
                                        </div>
                                        <Button
                                            danger
                                            size="small"
                                            style={{ marginTop: 12 }}
                                            onClick={() => handleUnlinkClinic(item.clinicConsultantId)}
                                        >
                                            Klinikadan uzilish
                                        </Button>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    )}
                </div>
            </section>

            <section className="consultation-shell">
                <div className="consultation-header">
                    <div>
                        <Title level={5} className="consultation-title">Konsultant bo'lish takliflari</Title>
                        <Text className="consultation-subtitle">
                            Klinikalar yuborgan takliflarni qabul qilishingiz yoki rad etishingiz mumkin.
                        </Text>
                    </div>
                </div>
                <div className="consultation-body">
                    {invitations.length === 0 ? (
                        <Empty description="Yangi takliflar yo'q" />
                    ) : (
                        <Row gutter={[12, 12]}>
                            {invitations.map(item => (
                                <Col key={item.id} xs={24} md={12} lg={8}>
                                    <Card size="small" className="consultation-request-card">
                                        <Space direction="vertical" size={6}>
                                            <Text strong>{item.clinicName}</Text>
                                            <Tag color={item.status === 'pending' ? 'gold' : 'red'}>
                                                {item.status === 'pending' ? 'Kutmoqda' : 'Rad etildi'}
                                            </Tag>
                                            {item.note && <Text type="secondary">{item.note}</Text>}
                                        </Space>
                                        {item.status === 'pending' && (
                                            <Space wrap style={{ marginTop: 12 }}>
                                                <Button type="primary" size="small" onClick={() => handleAcceptInvitation(item.id)}>
                                                    Qabul qilish
                                                </Button>
                                                <Button danger size="small" onClick={() => handleRejectInvitation(item.id)}>
                                                    Rad etish
                                                </Button>
                                            </Space>
                                        )}
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    )}
                </div>
            </section>

            <section className="consultation-shell">
                <div className="consultation-body">
                    <div className="consultation-toolbar">
                        <div className="consultation-filters">
                            <Select
                                style={{ width: 220 }}
                                options={statusOptions}
                                value={statusFilter}
                                onChange={setStatusFilter}
                                placeholder={t('filter_by_status')}
                                allowClear
                            />
                        </div>
                    </div>

                    {loading ? (
                <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
            ) : data.length === 0 ? (
                <Empty description={t('no_incoming')} />
            ) : (
                <>
                    {consultations.length > 0 && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                <MedicineBoxOutlined style={{ color: '#1677ff' }} />
                                <Text strong style={{ color: '#1677ff' }}>
                                    Konsultatsiya so'rovlari
                                </Text>
                            </div>
                            <Row gutter={[12, 12]}>
                                {consultations.map(renderCard)}
                            </Row>
                        </div>
                    )}
                </>
                    )}
                </div>
            </section>

            {/* Tahlillar Drawer */}
            <Drawer
                title={t('shared_analyses')}
                open={drawerOpen}
                onClose={() => { setDrawerOpen(false); setDrawerData([]); setAllPatAnalyses([]); }}
                width={620}
            >
                {/* ── Ulashilgan tahlillar ── */}
                <Text strong style={{ display: 'block', marginBottom: 8 }}>
                    {t('shared_analyses')}
                </Text>
                {drawerLoading ? (
                    <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
                ) : drawerData.length === 0 ? (
                    <Empty description="Tahlil ulashilmagan" style={{ marginBottom: 24 }} />
                ) : (
                    <List
                        dataSource={drawerData}
                        style={{ marginBottom: 24 }}
                        renderItem={item => {
                            const route = ANALYSIS_ROUTES[item.analysisType];
                            return (
                                <List.Item
                                    actions={route ? [
                                        <Button
                                            key="view"
                                            size="small"
                                            type="primary"
                                            onClick={() => navigate(`${route}/${item.analysisId}`)}
                                        >
                                            {t('view') || "Ko'rish"}
                                        </Button>
                                    ] : []}
                                >
                                    <List.Item.Meta
                                        title={
                                            <Space>
                                                <Tag color={TYPE_COLOR[item.analysisType] || 'default'}>
                                                    {item.analysisType}
                                                </Tag>
                                                {item.createdAt && (
                                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                                        {dayjs(item.createdAt).format('DD.MM.YYYY')}
                                                    </Text>
                                                )}
                                            </Space>
                                        }
                                        description={
                                            item.aiSummary ? (
                                                <div
                                                    style={{
                                                        fontSize: 12, color: '#595959',
                                                        whiteSpace: 'pre-wrap',
                                                        maxHeight: 200, overflowY: 'auto',
                                                        background: '#fafafa', padding: '6px 8px',
                                                        borderRadius: 4, marginTop: 4,
                                                    }}
                                                >
                                                    {item.aiSummary}
                                                </div>
                                            ) : null
                                        }
                                    />
                                </List.Item>
                            );
                        }}
                    />
                )}

                {/* ── Bemorning barcha tahlillari ── */}
                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16, marginTop: 8 }}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                        Bemorning barcha tahlillari
                    </Text>
                    {allPatLoading ? (
                        <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
                    ) : allPatAnalyses.length === 0 ? (
                        <Empty description="Tahlillar topilmadi" />
                    ) : (
                        <List
                            size="small"
                            dataSource={allPatAnalyses}
                            renderItem={item => {
                                const route = ANALYSIS_ROUTES[item.analysisType];
                                return (
                                    <List.Item
                                        actions={route ? [
                                            <Button
                                                key="view"
                                                size="small"
                                                type="link"
                                                onClick={() => navigate(`${route}/${item.analysisId}`)}
                                            >
                                                {t('view') || "Ko'rish"}
                                            </Button>
                                        ] : []}
                                    >
                                        <Space>
                                            <Tag color={TYPE_COLOR[item.analysisType] || 'default'}>
                                                {item.analysisType}
                                            </Tag>
                                            {item.createdAt && (
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    {dayjs(item.createdAt).format('DD.MM.YYYY')}
                                                </Text>
                                            )}
                                            {item.aiSummary && (
                                                <Text type="secondary" style={{ fontSize: 11 }}>
                                                    {item.aiSummary.length > 80
                                                        ? item.aiSummary.slice(0, 80) + '...'
                                                        : item.aiSummary}
                                                </Text>
                                            )}
                                        </Space>
                                    </List.Item>
                                );
                            }}
                        />
                    )}
                </div>
            </Drawer>

            {/* Rad etish modali */}
            <Modal
                className="consultation-modal"
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
