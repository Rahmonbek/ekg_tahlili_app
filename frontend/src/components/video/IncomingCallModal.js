import React, { useState } from 'react';
import { Modal, Button, Avatar, Typography, Spin } from 'antd';
import { PhoneOutlined, CloseOutlined, UserOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/Store';
import { getVideoToken, endVideoCall } from '../../host/requests/VideoCallRequest';
import { acceptCall, endCall } from '../../hooks/videoSignalRService';
import './VideoConference.css';

const { Text } = Typography;

export default function IncomingCallModal() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { videoCall, setVideoCall, user } = useStore();
    const { incomingCall } = videoCall;
    const [accepting, setAccepting] = useState(false);

    const handleAccept = async () => {
        if (accepting) return;
        try {
            setAccepting(true);
            const myName = user?.doctor
                ? `${user.doctor.firstName ?? ''} ${user.doctor.lastName ?? ''}`.trim()
                : user?.username ?? 'Shifokor';

            const res = await getVideoToken(incomingCall.roomName, myName);
            const { token, liveKitUrl } = res.data;

            await acceptCall(incomingCall.roomName);

            setVideoCall({
                incomingCall: null,
                activeRoom: {
                    roomName: incomingCall.roomName,
                    token,
                    liveKitUrl,
                    consultationId: incomingCall.consultationId ?? null,
                },
            });

            const isDoctor = user?.roleId === 4;
            navigate(incomingCall.consultationId && isDoctor
                ? `/consultations/${incomingCall.consultationId}/work`
                : '/video-conference');
        } catch {
            setAccepting(false);
        }
    };

    const handleReject = async () => {
        try {
            await endCall(incomingCall.roomName);
            await endVideoCall(incomingCall.roomName);
        } catch { }
        setVideoCall({ incomingCall: null });
    };

    return (
        <Modal
            open={!!incomingCall}
            footer={null}
            closable={false}
            centered
            width={320}
            className="nmed-incoming-modal"
            styles={{
                content: { borderRadius: 20, overflow: 'hidden', padding: 0 },
                body: { padding: 0 },
            }}
        >
            {/* Yuqori qism — koʻk gradient */}
            <div style={{
                background: 'linear-gradient(160deg, #1a2942 0%, #2c4a7c 100%)',
                padding: '36px 24px 28px',
                textAlign: 'center',
            }}>
                {/* Pulsli avatar */}
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                    position: 'relative',
                }}>
                    <div className="nmed-pulse" style={{
                        position: 'absolute',
                        inset: -8,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.12)',
                    }} />
                    <Avatar
                        size={72}
                        icon={<UserOutlined />}
                        style={{
                            backgroundColor: 'rgba(255,255,255,0.18)',
                            border: '2px solid rgba(255,255,255,0.3)',
                            fontSize: 30,
                            color: '#fff',
                        }}
                    />
                </div>

                <Text style={{
                    display: 'block',
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.6)',
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    marginBottom: 6,
                }}>
                    {t('incoming_call')}
                </Text>
                <Text strong style={{
                    display: 'block',
                    fontSize: 20,
                    color: '#fff',
                    lineHeight: '28px',
                }}>
                    {incomingCall?.initiatorName || ''}
                </Text>
            </div>

            {/* Quyi qism — tugmalar */}
            <div style={{
                background: '#fff',
                padding: '24px 32px 28px',
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
            }}>
                {/* Rad etish */}
                <div style={{ textAlign: 'center' }}>
                    <Button
                        danger
                        shape="circle"
                        size="large"
                        icon={<CloseOutlined style={{ fontSize: 20 }} />}
                        onClick={handleReject}
                        style={{
                            width: 60,
                            height: 60,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(255,77,79,0.3)',
                        }}
                    />
                    <Text style={{ display: 'block', fontSize: 12, color: '#ff4d4f', marginTop: 8 }}>
                        {t('reject_call')}
                    </Text>
                </div>

                {/* Qabul qilish */}
                <div style={{ textAlign: 'center' }}>
                    <Button
                        shape="circle"
                        size="large"
                        icon={accepting
                            ? <Spin size="small" style={{ color: '#fff' }} />
                            : <PhoneOutlined style={{ fontSize: 20 }} />
                        }
                        onClick={handleAccept}
                        disabled={accepting}
                        style={{
                            width: 60,
                            height: 60,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#52c41a',
                            borderColor: '#52c41a',
                            color: '#fff',
                            boxShadow: '0 4px 12px rgba(82,196,26,0.35)',
                        }}
                    />
                    <Text style={{ display: 'block', fontSize: 12, color: '#52c41a', marginTop: 8 }}>
                        {t('accept_call')}
                    </Text>
                </div>
            </div>
        </Modal>
    );
}
