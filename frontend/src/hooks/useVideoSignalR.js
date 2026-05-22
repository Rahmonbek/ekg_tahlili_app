import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { notification } from 'antd';
import { useStore } from '../store/Store';
import { getTokenAccess } from '../host/Host';
import { setHubMethods } from './videoSignalRService';

// REACT_APP_API_URL dan hub manzilini avtomatik chiqaramiz
// Dev:  http://localhost:5000/api  → http://localhost:5000/hubs/videocall
// Prod: https://api.nmed.uz/api   → https://api.nmed.uz/hubs/videocall
const _apiBase = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api')
    .replace(/\/api\/?$/, '');
const HUB_URL = process.env.REACT_APP_HUB_URL || `${_apiBase}/hubs/videocall`;

export default function useVideoSignalR(enabled) {
    const { setVideoCall } = useStore();
    const connectionRef = useRef(null);

    useEffect(() => {
        if (!enabled) return;

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(HUB_URL, {
                accessTokenFactory: () => getTokenAccess() || '',
            })
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Warning)
            .build();

        connection.on('IncomingCall', (payload) => {
            setVideoCall({ incomingCall: payload, isCalling: false });
        });

        connection.on('CallAccepted', (payload) => {
            setVideoCall({ isCalling: false });
        });

        connection.on('CallRejected', (payload) => {
            const current = useStore.getState().videoCall;
            const shouldClear = !payload?.roomName
                || current.activeRoom?.roomName === payload.roomName
                || current.incomingCall?.roomName === payload.roomName;
            setVideoCall(shouldClear
                ? { activeRoom: null, incomingCall: null, isCalling: false }
                : { isCalling: false });
            notification.warning({ message: "Qo'ng'iroq rad etildi", duration: 4 });
        });

        connection.on('CallEnded', (payload) => {
            const current = useStore.getState().videoCall;
            if (!payload?.roomName || current.activeRoom?.roomName === payload.roomName || current.incomingCall?.roomName === payload.roomName) {
                setVideoCall({ activeRoom: null, incomingCall: null, isCalling: false });
            }
        });

        connection.on('DoctorOnline', (payload) => {
            window.dispatchEvent(new CustomEvent('doctor-status-change', {
                detail: { ...payload, online: true }
            }));
        });

        connection.on('DoctorOffline', (payload) => {
            window.dispatchEvent(new CustomEvent('doctor-status-change', {
                detail: { ...payload, online: false }
            }));
        });

        connection.on('CallError', ({ message }) => {
            notification.error({ message, duration: 4 });
            setVideoCall({ isCalling: false });
        });

        // Hub metodlari — connectionRef orqali ishlaydi
        const hubMethods = {
            initiateCall: async (recipientUserId, roomName) => {
                if (!connectionRef.current) return;
                await connectionRef.current.invoke('InitiateCall', recipientUserId, roomName);
            },
            initiateConsultationCall: async (consultationId, roomName) => {
                if (!connectionRef.current) return;
                await connectionRef.current.invoke('InitiateConsultationCall', consultationId, roomName);
            },
            acceptCall: async (roomName) => {
                if (!connectionRef.current) return;
                await connectionRef.current.invoke('AcceptCall', roomName);
            },
            endCall: async (roomName) => {
                if (!connectionRef.current) return;
                await connectionRef.current.invoke('EndCall', roomName);
            },
        };

        setHubMethods(hubMethods);

        connection.start()
            .then(() => {
                connectionRef.current = connection;
            })
            .catch((err) => {
                console.error('SignalR ulanishda xatolik:', err);
            });

        return () => {
            connection.stop();
            connectionRef.current = null;
            setHubMethods({ initiateCall: null, initiateConsultationCall: null, acceptCall: null, endCall: null });
        };
    }, [enabled]);
}
