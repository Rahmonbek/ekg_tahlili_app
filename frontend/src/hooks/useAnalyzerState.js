import { useReducer, useCallback } from 'react';

/**
 * Analyzer sahifalari uchun umumiy state boshqaruvchi (useReducer).
 * 18+ ta alohida useState o'rniga bitta reducer ishlatadi —
 * retryAnalyse/resetData chaqirilganda FAQAT 1 TA re-render bo'ladi.
 */

export function getTodayDateInputValue() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

/** Faylni bir xil tanlanganini aniqlash uchun kalit (nom + hajm + sana). */
export function fileKey(file) {
    return `${file.name}|${file.size}|${file.lastModified}`;
}

const initialState = {
    result: null,
    error: null,
    image: null,
    imageShort: null,
    files: [],
    fileInput: '',
    showBtn: true,
    saved: false,
    checkAI: false,
    loading3: false,
    lang: 'uz',
    analysis_date: null,
    oldAnalyses: [],
    page: 1,
    totalPage: 0,
    oldLoading: false,
};

function analyzerReducer(state, action) {
    switch (action.type) {
        case 'SET_FIELD':
            return { ...state, [action.field]: action.value };

        case 'SET_FILES':
            return {
                ...state,
                files: action.files,
                fileInput: action.fileInput,
                showBtn: true,
                oldAnalyses: [],
                totalPage: 0,
                page: 1,
            };

        // Bir nechta fayl rejimi (laboratoriya): fayl ro'yxatga QO'SHILADI.
        // Bir vaqtda bir nechta fayl tanlanganda har biri alohida va
        // asinxron tekshiriladi — shuning uchun holat funksional
        // yangilanadi (eskirgan `state.files` ustiga yozib yubormaslik uchun).
        case 'ADD_FILE': {
            const key = fileKey(action.file);
            if (state.files.some((f) => fileKey(f) === key)) return state;
            if (action.max && state.files.length >= action.max) return state;
            return { ...state, files: [...state.files, action.file], showBtn: true };
        }

        case 'REMOVE_FILE':
            return { ...state, files: state.files.filter((f) => f !== action.file) };

        case 'SUBMIT_START':
            return {
                ...state,
                loading3: true,
                result: null,
                error: null,
                image: null,
                imageShort: null,
            };

        case 'SUBMIT_SUCCESS':
            return {
                ...state,
                loading3: false,
                showBtn: false,
                saved: true,
                result: action.result ?? state.result,
                image: action.image ?? state.image,
                imageShort: action.imageShort ?? state.imageShort,
            };

        case 'SUBMIT_ERROR':
            return {
                ...state,
                loading3: false,
                error: action.error,
            };

        case 'SET_OLD_ANALYSES':
            return {
                ...state,
                oldAnalyses: action.replace 
                    ? [...action.items] 
                    : [...state.oldAnalyses, ...action.items],
                page: action.nextPage,
                totalPage: action.totalPages,
                oldLoading: false,
            };

        case 'OLD_LOADING':
            return { ...state, oldLoading: true };

        case 'OLD_LOADED':
            return { ...state, oldLoading: false };

        case 'RESET':
            // Butun formani tozalash — faqat 1 ta re-render!
            return { ...initialState };

        default:
            return state;
    }
}

/**
 * Hook: useAnalyzerState
 * 
 * Barcha analyzer sahifalari uchun umumiy state + dispatch.
 * retryAnalyse() va resetData() — bitta dispatch bilan ishlaydi.
 */
export function useAnalyzerState() {
    const [state, dispatch] = useReducer(analyzerReducer, initialState);

    const resetAll = useCallback(() => {
        dispatch({ type: 'RESET' });
    }, []);

    const setField = useCallback((field, value) => {
        dispatch({ type: 'SET_FIELD', field, value });
    }, []);

    return { state, dispatch, resetAll, setField };
}
