import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Button, Tag, message, Typography, Descriptions, Divider, Spin, Space, Drawer
} from 'antd';
import { ArrowLeftOutlined, EyeOutlined, VideoCameraOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getConsultationDetailAdmin, getConsultationTokenAdmin } from '../../../host/requests/ConsultationRequest';
import LiveKitRoomView from '../../../components/video/LiveKitRoom';
import { useStore } from '../../../store/Store';
import './Consultation.css';

const { Title, Text } = Typography;

const STATUS_COLORS = {
    created: 'gold',
    reviewing: 'blue',
    completed: 'green',
    rejected: 'red',
};

const ANALYSIS_ROUTES = {
    EKG: '/ecg-analyses/view',
    SMAD: '/smad-analyses/view',
    Holter: '/holter-analyses/view',
    Lab: '/lab-analyses/view',
    Parasit: '/parasitology-analyses/view',
};

export default function ConsultationDetailAdminPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();
    const { videoCall, setVideoCall } = useStore();

    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(false);
    const [tokenLoading, setTokenLoading] = useState(false);
    const [selectedAnalysis, setSelectedAnalysis] = useState(null);

    useEffect(() => {
        loadDetail();
        const interval = setInterval(loadDetail, 15000);
        return () => clearInterval(interval);
    }, [id]);

    const loadDetail = async () => {
        setLoading(true);
        try {
            const res = await getConsultationDetailAdmin(id);
            setDetail(res.data);
        } catch {
            message.error(t('error'));
        } finally {
            setLoading(false);
        }
    };

    const handleVideoCall = async () => {
        setTokenLoading(true);
        try {
            const res = await getConsultationTokenAdmin(id);
            const { token, liveKitUrl, roomName } = res.data;
            setVideoCall({ activeRoom: { token, liveKitUrl, roomName, consultationId: Number(id) }, isCalling: false });
        } catch {
            message.error(t('error'));
        } finally {
            setTokenLoading(false);
        }
    };

    const callIsActive = videoCall.activeRoom?.consultationId === Number(id);
    const canCall = detail.status !== 'rejected';

    const statusLabel = (status) => {
        const map = {
            created: t('cons_status_created'),
            reviewing: t('cons_status_reviewing'),
            completed: t('cons_status_completed'),
            rejected: t('cons_status_rejected'),
        };
        return map[status] || status;
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 60 }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!detail) return null;

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
                        <Title level={4} className="consultation-title">
                            {t('consultation_detail')}
                        </Title>
                    </div>
                    <Space>
                        <Tag color={STATUS_COLORS[detail.status] || 'default'} style={{ fontSize: 14, padding: '4px 12px' }}>
                            {statusLabel(detail.status)}
                        </Tag>
                        {canCall && (
                            <Button
                                type="primary"
                                icon={<VideoCameraOutlined />}
                                loading={tokenLoading}
                                disabled={!detail.doctorIsOnline}
                                onClick={handleVideoCall}
                            >
                                {t('video_call')}
                            </Button>
                        )}
                    </Space>
                </div>
                <div className="consultation-body">
                    {callIsActive && (
                        <>
                            <div className="cons-video-section">
                                <LiveKitRoomView embedded />
                            </div>
                            <Divider />
                        </>
                    )}

                    {/* Patient Info */}
                    <Divider orientation="left">{t('patient_info')}</Divider>
                    <Descriptions bordered column={2} size="small">
                        <Descriptions.Item label={t('FIO')}>{detail.patientFullName}</Descriptions.Item>
                        <Descriptions.Item label={t('passport_seria')}>{detail.passportSeries}</Descriptions.Item>
                        <Descriptions.Item label={t('birthdate')}>
                            {detail.birthDate ? dayjs(detail.birthDate).format('DD.MM.YYYY') : '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('gender')}>
                            {detail.gender === true ? t('male') : detail.gender === false ? t('female') : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('phone_number')}>{detail.phone}</Descriptions.Item>
                        <Descriptions.Item label={t('address')}>{detail.address}</Descriptions.Item>
                    </Descriptions>

                    {/* Doctor Info */}
                    <Divider orientation="left">{t('doctor')}</Divider>
                    <Descriptions bordered column={2} size="small">
                        <Descriptions.Item label={t('FIO')}>{detail.doctorFullName}</Descriptions.Item>
                        <Descriptions.Item label={t('position')}>{detail.doctorPosition}</Descriptions.Item>
                        <Descriptions.Item label={t('phone_number')}>{detail.doctorPhone}</Descriptions.Item>
                        <Descriptions.Item label={t('clinic_name')}>{detail.doctorClinicName}</Descriptions.Item>
                        <Descriptions.Item label="Status">
                            <Tag color={detail.doctorIsOnline ? 'green' : 'default'}>
                                {detail.doctorIsOnline ? 'Online' : 'Offline'}
                            </Tag>
                        </Descriptions.Item>
                    </Descriptions>

                    {/* Consultation Info */}
                    <Divider orientation="left">{t('consultation')}</Divider>
                    <Descriptions bordered column={2} size="small">
                        <Descriptions.Item label={t('consultation_date')}>
                            {detail.consultationDate ? dayjs(detail.consultationDate).format('DD.MM.YYYY') : '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('price_at_creation')}>
                            {detail.priceAtCreation != null ? `${Number(detail.priceAtCreation).toLocaleString()} UZS` : '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('ecg_status')}>
                            <Tag color={STATUS_COLORS[detail.status] || 'default'}>{statusLabel(detail.status)}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label={t('created_at')}>
                            {detail.createdAt ? dayjs(detail.createdAt).format('DD.MM.YYYY') : '—'}
                        </Descriptions.Item>
                        {detail.rejectionReason && (
                            <Descriptions.Item label={t('reject_reason')} span={2}>
                                <Text type="danger">{detail.rejectionReason}</Text>
                            </Descriptions.Item>
                        )}
                    </Descriptions>

                    {/* Conclusion */}
                    {detail.conclusion && (
                        <>
                            <Divider orientation="left">{t('conclusion_info')}</Divider>
                            <Descriptions bordered column={1} size="small">
                                <Descriptions.Item label={t('patient_condition')}>
                                    {detail.conclusion.patientCondition}
                                </Descriptions.Item>
                                <Descriptions.Item label={t('diagnosis')}>
                                    {detail.conclusion.diagnosis}
                                </Descriptions.Item>
                                <Descriptions.Item label={t('treatment')}>
                                    {detail.conclusion.treatment}
                                </Descriptions.Item>
                                <Descriptions.Item label={t('created_at')}>
                                    {detail.conclusion.createdAt ? dayjs(detail.conclusion.createdAt).format('DD.MM.YYYY HH:mm') : '—'}
                                </Descriptions.Item>
                            </Descriptions>
                        </>
                    )}

                    {/* Analyses */}
                    {detail.analyses && detail.analyses.length > 0 && (
                        <>
                            <Divider orientation="left">{t('shared_analyses')}</Divider>
                            {detail.analyses.map((a) => {
                                const route = ANALYSIS_ROUTES[a.type || a.analysisType];
                                return (
                                <div key={`${a.type}-${a.id}`} className="cons-analysis-card">
                                    <div className="cons-analysis-card-header">
                                        <Space>
                                            <Tag color="blue">{a.type || a.analysisType}</Tag>
                                            <Text strong>#{a.id}</Text>
                                        </Space>
                                        {route && (
                                            <Button
                                                size="small"
                                                icon={<EyeOutlined />}
                                                onClick={() => setSelectedAnalysis({ ...a, route })}
                                            >
                                                {t('view_analyse')}
                                            </Button>
                                        )}
                                    </div>
                                    {a.date && (
                                        <Text type="secondary">
                                            {dayjs(a.date).format('DD.MM.YYYY')}
                                        </Text>
                                    )}
                                </div>
                            );})}
                        </>
                    )}
                </div>
            </div>

            <Drawer
                open={!!selectedAnalysis}
                onClose={() => setSelectedAnalysis(null)}
                width="min(1100px, 96vw)"
                title={selectedAnalysis ? `${selectedAnalysis.type || selectedAnalysis.analysisType} #${selectedAnalysis.id}` : ''}
                destroyOnClose
            >
                {selectedAnalysis?.route && (
                    <iframe
                        title="analysis-viewer"
                        src={`${selectedAnalysis.route}/${selectedAnalysis.id}`}
                        style={{ width: '100%', height: 'calc(100vh - 120px)', border: 0 }}
                    />
                )}
            </Drawer>
        </div>
    );
}
