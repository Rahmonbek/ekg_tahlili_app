import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { useStore } from '../store/Store';
import { getTokenAccess } from '../host/Host';

const _apiBase = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api')
    .replace(/\/api\/?$/, '');
const HUB_URL = `${_apiBase}/hubs/analysis`;

export default function useAnalysisSignalR(enabled) {
    const connectionRef = useRef(null);
    const { updatePendingAnalysisByRef, upsertPendingAnalysisByRef, removePendingAnalysisByRef } = useStore();

    useEffect(() => {
        if (!enabled) return;

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(HUB_URL, {
                accessTokenFactory: () => getTokenAccess() || '',
            })
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Warning)
            .build();

        // Ulanganda/qayta ulanganda serverdan joriy tahlillar ro'yxatini olib
        // holatni tiklaymiz: sahifa yangilanganda yuklanayotgan tahlillar qayta
        // ko'rinadi, uzilish paytida yo'qolgan "tugadi" xabari ham qamraladi.
        const syncPending = async () => {
            try {
                const list = await connection.invoke('SyncPending');
                (list || []).forEach((p) => {
                    if (!p?.type || !p?.analysisId) return;
                    upsertPendingAnalysisByRef({
                        key: `analysis-${p.type}-${p.analysisId}`,
                        type: p.type,
                        analysisId: p.analysisId,
                        status: p.status || 'loading',
                        label: p.label || 'Tahlil',
                        listPath: p.listPath || '/',
                        errorMsg: p.status === 'error' ? 'AI tahlil xatolik bilan tugadi' : undefined,
                    });
                });
            } catch (err) {
                // Sinxronlash muvaffaqiyatsiz bo'lsa ham asosiy oqim ishlaydi
                console.warn('SyncPending muvaffaqiyatsiz:', err);
            }
        };

        connection.onreconnected(() => { syncPending(); });

        connection.on('AnalysisProgressUpdated', (payload) => {
            const type = payload?.type;
            const analysisId = payload?.analysisId;
            if (!type || !analysisId) return;

            // Tahlil o'chirilgan — ko'rsatkichdan olib tashlanadi, yangilanmaydi.
            if (payload.status === 'removed') {
                removePendingAnalysisByRef(type, analysisId);
                return;
            }

            const current = useStore.getState().pendingAnalyses || [];
            const exists = current.some((item) =>
                item.type === type && Number(item.analysisId) === Number(analysisId)
            );

            const patch = {
                status: payload.status || 'loading',
                label: payload.label || 'Tahlil',
                listPath: payload.listPath || '/',
                errorMsg: payload.status === 'error' ? 'AI tahlil xatolik bilan tugadi' : undefined,
            };

            if (exists) {
                updatePendingAnalysisByRef(type, analysisId, patch);
            } else {
                upsertPendingAnalysisByRef({
                    key: `analysis-${type}-${analysisId}`,
                    type,
                    analysisId,
                    ...patch,
                });
            }
        });

        connection.start()
            .then(() => {
                connectionRef.current = connection;
                // Dastlabki ulanishda ham holatni tiklaymiz (sahifa yangilangan bo'lishi mumkin)
                syncPending();
            })
            .catch((err) => {
                console.error('AnalysisHub ulanishda xatolik:', err);
            });

        return () => {
            connection.stop();
            connectionRef.current = null;
        };
    }, [enabled, updatePendingAnalysisByRef, upsertPendingAnalysisByRef, removePendingAnalysisByRef]);
}
