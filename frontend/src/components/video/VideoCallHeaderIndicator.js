import React, { useState } from 'react';
import { Badge, Button, Dropdown, Space, Typography } from 'antd';
import { PhoneOutlined, VideoCameraOutlined, CloseOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/Store';
import { endVideoCall } from '../../host/requests/VideoCallRequest';
import { endCall } from '../../hooks/videoSignalRService';
import {
    acceptIncomingVideoCall,
    navigateToActiveVideoCall,
    rejectIncomingVideoCall,
} from './videoCallActions';

const { Text } = Typography;

export default function VideoCallHeaderIndicator() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { videoCall, setVideoCall, user } = useStore();
    const { incomingCall, activeRoom } = videoCall;
    const [loading, setLoading] = useState(false);

    if (!incomingCall && !activeRoom) return null;

    const handleAccept = async () => {
        if (loading) return;
        setLoading(true);
        try {
            await acceptIncomingVideoCall({ incomingCall, activeRoom, user, setVideoCall, navigate });
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        await rejectIncomingVideoCall({ incomingCall, setVideoCall });
    };

    const handleOpenActive = () => {
        navigateToActiveVideoCall({ activeRoom, user, navigate });
    };

    const handleEndActive = async () => {
        if (!activeRoom?.roomName) return;
        try { await endCall(activeRoom.roomName); } catch { }
        try { await endVideoCall(activeRoom.roomName); } catch { }
        setVideoCall({ activeRoom: null, incomingCall: null, isCalling: false });
    };

    const overlay = (
        <div className="video-call-header-dropdown">
            {incomingCall && (
                <div className="video-call-header-card incoming">
                    <Text className="video-call-header-kicker">{t('incoming_call')}</Text>
                    <Text strong className="video-call-header-name">
                        {incomingCall.initiatorName || t('unknown')}
                    </Text>
                    {incomingCall.consultationId && (
                        <Text type="secondary" className="video-call-header-meta">
                            {t('consultation')} #{incomingCall.consultationId}
                        </Text>
                    )}
                    <Space className="video-call-header-actions">
                        <Button danger icon={<CloseOutlined />} onClick={handleReject}>
                            {t('reject_call')}
                        </Button>
                        <Button type="primary" icon={<PhoneOutlined />} loading={loading} onClick={handleAccept}>
                            {t('accept_call')}
                        </Button>
                    </Space>
                </div>
            )}

            {activeRoom && (
                <div className="video-call-header-card active">
                    <Text className="video-call-header-kicker">{t('active_video_call')}</Text>
                    <Text strong className="video-call-header-name">
                        {activeRoom.peerName || activeRoom.roomName}
                    </Text>
                    {activeRoom.consultationId && (
                        <Text type="secondary" className="video-call-header-meta">
                            {t('consultation')} #{activeRoom.consultationId}
                        </Text>
                    )}
                    <Space className="video-call-header-actions">
                        <Button icon={<VideoCameraOutlined />} onClick={handleOpenActive}>
                            {t('go_to_call')}
                        </Button>
                        <Button danger icon={<CloseOutlined />} onClick={handleEndActive}>
                            {t('end_call')}
                        </Button>
                    </Space>
                </div>
            )}
        </div>
    );

    return (
        <Dropdown
            dropdownRender={() => overlay}
            trigger={['click']}
            placement="bottomRight"
        >
            <button
                type="button"
                className={`video-call-header-btn ${incomingCall ? 'is-ringing' : 'is-active'}`}
                aria-label={incomingCall ? t('incoming_call') : t('active_video_call')}
            >
                <Badge dot={!!incomingCall} offset={[-2, 2]}>
                    {incomingCall ? <PhoneOutlined /> : <VideoCameraOutlined />}
                </Badge>
            </button>
        </Dropdown>
    );
}
