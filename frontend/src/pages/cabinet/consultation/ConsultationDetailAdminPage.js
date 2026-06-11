import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Button, Tag, message, Typography, Descriptions, Divider, Spin, Space
} from 'antd';
import { ArrowLeftOutlined, DownloadOutlined, EyeOutlined, VideoCameraOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getConsultationDetailAdmin, getConsultationTokenAdmin } from '../../../host/requests/ConsultationRequest';
import { downloadReport } from '../../../host/requests/ReportRequest';
import { initiateConsultationCall } from '../../../hooks/videoSignalRService';
import LiveKitRoomView from '../../../components/video/LiveKitRoom';
import { useStore } from '../../../store/Store';
import ConsultationAnalysisInlineView, { normalizeAnalysisType } from './ConsultationAnalysisInlineView';
import './Consultation.css';

const { Title, Text } = Typography;

const STATUS_COLORS = {
    created: 'gold',
    reviewing: 'blue',
    completed: 'green',
    rejected: 'red',
};

export default function ConsultationDetailAdminPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();
    const { videoCall, setVideoCall } = useStore();

    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(false);
    const [tokenLoading, setTokenLoading] = useState(false);
    const [expandedAnalysisKey, setExpandedAnalysisKey] = useState(null);

    const loadDetail = useCallback(async ({ silent = false } = {}) => {
        if (!silent) setLoading(true);
        try {
            const res = await getConsultationDetailAdmin(id);
            setDetail(res.data);
        } catch {
            if (!silent) message.error(t('error'));
        } finally {
            if (!silent) setLoading(false);
        }
    }, [id, t]);

    useEffect(() => {
        loadDetail();
        const interval = setInterval(() => loadDetail({ silent: true }), 30000);
        return () => clearInterval(interval);
    }, [id, loadDetail]);

    const handleVideoCall = async () => {
        setTokenLoading(true);
        try {
            const res = await getConsultationTokenAdmin(id);
            const { token, liveKitUrl, roomName } = res.data;
            setVideoCall({
                activeRoom: {
                    token,
                    liveKitUrl,
                    roomName,
                    consultationId: Number(id),
                    peerName: detail?.doctorFullName || null,
                },
                isCalling: false,
            });
            await initiateConsultationCall(Number(id), roomName);
        } catch {
            message.error(t('error'));
        } finally {
            setTokenLoading(false);
        }
    };

    const handleDownloadPdf = async () => {
        try {
            await downloadReport('consultation', id);
        } catch {
            message.error(t('error'));
        }
    };

    const callIsActive = videoCall.activeRoom?.consultationId === Number(id);
    const canCall = detail?.status !== 'rejected';

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
                        {detail.conclusion && (
                            <Button icon={<DownloadOutlined />} onClick={handleDownloadPdf}>
                                PDF
                            </Button>
                        )}
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
                                const type = normalizeAnalysisType(a);
                                const analysisKey = `${type}-${a.id}`;
                                const isExpanded = expandedAnalysisKey === analysisKey;
                                return (
                                <div key={analysisKey} className={`cons-analysis-card ${isExpanded ? 'is-expanded' : ''}`}>
                                    <div className="cons-analysis-card-header">
                                        <Space>
                                            <Tag color="blue">{type}</Tag>
                                            <Text strong>#{a.id}</Text>
                                        </Space>
                                        <Button
                                            size="small"
                                            icon={<EyeOutlined />}
                                            onClick={() => setExpandedAnalysisKey(isExpanded ? null : analysisKey)}
                                        >
                                            {isExpanded ? (t('hide') || 'Yopish') : t('view_analyse')}
                                        </Button>
                                    </div>
                                    {a.date && (
                                        <Text type="secondary">
                                            {dayjs(a.date).format('DD.MM.YYYY')}
                                        </Text>
                                    )}
                                    <div className="cons-analysis-meta-row">
                                        {a.clinicName && (
                                            <Text type="secondary">
                                                <b>{t('clinic_name')}:</b> {a.clinicName}
                                            </Text>
                                        )}
                                        {a.createdByFullName && (
                                            <Text type="secondary">
                                                <b>{t('doctor_of_created')}:</b> {a.createdByFullName}
                                            </Text>
                                        )}
                                    </div>
                                    {isExpanded && (
                                        <ConsultationAnalysisInlineView analysis={a} />
                                    )}
                                </div>
                            );})}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
