import { useReducer, useCallback } from 'react';

/**
 * Analyzer sahifalari uchun umumiy state boshqaruvchi (useReducer).
 * 18+ ta alohida useState o'rniga bitta reducer ishlatadi —
 * retryAnalyse/resetData chaqirilganda FAQAT 1 TA re-render bo'ladi.
 */

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
