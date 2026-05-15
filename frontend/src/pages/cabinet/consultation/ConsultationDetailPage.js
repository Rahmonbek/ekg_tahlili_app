import React, { useState, useEffect, useCallback } from 'react';
import {
    Card, Descriptions, Tag, Button, Rate, Input, Typography,
    Spin, Space, Popconfirm, notification, Divider, Row, Col, List
} from 'antd';
import { ArrowLeftOutlined, VideoCameraOutlined, StarOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
    getConsultationById,
    cancelConsultation,
    rateConsultation,
    getConsultationLiveKitToken
} from '../../../host/requests/ConsultationRequest';
import { useStore } from '../../../store/Store';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

const STATUS_COLORS = {
    pending: 'gold', accepted: 'blue', scheduled: 'purple',
    concluded: 'green', rejected: 'red', expired: 'default', cancelled: 'default',
};

export default function ConsultationDetailPage() {
    const { t }       = useTranslation();
    const navigate    = useNavigate();
    const { id }      = useParams();
    const { user, setVideoCall } = useStore();
    const isAdmin = user?.roleId === 2 || user?.roleId === 3;

    const [data, setData]             = useState(null);
    const [loading, setLoading]       = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);
    const [rateScore, setRateScore]   = useState(0);
    const [rateComment, setRateComment] = useState('');
    const [rateLoading, setRateLoading] = useState(false);
    const [tokenLoading, setTokenLoading] = useState(false);

    const fetchDetail = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getConsultationById(id);
            setData(res.data);
        } catch { }
        finally { setLoading(false); }
    }, [id]);

    useEffect(() => { fetchDetail(); }, [fetchDetail]);

    const handleCancel = async () => {
        setCancelLoading(true);
        try {
            await cancelConsultation(id);
            notification.success({ message: t('cons_status_cancelled') });
            fetchDetail();
        } catch (e) {
            notification.error({ message: e?.response?.data?.message || 'Xatolik' });
        } finally { setCancelLoading(false); }
    };

    const handleRate = async () => {
        if (!rateScore) return;
        setRateLoading(true);
        try {
            await rateConsultation(id, { score: rateScore, comment: rateComment });
            notification.success({ message: t('rate_submitted') });
            fetchDetail();
        } catch (e) {
            notification.error({ message: e?.response?.data?.message || 'Xatolik' });
        } finally { setRateLoading(false); }
    };

    const handleStartVideo = async () => {
        setTokenLoading(true);
        try {
            const res = await getConsultationLiveKitToken(id);
            const { token, liveKitUrl, roomName } = res.data;
            setVideoCall({ activeRoom: { token, liveKitUrl, roomName } });
        } catch (e) {
            notification.error({ message: e?.response?.data?.message || t('start_video_call') + ' xatolik' });
        } finally { setTokenLoading(false); }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
    if (!data) return null;

    const canCancel  = isAdmin && (data.status === 'pending' || data.status === 'accepted');
    // Video faqat "scheduled" holatda — LiveKitRoomName faqat schedule qilinganda yaratiladi
    const canVideo   = data.status === 'scheduled' && !!data.liveKitRoomName;
    const canRate    = isAdmin && data.status === 'concluded' && !data.hasRating;
    const concludedAt72h = data.concludedAt
        ? dayjs(data.concludedAt).add(72, 'hour').isAfter(dayjs()) : false;
    const showRating = canRate && concludedAt72h;

    return (
        <div style={{ padding: '0 8px', maxWidth: 900 }}>
            <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/consultations')}
                style={{ marginBottom: 16 }}
            >
                {t('back')}
            </Button>

            <Title level={4}>{t('consultation_detail')}</Title>

            {/* Holat */}
            <Card size="small" style={{ marginBottom: 12 }}>
                <Space wrap>
                    <Tag color={STATUS_COLORS[data.status] || 'default'} style={{ fontSize: 13, padding: '2px 12px' }}>
                        {t(`cons_status_${data.status}`) || data.status}
                    </Tag>
                    <Text type="secondary">{dayjs(data.createdAt).format('DD.MM.YYYY HH:mm')}</Text>
                    {data.isFirstRequest && (
                        <Tag color="cyan">{t('first_request_badge')}</Tag>
                    )}
                </Space>
            </Card>

            <Row gutter={[12, 12]}>
                {/* Bemor */}
                <Col xs={24} md={12}>
                    <Card title={t('patient_info')} size="small">
                        <Descriptions column={1} size="small">
                            <Descriptions.Item label={t('patient_fullname')}>{data.patientName}</Descriptions.Item>
                            {data.patientAge != null && (
                                <Descriptions.Item label={t('age')}>{data.patientAge} {t('years_old')}</Descriptions.Item>
                            )}
                            {data.patientGender != null && (
                                <Descriptions.Item label="Jins">{data.patientGender ? 'Erkak' : 'Ayol'}</Descriptions.Item>
                            )}
                        </Descriptions>
                    </Card>
                </Col>

                {/* Konsultant */}
                <Col xs={24} md={12}>
                    <Card title={t('consultant_doctor')} size="small">
                        <Descriptions column={1} size="small">
                            <Descriptions.Item label={t('patient_fullname')}>{data.consultantName}</Descriptions.Item>
                            {data.consultantSpecialization && (
                                <Descriptions.Item label="Mutaxassislik">{data.consultantSpecialization}</Descriptions.Item>
                            )}
                            <Descriptions.Item label={t('consultant_clinic')}>{data.consultantClinicName}</Descriptions.Item>
                            <Descriptions.Item label="Reyting">
                                <Rate disabled allowHalf value={data.consultantRating} style={{ fontSize: 14 }} />
                                <Text type="secondary" style={{ marginLeft: 6 }}>({data.consultantRating?.toFixed(1)})</Text>
                            </Descriptions.Item>
                        </Descriptions>
                    </Card>
                </Col>
            </Row>

            {/* Admin izohi */}
            {data.note && (
                <Card size="small" style={{ marginTop: 12 }}>
                    <Text strong>{t('consultation_note')}: </Text>
                    <Text italic>{data.note}</Text>
                </Card>
            )}

            {/* Rad etish sababi */}
            {data.status === 'rejected' && data.rejectionReason && (
                <Card size="small" style={{ marginTop: 12, borderColor: '#ff4d4f' }}>
                    <Text strong type="danger">{t('rejection_reason')}: </Text>
                    <Text>{data.rejectionReason}</Text>
                </Card>
            )}

            {/* Ulashilgan tahlillar */}
            {data.analyses?.length > 0 && (
                <Card title={t('shared_analyses')} size="small" style={{ marginTop: 12 }}>
                    <List
                        size="small"
                        dataSource={data.analyses}
                        renderItem={item => (
                            <List.Item>
                                <Tag>{item.analysisType}</Tag>
                                <Text type="secondary">{dayjs(item.sharedAt).format('DD.MM.YYYY')}</Text>
                            </List.Item>
                        )}
                    />
                </Card>
            )}

            {/* Video bo'lim */}
            {canVideo && (
                <Card size="small" style={{ marginTop: 12 }}>
                    {data.scheduledAt && (
                        <div style={{ marginBottom: 8 }}>
                            <Text strong>{t('schedule_video')}: </Text>
                            <Text>{dayjs(data.scheduledAt).format('DD.MM.YYYY HH:mm')}</Text>
                        </div>
                    )}
                    <Button
                        type="primary"
                        icon={<VideoCameraOutlined />}
                        loading={tokenLoading}
                        onClick={handleStartVideo}
                    >
                        {t('start_video_call')}
                    </Button>
                </Card>
            )}

            {/* Xulosa */}
            {data.conclusion && (
                <Card title={t('conclusion_info')} size="small" style={{ marginTop: 12 }}>
                    <Descriptions column={1} size="small">
                        <Descriptions.Item label={t('diagnosis')}>{data.conclusion.diagnosis}</Descriptions.Item>
                        <Descriptions.Item label={t('recommendations')}>{data.conclusion.recommendations}</Descriptions.Item>
                        {data.conclusion.medications && (
                            <Descriptions.Item label={t('medications')}>{data.conclusion.medications}</Descriptions.Item>
                        )}
                        {data.conclusion.followUpRequired && (
                            <Descriptions.Item label={t('follow_up_note')}>
                                {data.conclusion.followUpNote || '—'}
                            </Descriptions.Item>
                        )}
                        <Descriptions.Item label={t('created_at')}>
                            {dayjs(data.conclusion.createdAt).format('DD.MM.YYYY HH:mm')}
                        </Descriptions.Item>
                    </Descriptions>
                </Card>
            )}

            {/* Baho berish */}
            {showRating && (
                <Card
                    title={<><StarOutlined /> {t('rate_consultant')}</>}
                    size="small"
                    style={{ marginTop: 12 }}
                >
                    <Rate value={rateScore} onChange={setRateScore} style={{ marginBottom: 8 }} />
                    <TextArea
                        rows={2}
                        placeholder={t('rate_placeholder')}
                        value={rateComment}
                        onChange={e => setRateComment(e.target.value)}
                        style={{ marginBottom: 8 }}
                    />
                    <Button
                        type="primary"
                        loading={rateLoading}
                        disabled={!rateScore}
                        onClick={handleRate}
                    >
                        {t('rate_consultant')}
                    </Button>
                </Card>
            )}

            {/* Bekor qilish */}
            {canCancel && (
                <div style={{ marginTop: 16 }}>
                    <Popconfirm
                        title={t('confirm_cancel')}
                        onConfirm={handleCancel}
                        okText={t('accept')}
                        cancelText={t('back')}
                        okButtonProps={{ danger: true }}
                    >
                        <Button danger loading={cancelLoading}>{t('cancel_consultation')}</Button>
                    </Popconfirm>
                </div>
            )}
        </div>
    );
}
