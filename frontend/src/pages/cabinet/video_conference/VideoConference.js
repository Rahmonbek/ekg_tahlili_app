import React, { useEffect, useState, useCallback } from 'react';
import { Typography, Spin, Empty } from 'antd';
import { VideoCameraOutlined, PhoneOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../../store/Store';
import { getOnlineDoctors } from '../../../host/requests/VideoCallRequest';
import DoctorCallCard from '../../../components/video/DoctorCallCard';
import LiveKitRoomView from '../../../components/video/LiveKitRoom';
import '../../../components/video/VideoConference.css';

const { Title, Text } = Typography;

export default function VideoConference() {
    const { t } = useTranslation();
    const { user, videoCall } = useStore();
    const isAdmin = user?.roleId === 2 || user?.roleId === 3;
    const isDoctor = user?.roleId === 4;

    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchDoctors = useCallback(async () => {
        if (!isAdmin) return;
        try {
            setLoading(true);
            const res = await getOnlineDoctors();
            setDoctors(res.data || []);
        } catch { }
        finally { setLoading(false); }
    }, [isAdmin]);

    useEffect(() => {
        fetchDoctors();
        const interval = setInterval(fetchDoctors, 30000);
        return () => clearInterval(interval);
    }, [fetchDoctors]);

    // Real-time online/offline hodisalari
    useEffect(() => {
        if (!isAdmin) return;
        const handler = (e) => {
            const { doctorUserId, online } = e.detail;
            setDoctors((prev) =>
                prev.map((d) => d.userId === doctorUserId ? { ...d, isOnline: online } : d)
            );
        };
        window.addEventListener('doctor-status-change', handler);
        return () => window.removeEventListener('doctor-status-change', handler);
    }, [isAdmin]);

    // Faol qo'ng'iroq — LiveKit to'liq ekran
    if (videoCall.activeRoom) return <LiveKitRoomView />;

    return (
        <div className="nmed-vc-page" style={{ padding: '24px 0' }}>
            {/* Sarlavha */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <VideoCameraOutlined style={{ fontSize: 22, color: '#1a2942' }} />
                <Title level={4} style={{ margin: 0, color: '#1a2942' }}>
                    {t('video_conference')}
                </Title>
            </div>

            {/* ── Admin / Direktor ko'rinishi ── */}
            {isAdmin && (
                <>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                        {t('doctors_online')}
                    </Text>

                    {loading && doctors.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 60 }}>
                            <Spin size="large" />
                        </div>
                    ) : doctors.length === 0 ? (
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={t('no_doctors_available')}
                            style={{ margin: '48px 0' }}
                        />
                    ) : (
                        <div className="nmed-doctors-grid">
                            {doctors.map((doctor) => (
                                <DoctorCallCard key={doctor.userId} doctor={doctor} />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ── Shifokor kutish ko'rinishi ── */}
            {isDoctor && (
                <div
                    className="nmed-doctor-waiting"
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 320,
                        padding: '64px 24px',
                        textAlign: 'center',
                    }}
                >
                    <div
                        className="nmed-pulse"
                        style={{
                            width: 88,
                            height: 88,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #e8f4ff 0%, #d0e8ff 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 28,
                        }}
                    >
                        <PhoneOutlined style={{ fontSize: 36, color: '#1a2942' }} />
                    </div>
                    <Title level={5} style={{ color: '#1a2942', marginBottom: 10 }}>
                        {t('you_are_online')}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 14, maxWidth: 300, lineHeight: '22px' }}>
                        {t('waiting_for_call')}
                    </Text>

                    {/* Online indikator */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginTop: 24,
                        padding: '8px 20px',
                        borderRadius: 20,
                        background: '#f6ffed',
                        border: '1px solid #b7eb8f',
                    }}>
                        <span style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: '#52c41a',
                            display: 'inline-block',
                            animation: 'nmed-pulse 2s infinite',
                        }} />
                        <Text style={{ fontSize: 13, color: '#52c41a', fontWeight: 500 }}>
                            Online
                        </Text>
                    </div>
                </div>
            )}
        </div>
    );
}
