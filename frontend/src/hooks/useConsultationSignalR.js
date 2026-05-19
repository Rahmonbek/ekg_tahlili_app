import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { notification } from 'antd';
import { useStore } from '../store/Store';
import { getTokenAccess } from '../host/Host';
import { getConsultationBadgeCounts } from '../host/requests/ConsultationRequest';

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

        const patchBadge = (patcher) => {
            const current = useStore.getState().consultationBadge || {};
            setConsultationBadge(patcher(current));
        };

        const refreshBadge = () => {
            getConsultationBadgeCounts()
                .then((res) => setConsultationBadge(res.data || {}))
                .catch(() => {});
        };

        connection.on('NewInvitation', (payload) => {
            notification.info({
                message: 'Yangi konsultant taklifi',
                description: payload?.clinicName
                    ? `${payload.clinicName} sizni konsultant sifatida taklif qildi`
                    : 'Klinikadan yangi taklif keldi',
                duration: 6,
            });
            patchBadge((current) => ({
                doctorPendingInvitationsCount: (current.doctorPendingInvitationsCount ?? 0) + 1,
                doctorPendingCount: (current.doctorPendingCount ?? 0) + 1,
            }));
            refreshBadge();
            window.dispatchEvent(new CustomEvent('consultation-invitation-received', { detail: payload }));
        });

        connection.on('NewConsultation', (payload) => {
            notification.info({
                message: 'Yangi konsultatsiya',
                description: payload?.clinicName
                    ? `${payload.clinicName} konsultatsiya yubordi`
                    : 'Yangi konsultatsiya keldi',
                duration: 6,
            });
            patchBadge((current) => ({
                doctorCreatedCount: (current.doctorCreatedCount ?? 0) + 1,
                doctorPendingCount: (current.doctorPendingCount ?? 0) + 1,
            }));
            refreshBadge();
            window.dispatchEvent(new CustomEvent('consultation-request-received', { detail: payload }));
        });

        connection.on('ConsultationReviewing', (payload) => {
            notification.success({
                message: 'Konsultatsiya ko\'rib chiqilmoqda',
                description: 'Shifokor konsultatsiyani qabul qildi',
                duration: 5,
            });
            patchBadge((current) => ({
                adminPendingCount: Math.max((current.adminPendingCount ?? 0) - 1, 0),
            }));
            refreshBadge();
            window.dispatchEvent(new CustomEvent('consultation-status-changed', { detail: payload }));
        });

        connection.on('ConsultationCompleted', (payload) => {
            notification.success({
                message: 'Konsultatsiya yakunlandi',
                description: 'Shifokor xulosani saqladi',
                duration: 5,
            });
            refreshBadge();
            window.dispatchEvent(new CustomEvent('consultation-status-changed', { detail: payload }));
        });

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
            patchBadge((current) => ({
                doctorCreatedCount: (current.doctorCreatedCount ?? 0) + 1,
                doctorPendingCount: (current.doctorPendingCount ?? 0) + 1,
            }));
            refreshBadge();
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
            refreshBadge();
            window.dispatchEvent(new CustomEvent('consultation-status-changed', { detail: payload }));
        });

        // Admin: doctor rad etdi
        connection.on('ConsultationRejected', (payload) => {
            notification.warning({
                message: 'Konsultatsiya rad etildi',
                description: payload?.reason ? `Sabab: ${payload.reason}` : '',
                duration: 6,
            });
            refreshBadge();
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
