import { useStore } from '../store/Store';

export const useBackgroundAnalysis = () => {
    const { addPendingAnalysis, updatePendingAnalysis, removePendingAnalysis } = useStore();

    const runInBackground = ({ type, label, listPath, analyzePromise, onSuccess }) => {
        const key = `analysis-${Date.now()}`;
        addPendingAnalysis({ key, type, label, listPath, status: 'loading' });

        analyzePromise
            .then((result) => {
                const data = result?.data || result || {};
                const analysisId = extractAnalysisId(type, data);
                if (analysisId) {
                    updatePendingAnalysis(key, { type, analysisId, status: 'loading' });
                } else {
                    updatePendingAnalysis(key, { status: 'done' });
                    setTimeout(() => removePendingAnalysis(key), 12000);
                }
                if (onSuccess) onSuccess(result);
            })
            .catch((err) => {
                const errorMsg = err?.response?.data?.message || err?.message || 'Xatolik yuz berdi';
                updatePendingAnalysis(key, { status: 'error', errorMsg });
                setTimeout(() => removePendingAnalysis(key), 8000);
            });

        return key;
    };

    return { runInBackground };
};

const idKeys = {
    ecg: ['ecg_id', 'ecgId', 'id'],
    lab: ['lab_id', 'labId', 'id'],
    holter: ['holter_id', 'holterId', 'id'],
    smad: ['smad_id', 'smadId', 'id'],
    parasitology: ['parasitology_id', 'parasitologyId', 'analysisId', 'id'],
};

function extractAnalysisId(type, data) {
    const keys = idKeys[type] || ['analysisId', 'id'];
    for (const key of keys) {
        const value = data?.[key];
        if (value != null && Number(value) > 0) return Number(value);
    }
    return null;
}
