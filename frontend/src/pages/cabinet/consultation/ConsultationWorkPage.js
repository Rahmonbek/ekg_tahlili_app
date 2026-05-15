import React, { useState, useEffect, useCallback } from 'react';
import {
    Card, Tag, Button, Input, Typography, Spin, Space,
    notification, Divider, Tabs, List, Checkbox, Row, Col,
    Descriptions, Form
} from 'antd';
import { ArrowLeftOutlined, VideoCameraOutlined, SendOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
    getConsultationById,
    getConsultationAnalyses,
    concludeConsultation,
    getConsultationLiveKitToken
} from '../../../host/requests/ConsultationRequest';
import { useStore } from '../../../store/Store';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

const ANALYSIS_COLORS = {
    EKG: 'blue', Lab: 'green', Holter: 'purple', SMAD: 'orange', Parasitology: 'cyan',
};

const STATUS_COLORS = {
    pending: 'gold', accepted: 'blue', scheduled: 'purple',
    concluded: 'green', rejected: 'red', expired: 'default', cancelled: 'default',
};

export default function ConsultationWorkPage() {
    const { t }    = useTranslation();
    const navigate = useNavigate();
    const { id }   = useParams();
    const { setVideoCall } = useStore();

    const [detail, setDetail]           = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [analyses, setAnalyses]       = useState([]);
    const [anaLoading, setAnaLoading]   = useState(false);

    // Xulosa form
    const [form] = Form.useForm();
    const [followUp, setFollowUp]       = useState(false);
    const [concluding, setConcluding]   = useState(false);

    // Video
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

    useEffect(() => {
        fetchDetail();
        fetchAnalyses();
    }, [fetchDetail, fetchAnalyses]);

    // SignalR refresh
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
            setVideoCall({ activeRoom: { token, liveKitUrl, roomName } });
        } catch (e) {
            notification.error({ message: e?.response?.data?.message || t('start_video_call') + ' xatolik' });
        } finally { setVideoLoading(false); }
    };

    const handleConclude = async () => {
        try {
            const values = await form.validateFields();
            setConcluding(true);
            await concludeConsultation(id, {
                diagnosis:          values.diagnosis,
                recommendations:    values.recommendations,
                medications:        values.medications || null,
                followUpRequired:   followUp,
                followUpNote:       followUp ? (values.followUpNote || null) : null,
            });
            notification.success({ message: t('conclusion_info') });
            navigate(`/consultations/${id}`);
        } catch (e) {
            if (e?.response?.data?.message) {
                notification.error({ message: e.response.data.message });
            }
            // Form validation errors — handled by Form
        } finally { setConcluding(false); }
    };

    if (detailLoading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
    if (!detail) return null;

    const canWork = detail.status === 'accepted' || detail.status === 'scheduled';
    const alreadyConcluded = detail.status === 'concluded';

    // Tahlillarni turga bo'lib guruhlash
    const analysisGroups = {};
    analyses.forEach(a => {
        if (!analysisGroups[a.analysisType]) analysisGroups[a.analysisType] = [];
        analysisGroups[a.analysisType].push(a);
    });
    const analysisTabs = Object.keys(analysisGroups).map(type => ({
        key: type,
        label: <Tag color={ANALYSIS_COLORS[type] || 'default'}>{type}</Tag>,
        children: (
            <List
                size="small"
                dataSource={analysisGroups[type]}
                renderItem={item => (
                    <List.Item>
                        <List.Item.Meta
                            title={
                                <Space>
                                    <Tag color={ANALYSIS_COLORS[item.analysisType] || 'default'}>
                                        {item.analysisType}
                                    </Tag>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {item.createdAt ? dayjs(item.createdAt).format('DD.MM.YYYY') : ''}
                                    </Text>
                                </Space>
                            }
                            description={
                                item.aiSummary ? (
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {item.aiSummary}
                                    </Text>
                                ) : null
                            }
                        />
                    </List.Item>
                )}
            />
        ),
    }));

    return (
        <div style={{ padding: '0 8px', maxWidth: 1100 }}>
            <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(`/consultations/${id}`)}
                style={{ marginBottom: 16 }}
            >
                {t('back')}
            </Button>

            <Space style={{ marginBottom: 12 }} wrap>
                <Title level={4} style={{ margin: 0 }}>{t('consultation_detail')}</Title>
                <Tag color={STATUS_COLORS[detail.status] || 'default'}>
                    {t(`cons_status_${detail.status}`) || detail.status}
                </Tag>
            </Space>

            {/* Bemor qisqacha */}
            <Card size="small" style={{ marginBottom: 12 }}>
                <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small">
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
                        <Descriptions.Item label={t('consultation_note')} span={3}>
                            <Text italic>{detail.note}</Text>
                        </Descriptions.Item>
                    )}
                </Descriptions>
            </Card>

            <Row gutter={[16, 16]}>
                {/* ── Chap panel: Tahlillar ── */}
                <Col xs={24} lg={14}>
                    <Card
                        title={t('shared_analyses')}
                        size="small"
                        style={{ minHeight: 400 }}
                    >
                        {anaLoading ? (
                            <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
                        ) : analyses.length === 0 ? (
                            <Text type="secondary">{t('no_incoming')}</Text>
                        ) : (
                            <Tabs items={analysisTabs} size="small" />
                        )}
                    </Card>
                </Col>

                {/* ── O'ng panel: Video + Xulosa ── */}
                <Col xs={24} lg={10}>
                    {/* Video tugmasi */}
                    {canWork && (
                        <Card size="small" style={{ marginBottom: 12 }}>
                            {detail.scheduledAt && (
                                <div style={{ marginBottom: 8 }}>
                                    <Text strong>{t('schedule_video')}: </Text>
                                    <Text>{dayjs(detail.scheduledAt).format('DD.MM.YYYY HH:mm')}</Text>
                                </div>
                            )}
                            <Button
                                type="primary"
                                icon={<VideoCameraOutlined />}
                                loading={videoLoading}
                                onClick={handleStartVideo}
                                block
                            >
                                {t('start_video_call')}
                            </Button>
                        </Card>
                    )}

                    {/* Xulosa: allaqachon yozilgan bo'lsa ko'rish */}
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

                    {/* Xulosa form — faqat canWork bo'lganda */}
                    {canWork && (
                        <Card
                            title={<><SendOutlined /> {t('conclusion_info')}</>}
                            size="small"
                        >
                            <Form form={form} layout="vertical" size="small">
                                <Form.Item
                                    name="diagnosis"
                                    label={t('diagnosis')}
                                    rules={[{ required: true, message: t('diagnosis') + ' kiritilsin' }]}
                                >
                                    <TextArea rows={2} />
                                </Form.Item>
                                <Form.Item
                                    name="recommendations"
                                    label={t('recommendations')}
                                    rules={[{ required: true, message: t('recommendations') + ' kiritilsin' }]}
                                >
                                    <TextArea rows={2} />
                                </Form.Item>
                                <Form.Item name="medications" label={t('medications')}>
                                    <Input />
                                </Form.Item>
                                <Form.Item>
                                    <Checkbox
                                        checked={followUp}
                                        onChange={e => setFollowUp(e.target.checked)}
                                    >
                                        {t('follow_up_note')}
                                    </Checkbox>
                                </Form.Item>
                                {followUp && (
                                    <Form.Item name="followUpNote" label={t('follow_up_note')}>
                                        <TextArea rows={2} />
                                    </Form.Item>
                                )}
                                <Divider style={{ margin: '8px 0' }} />
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
                </Col>
            </Row>
        </div>
    );
}
