import React, { useState, useEffect, useCallback } from 'react';
import {
    Card, Tag, Button, Typography, Spin, Empty,
    Row, Col, DatePicker, Space, notification, Popconfirm
} from 'antd';
import { VideoCameraOutlined, CalendarOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
    getIncomingConsultations,
    scheduleConsultation,
    getConsultationLiveKitToken
} from '../../../host/requests/ConsultationRequest';
import { useStore } from '../../../store/Store';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const STATUS_COLORS = {
    pending: 'gold', accepted: 'blue', scheduled: 'purple',
    concluded: 'green', rejected: 'red', expired: 'default', cancelled: 'default',
};

export default function MySchedulePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { setVideoCall } = useStore();

    const [data, setData]         = useState([]);
    const [loading, setLoading]   = useState(false);
    const [scheduleDates, setScheduleDates] = useState({});   // { [id]: dayjs }
    const [saveLoading, setSaveLoading]     = useState({});   // { [id]: bool }
    const [videoLoading, setVideoLoading]   = useState({});   // { [id]: bool }

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // accepted + scheduled statuslarni birga yuklash
            const res = await getIncomingConsultations({ status: 'scheduled,accepted' });
            const items = (res.data || []).filter(
                i => i.status === 'accepted' || i.status === 'scheduled'
            );
            setData(items);
        } catch { }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // SignalR — status o'zgarganda yangilash
    useEffect(() => {
        const handler = () => fetchData();
        window.addEventListener('consultation-status-changed', handler);
        window.addEventListener('consultation-request-received', handler);
        return () => {
            window.removeEventListener('consultation-status-changed', handler);
            window.removeEventListener('consultation-request-received', handler);
        };
    }, [fetchData]);

    const handleSchedule = async (id) => {
        const dt = scheduleDates[id];
        if (!dt) return;
        setSaveLoading(p => ({ ...p, [id]: true }));
        try {
            await scheduleConsultation(id, { scheduledAt: dt.toISOString() });
            notification.success({ message: t('schedule_video') });
            fetchData();
        } catch (e) {
            notification.error({ message: e?.response?.data?.message || 'Xatolik' });
        } finally { setSaveLoading(p => ({ ...p, [id]: false })); }
    };

    const handleStartVideo = async (id) => {
        setVideoLoading(p => ({ ...p, [id]: true }));
        try {
            const res = await getConsultationLiveKitToken(id);
            const { token, liveKitUrl, roomName } = res.data;
            setVideoCall({ activeRoom: { token, liveKitUrl, roomName } });
        } catch (e) {
            notification.error({ message: e?.response?.data?.message || t('start_video_call') + ' xatolik' });
        } finally { setVideoLoading(p => ({ ...p, [id]: false })); }
    };

    return (
        <div style={{ padding: '0 8px' }}>
            <Title level={4}>{t('my_schedule')}</Title>

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
                                {/* Klinika va bemor */}
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
                                {item.note && (
                                    <div style={{ marginBottom: 8 }}>
                                        <Text type="secondary" italic style={{ fontSize: 12 }}>
                                            "{item.note}"
                                        </Text>
                                    </div>
                                )}

                                {/* Belgilangan vaqt */}
                                {item.scheduledAt && (
                                    <div style={{ marginBottom: 8 }}>
                                        <CalendarOutlined style={{ marginRight: 4, color: '#722ed1' }} />
                                        <Text strong style={{ color: '#722ed1' }}>
                                            {dayjs(item.scheduledAt).format('DD.MM.YYYY HH:mm')}
                                        </Text>
                                    </div>
                                )}

                                {/* Accepted: vaqt belgilash */}
                                {item.status === 'accepted' && (
                                    <Space wrap style={{ marginTop: 8 }}>
                                        <DatePicker
                                            showTime
                                            format="DD.MM.YYYY HH:mm"
                                            placeholder={t('schedule_video')}
                                            value={scheduleDates[item.id] || null}
                                            onChange={dt => setScheduleDates(p => ({ ...p, [item.id]: dt }))}
                                            disabledDate={d => d && d.isBefore(dayjs(), 'day')}
                                            style={{ width: 180 }}
                                            size="small"
                                        />
                                        <Popconfirm
                                            title={t('confirm_schedule')}
                                            onConfirm={() => handleSchedule(item.id)}
                                            okText={t('accept')}
                                            cancelText={t('back')}
                                            disabled={!scheduleDates[item.id]}
                                        >
                                            <Button
                                                type="primary"
                                                size="small"
                                                icon={<CalendarOutlined />}
                                                loading={saveLoading[item.id]}
                                                disabled={!scheduleDates[item.id]}
                                            >
                                                {t('save')}
                                            </Button>
                                        </Popconfirm>
                                    </Space>
                                )}

                                {/* Scheduled: video boshlash */}
                                {item.status === 'scheduled' && (
                                    <Space wrap style={{ marginTop: 8 }}>
                                        <Button
                                            type="primary"
                                            size="small"
                                            icon={<VideoCameraOutlined />}
                                            loading={videoLoading[item.id]}
                                            onClick={() => handleStartVideo(item.id)}
                                        >
                                            {t('start_video_call')}
                                        </Button>
                                        <Button
                                            size="small"
                                            onClick={() => navigate(`/consultations/${item.id}/work`)}
                                        >
                                            {t('view')}
                                        </Button>
                                    </Space>
                                )}
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}
        </div>
    );
}
