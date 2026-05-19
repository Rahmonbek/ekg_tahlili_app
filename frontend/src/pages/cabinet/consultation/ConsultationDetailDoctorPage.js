import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Button, Tag, message, Typography, Descriptions, Divider, Spin,
    Form, Select, Input, Space, Drawer
} from 'antd';
import { ArrowLeftOutlined, EyeOutlined, VideoCameraOutlined, SaveOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
    getConsultationDetailDoctor,
    concludeConsultation,
    getConsultationTokenDoctor,
    getConsultationBadgeCounts
} from '../../../host/requests/ConsultationRequest';
import LiveKitRoomView from '../../../components/video/LiveKitRoom';
import { useStore } from '../../../store/Store';
import './Consultation.css';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

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

export default function ConsultationDetailDoctorPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();
    const { videoCall, setVideoCall, setConsultationBadge } = useStore();

    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(false);
    const [conclusionLoading, setConclusionLoading] = useState(false);
    const [tokenLoading, setTokenLoading] = useState(false);
    const [selectedAnalysis, setSelectedAnalysis] = useState(null);
    const [form] = Form.useForm();

    useEffect(() => {
        loadDetail();
        const interval = setInterval(loadDetail, 15000);
        return () => clearInterval(interval);
    }, [id]);

    const loadDetail = async () => {
        setLoading(true);
        try {
            const res = await getConsultationDetailDoctor(id);
            setDetail(res.data);
            if (res.data?.conclusion) {
                form.setFieldsValue({
                    patientCondition: res.data.conclusion.patientCondition,
                    diagnosis: res.data.conclusion.diagnosis,
                    treatment: res.data.conclusion.treatment,
                });
            }
        } catch {
            message.error(t('error'));
        } finally {
            setLoading(false);
        }
    };

    const handleSaveConclusion = async () => {
        try {
            const values = await form.validateFields();
            setConclusionLoading(true);
            await concludeConsultation(id, {
                patientCondition: values.patientCondition,
                diagnosis: values.diagnosis,
                treatment: values.treatment,
            });
            getConsultationBadgeCounts().then((res) => setConsultationBadge(res.data || {})).catch(() => {});
            message.success(t('data_saved'));
            loadDetail();
        } catch (err) {
            if (err?.errorFields) return;
            message.error(t('error'));
        } finally {
            setConclusionLoading(false);
        }
    };

    const handleVideoCall = async () => {
        setTokenLoading(true);
        try {
            const res = await getConsultationTokenDoctor(id);
            const { token, liveKitUrl, roomName } = res.data;
            setVideoCall({ activeRoom: { token, liveKitUrl, roomName, consultationId: Number(id) }, isCalling: false });
        } catch {
            message.error(t('error'));
        } finally {
            setTokenLoading(false);
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

    const showConclusionForm = detail && (detail.status === 'reviewing' || detail.status === 'completed');
    const callIsActive = videoCall.activeRoom?.consultationId === Number(id);
    const canCall = detail && detail.status !== 'rejected';

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
                            onClick={() => navigate('/doctor/consultations')}
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
                                disabled={!detail.adminIsOnline}
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
                        <Descriptions.Item label={t('birthdate')}>
                            {detail.birthDate ? dayjs(detail.birthDate).format('DD.MM.YYYY') : '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('gender')}>
                            {detail.gender === true ? t('male') : detail.gender === false ? t('female') : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('phone_number')}>{detail.phone}</Descriptions.Item>
                        <Descriptions.Item label={t('address')} span={2}>{detail.address}</Descriptions.Item>
                    </Descriptions>

                    {/* Admin / Clinic Info */}
                    <Divider orientation="left">{t('clinic_info')}</Divider>
                    <Descriptions bordered column={2} size="small">
                        <Descriptions.Item label={t('FIO')}>{detail.adminFullName}</Descriptions.Item>
                        <Descriptions.Item label={t('phone_number')}>{detail.adminPhone}</Descriptions.Item>
                        <Descriptions.Item label={t('clinic_name')} span={2}>{detail.clinicName}</Descriptions.Item>
                        <Descriptions.Item label="Status">
                            <Tag color={detail.adminIsOnline ? 'green' : 'default'}>
                                {detail.adminIsOnline ? 'Online' : 'Offline'}
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
                        {detail.rejectionReason && (
                            <Descriptions.Item label={t('reject_reason')} span={2}>
                                <Text type="danger">{detail.rejectionReason}</Text>
                            </Descriptions.Item>
                        )}
                    </Descriptions>

                    {/* Conclusion Form */}
                    {showConclusionForm && (
                        <>
                            <Divider orientation="left">{t('conclude_consultation')}</Divider>
                            <Form form={form} layout="vertical">
                                <Form.Item
                                    name="patientCondition"
                                    label={t('patient_condition')}
                                    rules={[{ required: true, message: t('not_empty') }]}
                                >
                                    <Select placeholder={t('patient_condition')}>
                                        <Option value="good">{t('condition_good')}</Option>
                                        <Option value="moderate">{t('condition_moderate')}</Option>
                                        <Option value="bad">{t('condition_bad')}</Option>
                                    </Select>
                                </Form.Item>
                                <Form.Item
                                    name="diagnosis"
                                    label={t('diagnosis')}
                                    rules={[{ required: true, message: t('not_empty') }]}
                                >
                                    <TextArea rows={4} />
                                </Form.Item>
                                <Form.Item
                                    name="treatment"
                                    label={t('treatment')}
                                    rules={[{ required: true, message: t('not_empty') }]}
                                >
                                    <TextArea rows={4} />
                                </Form.Item>
                                <Form.Item>
                                    <Button
                                        type="primary"
                                        icon={<SaveOutlined />}
                                        loading={conclusionLoading}
                                        onClick={handleSaveConclusion}
                                    >
                                        {t('save_conclusion')}
                                    </Button>
                                </Form.Item>
                            </Form>
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
