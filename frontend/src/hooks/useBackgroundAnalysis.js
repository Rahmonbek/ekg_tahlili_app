import { useStore } from '../store/Store';
import { isDuplicateError } from '../components/shared/duplicateUpload';
import { extractApiError } from '../tools/apiError';

export const useBackgroundAnalysis = () => {
    const { addPendingAnalysis, updatePendingAnalysis, attachPendingAnalysisId, removePendingAnalysis } = useStore();

    /**
     * @param {function} [makeRequest] `(handlers) => Promise` — berilsa,
     *        yuklash foizi shu yozuvda ko'rsatiladi (T-054). `analyzePromise`
     *        eski chaqiruvlar bilan moslik uchun saqlangan.
     */
    const runInBackground = ({ type, label, listPath, analyzePromise, makeRequest, onSuccess, onDuplicate }) => {
        const key = `analysis-${Date.now()}`;
        addPendingAnalysis({ key, type, label, listPath, status: 'loading', uploadPercent: null });

        // Ko'rsatkich aynan shu yerda: yuklash formasi `retryAnalyse()`
        // bilan darhol tozalanadi va u yerdagi har qanday element DOM dan
        // chiqib ketadi (T-054).
        const promise = makeRequest
            ? makeRequest({
                onProgress: (percent) => updatePendingAnalysis(key, { uploadPercent: percent }),
            })
            : analyzePromise;

        promise
            .then((result) => {
                const data = result?.data || result || {};
                const analysisId = extractAnalysisId(type, data);
                if (analysisId) {
                    // ID ni biriktiramiz; SignalR eventi allaqachon kelgan
                    // bo'lsa dublikatni oldini oladi (juda tez tugagan tahlil).
                    attachPendingAnalysisId(key, type, analysisId);
                } else {
                    updatePendingAnalysis(key, { status: 'done' });
                    setTimeout(() => removePendingAnalysis(key), 12000);
                }
                if (onSuccess) onSuccess(result);
            })
            .catch((err) => {
                // Takroriy fayl xatolik emas — foydalanuvchidan tasdiq
                // so'raladi, shuning uchun qizil belgi chiqarilmaydi (T-096)
                if (isDuplicateError(err) && onDuplicate) {
                    removePendingAnalysis(key);
                    onDuplicate(err);
                    return;
                }
                const errorMsg = extractApiError(err, 'Xatolik yuz berdi');
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
