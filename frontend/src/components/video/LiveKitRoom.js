import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    LiveKitRoom,
    RoomAudioRenderer,
    useTracks,
    VideoTrack,
    useLocalParticipant,
    useRoomContext,
    useConnectionState,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track, ConnectionState, RoomEvent } from 'livekit-client';
import { Avatar, Typography } from 'antd';
import {
    AudioOutlined,
    AudioMutedOutlined,
    DesktopOutlined,
    SwapOutlined,
    VideoCameraOutlined,
    PhoneOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { MdOutlineVideocamOff } from 'react-icons/md';
import { useStore } from '../../store/Store';
import { endVideoCall } from '../../host/requests/VideoCallRequest';
import { endCall } from '../../hooks/videoSignalRService';
import './VideoConference.css';

const { Text } = Typography;

// ── Telegram uslubidagi asosiy layout (LiveKitRoom konteksti ichida) ──────────
function TelegramLayout({ roomName, onLeave }) {
    const { localParticipant } = useLocalParticipant();
    const room = useRoomContext();
    const connectionState = useConnectionState();
    const leavingRef = useRef(false);

    // Kamera treklari
    const cameraTracks = useTracks(
        [{ source: Track.Source.Camera, withPlaceholder: true }],
        { onlySubscribed: false }
    );

    const remoteVideoTrack = cameraTracks.find(t => !t.participant.isLocal && t.publication);
    const localVideoTrack  = cameraTracks.find(t =>  t.participant.isLocal && t.publication);

    const remoteParticipantName = cameraTracks
        .find(t => !t.participant.isLocal)
        ?.participant?.name ?? '';

    // Mikrofon / kamera holati
    const [micOn, setMicOn] = useState(true);
    const [camOn, setCamOn] = useState(true);
    const [screenOn, setScreenOn] = useState(false);
    const [cameraDevices, setCameraDevices] = useState([]);
    const [cameraIndex, setCameraIndex] = useState(0);

    // Ulanish tayyor bo'lganda kamera va mikrofonni yoqish (PublishTrackError oldini olish)
    useEffect(() => {
        if (connectionState !== ConnectionState.Connected) return;
        localParticipant?.enableCameraAndMicrophone().catch(() => {});
    }, [connectionState, localParticipant]);

    // Remote ishtirokchi chiqib ketganda avtomatik tugatish (auto-disconnect fallback)
    const handleLeave = useCallback(async () => {
        if (leavingRef.current) return;
        leavingRef.current = true;
        try { await room.disconnect(); } catch { }
        onLeave();
    }, [room, onLeave]);

    useEffect(() => {
        if (!room) return;
        const onParticipantDisconnected = () => {
            if (room.remoteParticipants.size === 0 && !leavingRef.current) {
                handleLeave();
            }
        };
        room.on(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
        return () => { room.off(RoomEvent.ParticipantDisconnected, onParticipantDisconnected); };
    }, [room, handleLeave]);

    const toggleMic = useCallback(async () => {
        const next = !micOn;
        await localParticipant?.setMicrophoneEnabled(next);
        setMicOn(next);
    }, [micOn, localParticipant]);

    const toggleCam = useCallback(async () => {
        const next = !camOn;
        await localParticipant?.setCameraEnabled(next);
        setCamOn(next);
    }, [camOn, localParticipant]);

    const toggleScreen = useCallback(async () => {
        const next = !screenOn;
        await localParticipant?.setScreenShareEnabled(next);
        setScreenOn(next);
    }, [screenOn, localParticipant]);

    const switchCamera = useCallback(async () => {
        if (!navigator?.mediaDevices?.enumerateDevices) return;

        const devices = cameraDevices.length > 0
            ? cameraDevices
            : (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');

        setCameraDevices(devices);
        if (devices.length <= 1) return;

        const nextIndex = (cameraIndex + 1) % devices.length;
        setCameraIndex(nextIndex);
        await localParticipant?.setCameraEnabled(true, { deviceId: devices[nextIndex].deviceId });
        setCamOn(true);
    }, [cameraDevices, cameraIndex, localParticipant]);

    return (
        <div className="nmed-tg-root">
            {/* Audio render (ko'rinmaydi, faqat ovoz) */}
            <RoomAudioRenderer />

            {/* ── Katta video — remote ishtirokchi ── */}
            <div className="nmed-tg-main">
                {remoteVideoTrack ? (
                    <VideoTrack
                        trackRef={remoteVideoTrack}
                        className="nmed-tg-main-video"
                    />
                ) : (
                    /* Remote hali ulanmagan — kutish holati */
                    <div className="nmed-tg-waiting">
                        <Avatar
                            size={84}
                            icon={<UserOutlined />}
                            style={{ backgroundColor: 'rgba(255,255,255,0.15)', fontSize: 36, marginBottom: 16 }}
                        />
                        {remoteParticipantName && (
                            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                                {remoteParticipantName}
                            </Text>
                        )}
                        <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14 }}>
                            Ulanish kutilmoqda...
                        </Text>
                        <div className="nmed-tg-connecting-dots">
                            <span /><span /><span />
                        </div>
                    </div>
                )}

                {/* Remote ishtirokchi ismi overlay */}
                {remoteVideoTrack && remoteParticipantName && (
                    <div className="nmed-tg-participant-name">
                        {remoteParticipantName}
                    </div>
                )}
            </div>

            {/* ── Kichkina PiP — o'z videosi ── */}
            {localVideoTrack && (
                <div className="nmed-tg-pip">
                    <VideoTrack
                        trackRef={localVideoTrack}
                        className="nmed-tg-pip-video"
                    />
                    {!camOn && (
                        <div className="nmed-tg-pip-nocam">
                            <MdOutlineVideocamOff size={22} color="rgba(255,255,255,0.7)" />
                        </div>
                    )}
                </div>
            )}

            {/* ── Tugmalar — video ustida overlay ── */}
            <div className="nmed-tg-controls">
                {/* Mikrofon */}
                <button
                    className={`nmed-tg-btn${micOn ? '' : ' nmed-tg-btn-off'}`}
                    onClick={toggleMic}
                    title={micOn ? 'Mikrofonni o\'chirish' : 'Mikrofonni yoqish'}
                >
                    {micOn
                        ? <AudioOutlined style={{ fontSize: 22 }} />
                        : <AudioMutedOutlined style={{ fontSize: 22 }} />
                    }
                </button>

                {/* Tugatish — markazda, kattaroq, qizil */}
                <button
                    className="nmed-tg-btn nmed-tg-btn-end"
                    onClick={handleLeave}
                    title="Qo'ng'iroqni tugatish"
                >
                    <PhoneOutlined style={{ fontSize: 26, transform: 'rotate(135deg)' }} />
                </button>

                {/* Kamera */}
                <button
                    className={`nmed-tg-btn${camOn ? '' : ' nmed-tg-btn-off'}`}
                    onClick={toggleCam}
                    title={camOn ? 'Kamerani o\'chirish' : 'Kamerani yoqish'}
                >
                    {camOn
                        ? <VideoCameraOutlined style={{ fontSize: 22 }} />
                        : <MdOutlineVideocamOff size={22} />
                    }
                </button>

                <button
                    className={`nmed-tg-btn${screenOn ? ' nmed-tg-btn-off' : ''}`}
                    onClick={toggleScreen}
                    title={screenOn ? 'Ekran namoyishini to\'xtatish' : 'Ekranni namoyish qilish'}
                >
                    <DesktopOutlined style={{ fontSize: 22 }} />
                </button>

                <button
                    className="nmed-tg-btn"
                    onClick={switchCamera}
                    title="Kamerani almashtirish"
                >
                    <SwapOutlined style={{ fontSize: 22 }} />
                </button>
            </div>
        </div>
    );
}

// ── Asosiy export ─────────────────────────────────────────────────────────────
export default function LiveKitRoomView({ embedded = false }) {
    const { videoCall, setVideoCall } = useStore();
    const { activeRoom } = videoCall;
    const disconnectedRef = useRef(false);

    const handleDisconnect = useCallback(async () => {
        if (disconnectedRef.current) return;
        disconnectedRef.current = true;
        const roomName = useStore.getState().videoCall.activeRoom?.roomName;
        try {
            await endCall(roomName);
            await endVideoCall(roomName);
        } catch { }
        setVideoCall({ activeRoom: null, incomingCall: null, isCalling: false });
    }, [setVideoCall]);

    if (!activeRoom) return null;

    return (
        <div className={`nmed-livekit-wrapper${embedded ? ' is-embedded' : ''}`}>
            <LiveKitRoom
                token={activeRoom.token}
                serverUrl={activeRoom.liveKitUrl}
                connect={true}
                audio={false}
                video={false}
                onDisconnected={handleDisconnect}
                style={{ flex: 1, minHeight: 0 }}
            >
                <TelegramLayout
                    roomName={activeRoom.roomName}
                    onLeave={handleDisconnect}
                />
            </LiveKitRoom>
        </div>
    );
}
