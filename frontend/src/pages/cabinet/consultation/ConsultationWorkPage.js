import React, { useState, useEffect, useCallback } from 'react';
import {
    Card, Tag, Button, Input, Typography, Spin, Space,
    notification, Divider, Checkbox, Descriptions, Form, Empty
} from 'antd';
import { ArrowLeftOutlined, VideoCameraOutlined, SendOutlined, EyeOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
    getConsultationById,
    getConsultationAnalyses,
    getConsultationPatientAnalyses,
    concludeConsultation,
    getConsultationLiveKitToken
} from '../../../host/requests/ConsultationRequest';
import { useStore } from '../../../store/Store';
import { initiateConsultationCall } from '../../../hooks/videoSignalRService';
import LiveKitRoomView from '../../../components/video/LiveKitRoom';
import dayjs from 'dayjs';
import './Consultation.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

const TYPE_COLOR = {
    EKG: 'blue', Lab: 'green', Holter: 'purple', SMAD: 'orange',
    Parasitology: 'cyan', Parasit: 'cyan',
};

const ANALYSIS_ROUTES = {
    EKG: '/ecg-analyses/view',
    Lab: '/lab-analyses/view',
    Holter: '/holter-analyses/view',
    SMAD: '/smad-analyses/view',
    Parasit: '/parasitology-analyses/view',
    Parasitology: '/parasitology-analyses/view',
};

const STATUS_COLORS = {
    pending: 'gold', accepted: 'blue', scheduled: 'purple',
    concluded: 'green', rejected: 'red', expired: 'default', cancelled: 'default',
};

// ── Tahlil kartasi ────────────────────────────────────────────────────────────
function AnalysisCard({ item, navigate, t, compact = false }) {
    const route = ANALYSIS_ROUTES[item.analysisType];
    return (
        <div className="cons-analysis-card">
            <div className="cons-analysis-card-header">
                <Space>
                    <Tag color={TYPE_COLOR[item.analysisType] || 'default'} style={{ fontWeight: 600 }}>
                        {item.analysisType}
                    </Tag>
                    {item.createdAt && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {dayjs(item.createdAt).format('DD.MM.YYYY')}
                        </Text>
                    )}
                </Space>
                {route && (
                    <Button
                        size="small"
                        type={compact ? 'link' : 'default'}
                        icon={<EyeOutlined />}
                        onClick={() => navigate(`${route}/${item.analysisId}`)}
                    >
                        {t('view') || "Ko'rish"}
                    </Button>
                )}
            </div>
            {item.aiSummary ? (
                compact ? (
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                        {item.aiSummary.length > 120
                            ? item.aiSummary.slice(0, 120) + '…'
                            : item.aiSummary}
                    </Text>
                ) : (
                    <div className="cons-analysis-ai-text">
                        {item.aiSummary}
                    </div>
                )
            ) : (
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                    AI tahlili mavjud emas
                </Text>
            )}
        </div>
    );
}

// ── Asosiy sahifa ─────────────────────────────────────────────────────────────
export default function ConsultationWorkPage() {
    const { t }    = useTranslation();
    const navigate = useNavigate();
    const { id }   = useParams();
    const { videoCall, setVideoCall } = useStore();

    const [detail, setDetail]           = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [analyses, setAnalyses]       = useState([]);
    const [anaLoading, setAnaLoading]   = useState(false);
    const [patientAnalyses, setPatientAnalyses] = useState([]);
    const [patLoading, setPatLoading]   = useState(false);

    const [form] = Form.useForm();
    const [followUp, setFollowUp]       = useState(false);
    const [concluding, setConcluding]   = useState(false);
    const [videoLoading, setVideoLoading] = useState(false);

    const fetchDetail = useCallback(async () => {
        setDetailLoading(true);
        try {
            const res = await getConsultationById(id);
            setDetail(res.data);
        } catch { }
        finally { setDetailLoading(false); }
    }, [id]);

    const fetchAnalyses = useCallback(async () => {
        setAnaLoading(true);
        try {
            const res = await getConsultationAnalyses(id);
            setAnalyses(res.data || []);
        } catch { }
        finally { setAnaLoading(false); }
    }, [id]);

    const fetchPatientAnalyses = useCallback(async () => {
        setPatLoading(true);
        try {
            const res = await getConsultationPatientAnalyses(id);
            setPatientAnalyses(res.data || []);
        } catch { }
        finally { setPatLoading(false); }
    }, [id]);

    useEffect(() => {
        fetchDetail();
        fetchAnalyses();
        fetchPatientAnalyses();
    }, [fetchDetail, fetchAnalyses, fetchPatientAnalyses]);

    useEffect(() => {
        const handler = () => fetchDetail();
        window.addEventListener('consultation-status-changed', handler);
        return () => window.removeEventListener('consultation-status-changed', handler);
    }, [fetchDetail]);

    const handleStartVideo = async () => {
        setVideoLoading(true);
        try {
            const res = await getConsultationLiveKitToken(id);
            const { token, liveKitUrl, roomName } = res.data;
            setVideoCall({ activeRoom: { token, liveKitUrl, roomName, consultationId: Number(id) } });
            initiateConsultationCall(parseInt(id), roomName);
        } catch (e) {
            notification.error({ message: e?.response?.data?.message || t('start_video_call') + ' xatolik' });
        } finally { setVideoLoading(false); }
    };

    const handleConclude = async () => {
        try {
            const values = await form.validateFields();
            setConcluding(true);
            await concludeConsultation(id, {
                diagnosis:        values.diagnosis,
                recommendations:  values.recommendations,
                medications:      values.medications || null,
                followUpRequired: followUp,
                followUpNote:     followUp ? (values.followUpNote || null) : null,
            });
            notification.success({ message: t('conclusion_info') });
            navigate(`/consultations/${id}`);
        } catch (e) {
            if (e?.response?.data?.message) {
                notification.error({ message: e.response.data.message });
            }
        } finally { setConcluding(false); }
    };

    if (detailLoading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
    if (!detail) return null;

    const canWork       = detail.status === 'accepted' || detail.status === 'scheduled';
    const alreadyConcluded = detail.status === 'concluded';
    const videoActive   = videoCall.activeRoom?.consultationId === Number(id);

    return (
        <div className="consultation-page" style={{ maxWidth: 1280 }}>
            <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(`/consultations/${id}`)}
                style={{ marginBottom: 16 }}
            >
                {t('back')}
            </Button>

            {/* ── Bemor sarlavhasi ── */}
            <section className="consultation-shell">
                <div className="consultation-header">
                    <div>
                        <Title level={4} className="consultation-title">Konsultatsiya ish maydoni</Title>
                        <Text className="consultation-subtitle">
                            {detail.patientName} — tahlillarni ko'ring va yakuniy xulosani yuboring.
                        </Text>
                    </div>
                    <Space wrap>
                        <Tag color={STATUS_COLORS[detail.status] || 'default'} style={{ fontSize: 13 }}>
                            {t(`cons_status_${detail.status}`) || detail.status}
                        </Tag>
                        {canWork && !videoActive && (
                            <Button
                                type="primary"
                                icon={<VideoCameraOutlined />}
                                loading={videoLoading}
                                onClick={handleStartVideo}
                            >
                                {t('start_video_call')}
                            </Button>
                        )}
                    </Space>
                </div>
                <div className="consultation-body">
                    <Descriptions column={{ xs: 1, sm: 2, md: 4 }} size="small">
                        <Descriptions.Item label={t('patient_fullname')}>{detail.patientName}</Descriptions.Item>
                        {detail.patientAge != null && (
                            <Descriptions.Item label={t('age')}>
                                {detail.patientAge} {t('years_old')}
                            </Descriptions.Item>
                        )}
                        {detail.patientGender != null && (
                            <Descriptions.Item label="Jins">
                                {detail.patientGender ? 'Erkak' : 'Ayol'}
                            </Descriptions.Item>
                        )}
                        {detail.note && (
                            <Descriptions.Item label={t('consultation_note')} span={4}>
                                <Text italic>{detail.note}</Text>
                            </Descriptions.Item>
                        )}
                    </Descriptions>
                </div>
            </section>

            {/* ── Video qo'ng'iroq maydoni — katta, to'liq kenglikda ── */}
            {videoActive && (
                <div className="cons-video-section">
                    <LiveKitRoomView embedded />
                </div>
            )}

            {/* ── Asosiy grid: tahlillar (chap) + xulosa (o'ng) ── */}
            <div className="consultation-work-grid">

                {/* ────── Chap: Tahlillar ────── */}
                <div className="consultation-stack">

                    {/* Yuborilgan tahlillar — to'liq AI matn */}
                    <Card
                        title={
                            <Space>
                                <span>{t('shared_analyses')}</span>
                                {analyses.length > 0 && (
                                    <Tag color="blue">{analyses.length}</Tag>
                                )}
                            </Space>
                        }
                        size="small"
                    >
                        {anaLoading ? (
                            <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
                        ) : analyses.length === 0 ? (
                            <Empty description={t('no_incoming')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        ) : (
                            analyses.map((item, i) => (
                                <AnalysisCard
                                    key={`shared-${item.analysisType}-${item.analysisId}-${i}`}
                                    item={item}
                                    navigate={navigate}
                                    t={t}
                                    compact={false}
                                />
                            ))
                        )}
                    </Card>

                    {/* Bemorning barcha tahlillari — qisqa */}
                    <Card
                        title={
                            <Space>
                                <span>Bemorning barcha tahlillari</span>
                                {patientAnalyses.length > 0 && (
                                    <Tag>{patientAnalyses.length}</Tag>
                                )}
                            </Space>
                        }
                        size="small"
                    >
                        {patLoading ? (
                            <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
                        ) : patientAnalyses.length === 0 ? (
                            <Empty description="Tahlillar topilmadi" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        ) : (
                            patientAnalyses.map((item, i) => (
                                <AnalysisCard
                                    key={`pat-${item.analysisType}-${item.analysisId}-${i}`}
                                    item={item}
                                    navigate={navigate}
                                    t={t}
                                    compact={true}
                                />
                            ))
                        )}
                    </Card>
                </div>

                {/* ────── O'ng: Xulosa ────── */}
                <div className="consultation-stack">

                    {/* Allaqachon yakunlangan — ko'rish */}
                    {alreadyConcluded && detail.conclusion && (
                        <Card title={t('conclusion_info')} size="small">
                            <Descriptions column={1} size="small">
                                <Descriptions.Item label={t('diagnosis')}>
                                    {detail.conclusion.diagnosis}
                                </Descriptions.Item>
                                <Descriptions.Item label={t('recommendations')}>
                                    {detail.conclusion.recommendations}
                                </Descriptions.Item>
                                {detail.conclusion.medications && (
                                    <Descriptions.Item label={t('medications')}>
                                        {detail.conclusion.medications}
                                    </Descriptions.Item>
                                )}
                                {detail.conclusion.followUpRequired && (
                                    <Descriptions.Item label={t('follow_up_note')}>
                                        {detail.conclusion.followUpNote || '—'}
                                    </Descriptions.Item>
                                )}
                            </Descriptions>
                        </Card>
                    )}

                    {/* Xulosa form */}
                    {canWork && (
                        <Card
                            title={<Space><SendOutlined />{t('conclusion_info')}</Space>}
                            size="small"
                        >
                            <Form form={form} layout="vertical" size="small">
                                <Form.Item
                                    name="diagnosis"
                                    label={t('diagnosis')}
                                    rules={[{ required: true, message: t('diagnosis') + ' kiritilsin' }]}
                                >
                                    <TextArea rows={3} />
                                </Form.Item>
                                <Form.Item
                                    name="recommendations"
                                    label={t('recommendations')}
                                    rules={[{ required: true, message: t('recommendations') + ' kiritilsin' }]}
                                >
                                    <TextArea rows={3} />
                                </Form.Item>
                                <Form.Item name="medications" label={t('medications')}>
                                    <Input />
                                </Form.Item>
                                <Form.Item style={{ marginBottom: 0 }}>
                                    <Checkbox
                                        checked={followUp}
                                        onChange={e => setFollowUp(e.target.checked)}
                                    >
                                        {t('follow_up_note')}
                                    </Checkbox>
                                </Form.Item>
                                {followUp && (
                                    <Form.Item name="followUpNote" label={t('follow_up_note')} style={{ marginTop: 12 }}>
                                        <TextArea rows={2} />
                                    </Form.Item>
                                )}
                                <Divider style={{ margin: '12px 0' }} />
                                <Button
                                    type="primary"
                                    block
                                    loading={concluding}
                                    onClick={handleConclude}
                                >
                                    {t('conclude_consultation')}
                                </Button>
                            </Form>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
