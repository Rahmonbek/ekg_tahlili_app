import React, { useState, useEffect, useCallback } from 'react';
import {
    Card, Tag, Button, Typography, Spin, Empty,
    Row, Col, Space, notification
} from 'antd';
import { VideoCameraOutlined, FileTextOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
    getIncomingConsultations,
    getConsultationLiveKitToken
} from '../../../host/requests/ConsultationRequest';
import { useStore } from '../../../store/Store';
import dayjs from 'dayjs';
import './Consultation.css';

const { Title, Text } = Typography;

const STATUS_COLORS = {
    pending: 'gold', accepted: 'blue', scheduled: 'purple',
    concluded: 'green', rejected: 'red', expired: 'default', cancelled: 'default',
};

export default function MySchedulePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { setVideoCall } = useStore();

    const [data, setData]       = useState([]);
    const [loading, setLoading] = useState(false);
    const [videoLoading, setVideoLoading] = useState({});

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getIncomingConsultations({ status: 'accepted,scheduled' });
            const items = (res.data || []).filter(
                i => (i.status === 'accepted' || i.status === 'scheduled') && !i.isLinkRequest
            );
            setData(items);
        } catch { }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        const handler = () => fetchData();
        window.addEventListener('consultation-status-changed', handler);
        window.addEventListener('consultation-request-received', handler);
        return () => {
            window.removeEventListener('consultation-status-changed', handler);
            window.removeEventListener('consultation-request-received', handler);
        };
    }, [fetchData]);

    const handleStartVideo = async (id) => {
        setVideoLoading(p => ({ ...p, [id]: true }));
        try {
            const res = await getConsultationLiveKitToken(id);
            const { token, liveKitUrl, roomName } = res.data;
            setVideoCall({ activeRoom: { token, liveKitUrl, roomName, consultationId: id } });
            navigate(`/consultations/${id}/work`);
        } catch (e) {
            notification.error({ message: e?.response?.data?.message || t('start_video_call') + ' xatolik' });
        } finally { setVideoLoading(p => ({ ...p, [id]: false })); }
    };

    return (
        <div className="consultation-page">
            <section className="consultation-shell">
                <div className="consultation-header">
                    <div>
                        <Title level={4} className="consultation-title">{t('my_schedule')}</Title>
                        <Text className="consultation-subtitle">
                            Faol konsultatsiyalar va ular bo'yicha ishni shu yerdan davom ettirasiz.
                        </Text>
                    </div>
                </div>
            </section>

            <section className="consultation-shell">
                <div className="consultation-body">
                    <div className="consultation-summary-grid" style={{ marginBottom: 16 }}>
                        <div className="consultation-summary-card">
                            <div className="consultation-summary-label">Faol ishlar</div>
                            <div className="consultation-summary-value">{data.length}</div>
                        </div>
                        <div className="consultation-summary-card">
                            <div className="consultation-summary-label">Qabul qilingan</div>
                            <div className="consultation-summary-value">
                                {data.filter(item => item.status === 'accepted').length}
                            </div>
                        </div>
                        <div className="consultation-summary-card">
                            <div className="consultation-summary-label">Video uchun tayyor</div>
                            <div className="consultation-summary-value">
                                {data.filter(item => item.status === 'scheduled').length}
                            </div>
                        </div>
                    </div>
                    {loading ? (
                <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
            ) : data.length === 0 ? (
                <Empty description={t('no_incoming') || 'Faol konsultatsiyalar yo\'q'} />
            ) : (
                <Row gutter={[12, 12]}>
                    {data.map(item => (
                        <Col key={item.id} xs={24} md={12} lg={8}>
                            <Card
                                size="small"
                                className="consultation-request-card"
                                title={
                                    <Space>
                                        <Tag color={STATUS_COLORS[item.status] || 'default'}>
                                            {t(`cons_status_${item.status}`) || item.status}
                                        </Tag>
                                        <Text
                                            type="secondary"
                                            style={{ fontSize: 11, cursor: 'pointer' }}
                                            onClick={() => navigate(`/consultations/${item.id}`)}
                                        >
                                            #{item.id}
                                        </Text>
                                    </Space>
                                }
                            >
                                <div style={{ marginBottom: 4 }}>
                                    <Text strong>{item.clinicName}</Text>
                                </div>
                                {item.patientName && (
                                    <div style={{ marginBottom: 4 }}>
                                        <Text>{item.patientName}</Text>
                                        {item.patientAge && (
                                            <Text type="secondary" style={{ marginLeft: 6 }}>
                                                {item.patientAge} {t('years_old')}
                                            </Text>
                                        )}
                                    </div>
                                )}
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

                                <Space wrap style={{ marginTop: 4 }}>
                                    <Button
                                        type="primary"
                                        size="small"
                                        icon={<VideoCameraOutlined />}
                                        loading={videoLoading[item.id]}
                                        onClick={() => handleStartVideo(item.id)}
                                    >
                                        {t('start_video_call') || 'Video qo\'ng\'iroq'}
                                    </Button>
                                    <Button
                                        size="small"
                                        icon={<FileTextOutlined />}
                                        onClick={() => navigate(`/consultations/${item.id}/work`)}
                                    >
                                        Ish sahifasi
                                    </Button>
                                </Space>
                            </Card>
                        </Col>
                    ))}
                </Row>
                    )}
                </div>
            </section>
        </div>
    );
}
