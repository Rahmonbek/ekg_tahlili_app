import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { notification } from 'antd';
import { useStore } from '../store/Store';
import { getTokenAccess } from '../host/Host';

const _apiBase = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api')
    .replace(/\/api\/?$/, '');
const HUB_URL = `${_apiBase}/hubs/consultation`;

export default function useConsultationSignalR(enabled) {
    const { setConsultationBadge } = useStore();
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

        // Doctor: yangi konsultatsiya so'rovi keldi
        connection.on('NewConsultationRequest', (payload) => {
            notification.info({
                message: 'Yangi konsultatsiya so\'rovi',
                description: payload?.clinicName
                    ? `${payload.clinicName} — ${payload.patientName || ''}`
                    : 'Yangi so\'rov keldi',
                duration: 6,
            });
            // Zustand getState() orqali joriy qiymatni olamiz (stale closure muammosidan qochish)
            const current = useStore.getState().consultationBadge;
            setConsultationBadge({ doctorPendingCount: (current?.doctorPendingCount ?? 0) + 1 });
            // Sahifa refresh uchun custom event
            window.dispatchEvent(new CustomEvent('consultation-request-received', { detail: payload }));
        });

        // Admin: doctor qabul qildi
        connection.on('ConsultationAccepted', (payload) => {
            notification.success({
                message: 'Konsultatsiya qabul qilindi',
                description: payload?.doctorName ? `Dr. ${payload.doctorName} qabul qildi` : '',
                duration: 5,
            });
            window.dispatchEvent(new CustomEvent('consultation-status-changed', { detail: payload }));
        });

        // Admin: doctor rad etdi
        connection.on('ConsultationRejected', (payload) => {
            notification.warning({
                message: 'Konsultatsiya rad etildi',
                description: payload?.reason ? `Sabab: ${payload.reason}` : '',
                duration: 6,
            });
            window.dispatchEvent(new CustomEvent('consultation-status-changed', { detail: payload }));
        });

        // Admin: vaqt belgilandi
        connection.on('ConsultationScheduled', (payload) => {
            const date = payload?.scheduledAt
                ? new Date(payload.scheduledAt).toLocaleString('uz-UZ')
                : '';
            notification.info({
                message: 'Video vaqti belgilandi',
                description: date ? `Vaqt: ${date}` : '',
                duration: 5,
            });
            window.dispatchEvent(new CustomEvent('consultation-status-changed', { detail: payload }));
        });

        // Admin: xulosa tayyor
        connection.on('ConsultationConcluded', (payload) => {
            notification.success({
                message: 'Xulosa tayyor',
                description: 'Konsultatsiya xulosasi yozildi',
                duration: 5,
            });
            window.dispatchEvent(new CustomEvent('consultation-status-changed', { detail: payload }));
        });

        // Doctor: so'rov bekor qilindi
        connection.on('ConsultationCancelled', (payload) => {
            notification.warning({
                message: 'Konsultatsiya bekor qilindi',
                description: 'Admin konsultatsiya so\'rovini bekor qildi',
                duration: 5,
            });
            window.dispatchEvent(new CustomEvent('consultation-status-changed', { detail: payload }));
        });

        // Admin: muddati o'tdi
        connection.on('ConsultationExpired', (payload) => {
            notification.error({
                message: 'Konsultatsiya muddati o\'tdi',
                description: '48 soat ichida doctor javob bermadi',
                duration: 6,
            });
            window.dispatchEvent(new CustomEvent('consultation-status-changed', { detail: payload }));
        });

        connection.start()
            .then(() => {
                connectionRef.current = connection;
            })
            .catch((err) => {
                console.error('ConsultationHub ulanishda xatolik:', err);
            });

        return () => {
            connection.stop();
            connectionRef.current = null;
        };
    }, [enabled]);
}
