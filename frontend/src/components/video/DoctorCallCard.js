import React, { useState } from 'react';
import { Card, Avatar, Button, Badge, Typography, Tooltip } from 'antd';
import { PhoneOutlined, UserOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../store/Store';
import { getVideoToken } from '../../host/requests/VideoCallRequest';
import { initiateCall } from '../../hooks/videoSignalRService';

const { Text } = Typography;

export default function DoctorCallCard({ doctor }) {
    const { t } = useTranslation();
    const { user, videoCall, setVideoCall } = useStore();
    const [calling, setCalling] = useState(false);

    const handleCall = async () => {
        if (!doctor.isOnline || calling || videoCall.isCalling || videoCall.activeRoom) return;

        const roomName = `nmed-room-${user.id}-${doctor.userId}-${Date.now()}`;
        const myName = user?.doctor
            ? `${user.doctor.firstName ?? ''} ${user.doctor.lastName ?? ''}`.trim()
            : user?.username ?? 'Admin';

        try {
            setCalling(true);
            setVideoCall({ isCalling: true });

            const res = await getVideoToken(roomName, myName);
            const { token, liveKitUrl } = res.data;

            await initiateCall(doctor.userId, roomName);

            setVideoCall({ isCalling: false, activeRoom: { roomName, token, liveKitUrl } });
        } catch (err) {
            setVideoCall({ isCalling: false });
        } finally {
            setCalling(false);
        }
    };

    const isOnline = doctor.isOnline;

    return (
        <Card
            className={`nmed-doctor-card${isOnline ? ' online' : ''}`}
            style={{
                borderRadius: 14,
                border: isOnline ? '1px solid #d6eaff' : '1px solid #f0f0f0',
                background: isOnline ? '#fff' : '#fafafa',
                opacity: isOnline ? 1 : 0.72,
            }}
            bodyStyle={{ padding: '16px 18px' }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* Avatar + online dot */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar
                        size={52}
                        icon={<UserOutlined />}
                        style={{
                            backgroundColor: isOnline ? '#1a2942' : '#c8c8c8',
                            fontSize: 22,
                        }}
                    />
                    {/* Online / offline nuqta */}
                    <span style={{
                        position: 'absolute',
                        bottom: 2,
                        right: 2,
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: isOnline ? '#52c41a' : '#bfbfbf',
                        border: '2px solid #fff',
                        display: 'block',
                    }} />
                </div>

                {/* Ma'lumotlar */}
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <Text
                        strong
                        ellipsis
                        style={{ display: 'block', fontSize: 14, color: '#1a2942', lineHeight: '20px' }}
                    >
                        {doctor.fullName || "—"}
                    </Text>
                    <Text
                        type="secondary"
                        ellipsis
                        style={{ display: 'block', fontSize: 12, lineHeight: '18px' }}
                    >
                        {doctor.position || '—'}
                    </Text>
                    <Text style={{
                        fontSize: 11,
                        color: isOnline ? '#52c41a' : '#bfbfbf',
                        fontWeight: 500,
                        letterSpacing: 0.2,
                    }}>
                        {isOnline ? 'Online' : 'Offline'}
                    </Text>
                </div>

                {/* Qo'ng'iroq tugmasi */}
                <Tooltip title={!isOnline ? t('doctor_offline') : t('call_doctor')}>
                    <Button
                        type="primary"
                        shape="circle"
                        size="large"
                        icon={<PhoneOutlined />}
                        disabled={!isOnline || calling || !!videoCall.activeRoom}
                        loading={calling}
                        onClick={handleCall}
                        style={{
                            width: 44,
                            height: 44,
                            flexShrink: 0,
                            backgroundColor: isOnline ? '#52c41a' : undefined,
                            borderColor: isOnline ? '#52c41a' : undefined,
                            boxShadow: isOnline ? '0 3px 10px rgba(82,196,26,0.35)' : 'none',
                        }}
                    />
                </Tooltip>
            </div>
        </Card>
    );
}
