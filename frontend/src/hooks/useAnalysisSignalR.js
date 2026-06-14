import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { useStore } from '../store/Store';
import { getTokenAccess } from '../host/Host';

const _apiBase = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api')
    .replace(/\/api\/?$/, '');
const HUB_URL = `${_apiBase}/hubs/analysis`;

export default function useAnalysisSignalR(enabled) {
    const connectionRef = useRef(null);
    const { updatePendingAnalysisByRef, upsertPendingAnalysisByRef } = useStore();

    useEffect(() => {
        if (!enabled) return;

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(HUB_URL, {
                accessTokenFactory: () => getTokenAccess() || '',
            })
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Warning)
            .build();

        connection.on('AnalysisProgressUpdated', (payload) => {
            const type = payload?.type;
            const analysisId = payload?.analysisId;
            if (!type || !analysisId) return;

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
            })
            .catch((err) => {
                console.error('AnalysisHub ulanishda xatolik:', err);
            });

        return () => {
            connection.stop();
            connectionRef.current = null;
        };
    }, [enabled, updatePendingAnalysisByRef, upsertPendingAnalysisByRef]);
}
