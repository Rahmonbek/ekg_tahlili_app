import { useCallback, useEffect, useRef, useState } from 'react';
import { Form } from 'antd';
import { useTranslation } from 'react-i18next';

import { usePatientSearch } from '../../hooks/usePatientSearch';
import { useRegionDistrict } from '../../hooks/useRegionDistrict';
import { useDoctorPositions } from '../../hooks/useDoctorPositions';
import { fileKey, getTodayDateInputValue, useAnalyzerState } from '../../hooks/useAnalyzerState';
import useFileTypes from '../../hooks/useFileTypes';
import { useStore } from '../../store/Store';
import { calculateAge } from '../../tools/formatters';
import { warningAlert } from '../../tools/Alerts';
import { validatedBeforeUpload } from '../../tools/validatedBeforeUpload';

/**
 * "Bemor" qadami uchun umumiy holat: qidiruv va bemor formalari,
 * viloyat/tuman, topilgan bemorni tahrirlash rejimi.
 *
 * Fayl yuklanmaydigan sahifalar (Kompleks AI) ham ishlatadi, shuning
 * uchun `useAnalyzerPage` dan alohida.
 */
export function usePatientStep({ onPatientFound } = {}) {
    const [form] = Form.useForm();   // bemor ma'lumotlari
    const [form1] = Form.useForm();  // passport + tug'ilgan sana qidiruvi
    const [gender, setGender] = useState(true);
    const [editPatient, setEditPatient] = useState(false);
    const { regions, districts, fetchDistricts } = useRegionDistrict();

    const search = usePatientSearch({ form, getDistricts: fetchDistricts, onPatientFound });

    // Bemor saqlangach (yoki boshqasi topilgach) tahrirlash rejimi yopiladi
    useEffect(() => {
        if (search.checkReady) setEditPatient(false);
    }, [search.checkReady, search.patcient]);

    return {
        ...search,
        form, form1,
        gender, setGender,
        editPatient, setEditPatient,
        regions, districts, fetchDistricts,
        // Qidirildi, lekin bazada yo'q — yangi bemor formasi ko'rsatiladi
        isNewPatient: !!search.patcient && !search.checkReady,
    };
}

/**
 * Fayl yuklanadigan tahlil sahifalari (EKG, Holter, SMAD, Laboratoriya)
 * uchun umumiy mantiq. Ilgari har bir sahifa shu kodning o'z nusxasini
 * saqlardi (Holter va SMAD fayllari 100% bir xil edi).
 *
 * @param {string}   fileKind          `useFileTypes` turi: 'ecg' | 'holter' | 'smad' | 'lab'
 * @param {Function} fetchOldAnalyses  `({ id, page }) => Promise` — bemorning oldingi tahlillari
 * @param {Function} [onReset]         sahifaga xos holatni tozalash (shikoyat, …)
 * @param {number}   [maxFiles=1]      1 dan katta bo'lsa — bir nechta fayl rejimi
 *                                     (laboratoriya: bitta topshiriq bir necha varaqda)
 */
export function useAnalyzerPage({ fileKind, fetchOldAnalyses, onReset, maxFiles = 1 }) {
    const { t } = useTranslation();
    const fileTypes = useFileTypes(fileKind);
    const { user } = useStore();
    const doctorsApi = useDoctorPositions();
    const { state, dispatch, resetAll } = useAnalyzerState();
    const [analysisDateValue, setAnalysisDateValue] = useState(getTodayDateInputValue());

    useEffect(() => {
        if (!state.analysis_date && analysisDateValue) {
            dispatch({
                type: 'SET_FIELD',
                field: 'analysis_date',
                value: new Date(`${analysisDateValue}T00:00:00`).toISOString(),
            });
        }
    }, [analysisDateValue, dispatch, state.analysis_date]);

    const getOldAnalyses = useCallback(async (id, type) => {
        dispatch({ type: 'OLD_LOADING' });
        try {
            const res = await fetchOldAnalyses({
                id, page: type === 'first' ? 1 : state.page,
            });
            dispatch({
                type: 'SET_OLD_ANALYSES',
                items: res.data.items,
                replace: type === 'first',
                nextPage: type === 'first' ? 2 : state.page + 1,
                totalPages: res.data.totalPages,
            });
        } catch {
            dispatch({ type: 'OLD_LOADED' });
        }
    }, [state.page, dispatch, fetchOldAnalyses]);

    const patient = usePatientStep({
        onPatientFound: (data) => getOldAnalyses(data.id, 'first'),
    });
    const { patcient, checkReady, resetPatient, setEditPatient, form, form1 } = patient;
    const { selectedDoctors, resetDoctorSelection } = doctorsApi;

    const onResetRef = useRef(onReset);
    onResetRef.current = onReset;

    const resetForm = useCallback((clearSearch) => {
        resetPatient();
        resetDoctorSelection();
        setEditPatient(false);
        setAnalysisDateValue(getTodayDateInputValue());
        resetAll();
        form.resetFields();
        if (clearSearch) form1.resetFields();
        onResetRef.current?.();
    }, [resetPatient, resetDoctorSelection, setEditPatient, resetAll, form, form1]);

    /** To'liq tozalash — yangi bemor uchun boshidan boshlash. */
    const startOver = useCallback(() => resetForm(true), [resetForm]);
    /** Qidiruv maydoni o'zgardi — boshqa bemor, lekin kiritilgan qidiruv qoladi. */
    const resetOnSearchChange = useCallback(() => resetForm(false), [resetForm]);

    const multiple = maxFiles > 1;
    // Tanlangan fayllar soni — bir vaqtda bir nechta fayl tanlanganda
    // chegarani darhol (tekshiruv tugashini kutmasdan) hisoblash uchun
    const filesRef = useRef(state.files);
    filesRef.current = state.files;
    const pendingRef = useRef(new Set());

    // Fayl tanlangan zahoti sifati tekshiriladi, yaroqli bo'lsagina olinadi
    const handleUploadFile = useCallback((file) => {
        if (multiple) {
            const key = fileKey(file);
            const taken = filesRef.current.length + pendingRef.current.size;
            if (filesRef.current.some((f) => fileKey(f) === key) || pendingRef.current.has(key)) {
                return false; // aynan shu fayl allaqachon tanlangan
            }
            if (taken >= maxFiles) {
                warningAlert(t('analyzer_max_files', {
                    count: maxFiles,
                    defaultValue: `Ko'pi bilan ${maxFiles} ta fayl biriktirish mumkin`,
                }));
                return false;
            }
            pendingRef.current.add(key);
            return validatedBeforeUpload(file, {
                t,
                extensions: fileTypes.extensions,
                onValid: () => dispatch({ type: 'ADD_FILE', file, max: maxFiles }),
            }).finally(() => pendingRef.current.delete(key));
        }
        return validatedBeforeUpload(file, {
            t,
            extensions: fileTypes.extensions,
            onValid: () => {
                dispatch({ type: 'SET_FILES', files: [file], fileInput: '' });
                if (patcient?.id) getOldAnalyses(patcient.id, 'first');
            },
        });
    }, [multiple, maxFiles, t, fileTypes.extensions, patcient, getOldAnalyses, dispatch]);

    /** `file` berilsa — faqat shu fayl, aks holda hammasi olib tashlanadi. */
    const removeFile = useCallback((file) => {
        if (multiple && file) dispatch({ type: 'REMOVE_FILE', file });
        else dispatch({ type: 'SET_FILES', files: [], fileInput: '' });
    }, [multiple, dispatch]);

    const setLang = useCallback((value) => {
        dispatch({ type: 'SET_FIELD', field: 'lang', value });
    }, [dispatch]);

    const changeDate = useCallback((value) => {
        setAnalysisDateValue(value || '');
        dispatch({
            type: 'SET_FIELD',
            field: 'analysis_date',
            value: value ? new Date(`${value}T00:00:00`).toISOString() : null,
        });
    }, [dispatch]);

    // Yuklashni bekor qilish uchun (T-054) — har yuborishda yangi signal
    const uploadAbortRef = useRef(null);
    const newSignal = useCallback(
        () => (uploadAbortRef.current = new AbortController()).signal,
        [],
    );

    /** Barcha turlar uchun umumiy forma maydonlari; sahifa o'zinikini qo'shadi. */
    const buildFormData = useCallback(() => {
        const formData = new FormData();
        state.files.forEach((f) => formData.append('file', f));
        selectedDoctors.forEach((d) => formData.append('doctor_id', d.id));
        formData.append('gender', patcient.gender ? 'erkak' : 'ayol');
        formData.append('patcient_id', patcient.id);
        formData.append('created_doctor_id', user.doctor.id);
        formData.append('clinic_id', user.clinic.id);
        formData.append('lang', state.lang);
        formData.append('age', calculateAge(patcient.birthDate));
        if (state.analysis_date) {
            formData.append('analysis_date', state.analysis_date);
        }
        return formData;
    }, [state.files, state.lang, state.analysis_date, selectedDoctors, patcient, user]);

    const hasFile = state.files.length > 0;
    const hasDoctor = selectedDoctors.length > 0;
    const hasDate = !!analysisDateValue;

    return {
        t,
        user,
        fileTypes,
        maxFiles,
        patient,
        doctors: doctorsApi,
        state,
        dispatch,
        analysisDateValue,
        changeDate,
        setLang,
        getOldAnalyses,
        handleUploadFile,
        removeFile,
        startOver,
        resetOnSearchChange,
        buildFormData,
        newSignal,
        hasFile,
        hasDoctor,
        hasDate,
        /** Barcha turlar uchun umumiy shart; sahifa o'z shartini qo'shadi. */
        baseReady: checkReady && hasFile && hasDate && hasDoctor,
    };
}
