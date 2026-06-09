import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    LiveKitRoom,
    RoomAudioRenderer,
    useLocalParticipant,
    useRoomContext,
    useTracks,
    VideoTrack,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';
import { Avatar, Typography } from 'antd';
import {
    AudioMutedOutlined,
    AudioOutlined,
    DesktopOutlined,
    PhoneOutlined,
    SwapOutlined,
    UserOutlined,
    VideoCameraOutlined,
} from '@ant-design/icons';
import { MdOutlineVideocamOff } from 'react-icons/md';
import { useStore } from '../../store/Store';
import { endVideoCall } from '../../host/requests/VideoCallRequest';
import { endCall } from '../../hooks/videoSignalRService';
import './VideoConference.css';

const { Text } = Typography;

function useRoomControls(initialAudio, onLeave) {
    const { localParticipant } = useLocalParticipant();
    const room = useRoomContext();
    const [micOn, setMicOn] = useState(initialAudio);
    const [camOn, setCamOn] = useState(true);
    const [screenOn, setScreenOn] = useState(false);
    const [cameraDevices, setCameraDevices] = useState([]);
    const [cameraIndex, setCameraIndex] = useState(0);

    useEffect(() => {
        localParticipant?.setMicrophoneEnabled(initialAudio);
        setMicOn(initialAudio);
    }, [initialAudio, localParticipant]);

    const toggleMic = useCallback(async () => {
        const next = !micOn;
        await localParticipant?.setMicrophoneEnabled(next);
        setMicOn(next);
    }, [localParticipant, micOn]);

    const toggleCam = useCallback(async () => {
        const next = !camOn;
        await localParticipant?.setCameraEnabled(next);
        setCamOn(next);
    }, [camOn, localParticipant]);

    const toggleScreen = useCallback(async () => {
        const next = !screenOn;
        await localParticipant?.setScreenShareEnabled(next);
        setScreenOn(next);
    }, [localParticipant, screenOn]);

    const switchCamera = useCallback(async () => {
        if (!navigator?.mediaDevices?.enumerateDevices) return;

        const devices = cameraDevices.length > 0
            ? cameraDevices
            : (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === 'videoinput');

        setCameraDevices(devices);
        if (devices.length <= 1) return;

        const nextIndex = (cameraIndex + 1) % devices.length;
        setCameraIndex(nextIndex);
        await localParticipant?.setCameraEnabled(true, { deviceId: devices[nextIndex].deviceId });
        setCamOn(true);
    }, [cameraDevices, cameraIndex, localParticipant]);

    const handleLeave = useCallback(async () => {
        try {
            await room.disconnect();
        } catch {
            // disconnect can already be in progress
        }
        onLeave();
    }, [onLeave, room]);

    return {
        micOn,
        camOn,
        screenOn,
        toggleMic,
        toggleCam,
        toggleScreen,
        switchCamera,
        handleLeave,
    };
}

function RoomControls({ controls }) {
    return (
        <div className="nmed-tg-controls">
            <button
                className={`nmed-tg-btn${controls.micOn ? '' : ' nmed-tg-btn-off'}`}
                onClick={controls.toggleMic}
                title={controls.micOn ? 'Mikrofonni o\'chirish' : 'Mikrofonni yoqish'}
                type="button"
            >
                {controls.micOn
                    ? <AudioOutlined style={{ fontSize: 22 }} />
                    : <AudioMutedOutlined style={{ fontSize: 22 }} />}
            </button>

            <button
                className="nmed-tg-btn nmed-tg-btn-end"
                onClick={controls.handleLeave}
                title="Qo'ng'iroqni tugatish"
                type="button"
            >
                <PhoneOutlined style={{ fontSize: 26, transform: 'rotate(135deg)' }} />
            </button>

            <button
                className={`nmed-tg-btn${controls.camOn ? '' : ' nmed-tg-btn-off'}`}
                onClick={controls.toggleCam}
                title={controls.camOn ? 'Kamerani o\'chirish' : 'Kamerani yoqish'}
                type="button"
            >
                {controls.camOn
                    ? <VideoCameraOutlined style={{ fontSize: 22 }} />
                    : <MdOutlineVideocamOff size={22} />}
            </button>

            <button
                className={`nmed-tg-btn${controls.screenOn ? ' nmed-tg-btn-off' : ''}`}
                onClick={controls.toggleScreen}
                title={controls.screenOn ? 'Ekran namoyishini to\'xtatish' : 'Ekranni namoyish qilish'}
                type="button"
            >
                <DesktopOutlined style={{ fontSize: 22 }} />
            </button>

            <button
                className="nmed-tg-btn"
                onClick={controls.switchCamera}
                title="Kamerani almashtirish"
                type="button"
            >
                <SwapOutlined style={{ fontSize: 22 }} />
            </button>
        </div>
    );
}

function ParticipantVideoTile({ trackRef, compact = false }) {
    const participantName = trackRef?.participant?.name || 'Foydalanuvchi';
    const hasVideo = Boolean(trackRef?.publication);

    return (
        <div className={`nmed-conf-tile${compact ? ' is-compact' : ''}`}>
            {hasVideo ? (
                <VideoTrack trackRef={trackRef} className="nmed-conf-video" />
            ) : (
                <div className="nmed-conf-placeholder">
                    <Avatar size={compact ? 42 : 64} icon={<UserOutlined />} />
                    <Text style={{ color: '#fff', fontWeight: 600 }}>{participantName}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>Kamera o'chirilgan</Text>
                </div>
            )}
            <div className="nmed-conf-name">{participantName}</div>
        </div>
    );
}

function ConferenceLayout({ onLeave, initialAudio }) {
    const controls = useRoomControls(initialAudio, onLeave);
    const cameraTracks = useTracks(
        [{ source: Track.Source.Camera, withPlaceholder: true }],
        { onlySubscribed: false }
    );
    const screenTracks = useTracks(
        [{ source: Track.Source.ScreenShare, withPlaceholder: false }],
        { onlySubscribed: false }
    );

    const activeScreenTrack = screenTracks.find((track) => track.publication);
    const visibleCameraTracks = useMemo(() => {
        return [...cameraTracks].sort((a, b) => Number(a.participant.isLocal) - Number(b.participant.isLocal));
    }, [cameraTracks]);

    return (
        <div className="nmed-conf-root">
            <RoomAudioRenderer />

            {activeScreenTrack && (
                <div className="nmed-conf-featured">
                    <VideoTrack trackRef={activeScreenTrack} className="nmed-conf-featured-video" />
                    <div className="nmed-conf-featured-label">
                        <DesktopOutlined /> {activeScreenTrack.participant?.name || 'Foydalanuvchi'} ekran namoyishi
                    </div>
                </div>
            )}

            <div className={`nmed-conf-grid${activeScreenTrack ? ' has-featured' : ''}`}>
                {visibleCameraTracks.map((trackRef) => (
                    <ParticipantVideoTile
                        key={`${trackRef.participant.identity}-${trackRef.source}`}
                        trackRef={trackRef}
                        compact={Boolean(activeScreenTrack)}
                    />
                ))}
            </div>

            <RoomControls controls={controls} />
        </div>
    );
}

function TelegramLayout({ onLeave, initialAudio }) {
    const controls = useRoomControls(initialAudio, onLeave);
    const cameraTracks = useTracks(
        [{ source: Track.Source.Camera, withPlaceholder: true }],
        { onlySubscribed: false }
    );
    const screenTracks = useTracks(
        [{ source: Track.Source.ScreenShare, withPlaceholder: false }],
        { onlySubscribed: false }
    );

    const remoteScreenTrack = screenTracks.find((track) => !track.participant.isLocal && track.publication);
    const remoteVideoTrack = cameraTracks.find((track) => !track.participant.isLocal && track.publication);
    const localVideoTrack = cameraTracks.find((track) => track.participant.isLocal && track.publication);
    const mainTrack = remoteScreenTrack || remoteVideoTrack;
    const remoteParticipantName = (mainTrack || cameraTracks.find((track) => !track.participant.isLocal))
        ?.participant?.name ?? '';

    return (
        <div className="nmed-tg-root">
            <RoomAudioRenderer />

            <div className="nmed-tg-main">
                {mainTrack ? (
                    <VideoTrack trackRef={mainTrack} className="nmed-tg-main-video" />
                ) : (
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

                {mainTrack && remoteParticipantName && (
                    <div className="nmed-tg-participant-name">
                        {remoteScreenTrack ? `${remoteParticipantName} ekran namoyishi` : remoteParticipantName}
                    </div>
                )}
            </div>

            {localVideoTrack && (
                <div className="nmed-tg-pip">
                    <VideoTrack trackRef={localVideoTrack} className="nmed-tg-pip-video" />
                    {!controls.camOn && (
                        <div className="nmed-tg-pip-nocam">
                            <MdOutlineVideocamOff size={22} color="rgba(255,255,255,0.7)" />
                        </div>
                    )}
                </div>
            )}

            <RoomControls controls={controls} />
        </div>
    );
}

export default function LiveKitRoomView({
    embedded = false,
    endOnLeave = true,
    onLeft,
    layout = 'call',
    initialAudio = true,
}) {
    const { videoCall, setVideoCall } = useStore();
    const { activeRoom } = videoCall;

    const handleDisconnect = useCallback(async () => {
        if (endOnLeave) {
            try {
                await endCall(activeRoom?.roomName);
                await endVideoCall(activeRoom?.roomName);
            } catch {
                // call may already be closed by the other side
            }
        }
        setVideoCall({ activeRoom: null, incomingCall: null, isCalling: false });
        onLeft?.();
    }, [activeRoom, endOnLeave, onLeft, setVideoCall]);

    if (!activeRoom) return null;

    return (
        <div className={`nmed-livekit-wrapper${embedded ? ' is-embedded' : ''}`}>
            <LiveKitRoom
                token={activeRoom.token}
                serverUrl={activeRoom.liveKitUrl}
                connect={true}
                audio={initialAudio}
                video={true}
                onDisconnected={handleDisconnect}
                style={{ flex: 1, minHeight: 0 }}
            >
                {layout === 'conference' ? (
                    <ConferenceLayout onLeave={handleDisconnect} initialAudio={initialAudio} />
                ) : (
                    <TelegramLayout onLeave={handleDisconnect} initialAudio={initialAudio} />
                )}
            </LiveKitRoom>
        </div>
    );
}
