import { useStore } from '../store/Store';

export const useBackgroundAnalysis = () => {
    const { addPendingAnalysis, updatePendingAnalysis, removePendingAnalysis } = useStore();

    const runInBackground = ({ label, listPath, analyzePromise, onSuccess }) => {
        const key = `analysis-${Date.now()}`;
        addPendingAnalysis({ key, label, listPath, status: 'loading' });

        analyzePromise
            .then((result) => {
                updatePendingAnalysis(key, { status: 'done' });
                if (onSuccess) onSuccess(result);
                setTimeout(() => removePendingAnalysis(key), 12000);
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
