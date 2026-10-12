/**
 * EKG tahlil yuklash sahifasi (`/analyse-ecg`).
 *
 * Umumiy tuzilish (`components/analyzer`): Bemor → EKG fayli → Tahlil
 * sozlamalari + "Yuborishga tayyorlik" paneli. EKG ga xos qismlar:
 *  - tahlil usuli: "AI bilan tahlil" (standart) yoki "Faqat saqlash";
 *  - bemor shikoyatlari — ixtiyoriy, standart yopiq;
 *  - EKG rasm yo'riqnomasi — birinchi marta avtomatik ochiladi.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import { QuestionCircleOutlined, RobotOutlined, SaveOutlined } from '@ant-design/icons';

import {
    AnalyzerHeader, AnalyzerLayout, AnalyzerStep, Chip, CollapsibleField, DoctorChips,
    FileDropzone, HistorySection, LangDateFields, ModeSwitch, NoDoctorsAlert,
    PatientStep, ReadinessPanel, Field,
} from '../../../components/analyzer/AnalyzerUI';
import { useAnalyzerPage } from '../../../components/analyzer/useAnalyzerPage';

import { analyzeEkgFile, analyzeEkgFileSave } from '../../../host/EkgService';
import { useBackgroundAnalysis } from '../../../hooks/useBackgroundAnalysis';
import { get_ecg_analyses_by_patcient_id } from '../../../host/requests/ECGAnalyseRequest';
import { useStore } from '../../../store/Store';
import { dangerAlert, successAlert, warningAlert } from '../../../tools/Alerts';
import { extractApiError } from '../../../tools/apiError';
import EcgOldResult from '../../../components/results/EcgOldResult';
import { analyzerTour } from '../../../tools/tourSteps';
import { usePageTour } from '../../../components/shared/TourProvider';
import useDocumentTitle from '../../../tools/useDocumentTitle';
import { askDuplicate, withForce, isDuplicateError } from '../../../components/shared/duplicateUpload';
import EcgImageGuideModal from '../../../components/shared/EcgImageGuideModal';

// Birinchi marta EKG rasm yo'riqnomasi ko'rsatilgani localStorage'da belgilanadi
const ECG_GUIDE_SEEN_KEY = 'nmed_ecg_image_guide_seen';

export default function EcgAnalyzer() {
    usePageTour(analyzerTour, { keepMissing: true });
    const navigate = useNavigate();
    const openExistingAnalysis = useCallback((id) => navigate(`/ecg-analyses/view/${id}`), [navigate]);
    const { complaints } = useStore();
    const { runInBackground } = useBackgroundAnalysis();

    const [selectedComplaints, setSelectedComplaints] = useState([]);
    const [complaintsOpen, setComplaintsOpen] = useState(false);
    // Standart rejim — AI bilan tahlil; "Faqat saqlash" kamdan-kam kerak
    const [checkAI, setCheckAI] = useState(true);
    const [guideOpen, setGuideOpen] = useState(false);

    const page = useAnalyzerPage({
        fileKind: 'ecg',
        fetchOldAnalyses: get_ecg_analyses_by_patcient_id,
        onReset: () => {
            setSelectedComplaints([]);
            setComplaintsOpen(false);
            setCheckAI(true);
        },
    });
    const { t, patient, doctors, state, dispatch } = page;
    const { checkReady } = patient;
    useDocumentTitle(t('create_new_ecg_analyse', { defaultValue: 'Yangi EKG tahlil' }));

    // Bemor topilgach — BIRINCHI MARTA tahlil qilayotgan foydalanuvchida
    // rasm yo'riqnomasi avtomatik ochiladi; keyin faqat havola orqali
    useEffect(() => {
        if (!checkReady) return;
        let seen = false;
        try { seen = localStorage.getItem(ECG_GUIDE_SEEN_KEY) === '1'; } catch { seen = false; }
        if (!seen) {
            setGuideOpen(true);
            try { localStorage.setItem(ECG_GUIDE_SEEN_KEY, '1'); } catch { /* maxfiy rejim */ }
        }
    }, [checkReady]);

    const toggleComplaint = useCallback((val) => {
        setSelectedComplaints((prev) => (
            prev.some((x) => x.id === val.id) ? prev.filter((x) => x.id !== val.id) : [...prev, val]
        ));
    }, []);

    const handleSubmit = useCallback(async () => {
        if (state.files.length === 0) return dangerAlert(t('select_file_error'));

        const formData = page.buildFormData();
        selectedComplaints.forEach((f) => formData.append('complaint', f.nameUz));
        selectedComplaints.forEach((f) => formData.append('complaint_id', f.id));

        // Takroriy fayl aniqlansa server 409 qaytaradi va hech qanday
        // yozuv yaratmaydi. Foydalanuvchi tasdiqlasa, aynan shu forma
        // `force_duplicate` bayrog'i bilan qayta yuboriladi (T-096).
        if (checkAI) {
            // ─── AI rejimi: fonda ishlaydi, forma darhol tozalanadi ───
            const send = (data) => runInBackground({
                type: 'ecg',
                label: 'EKG AI tahlil',
                listPath: '/ecg-analyses',
                makeRequest: (handlers) => analyzeEkgFile(data, { ...handlers, signal: page.newSignal() }),
                onDuplicate: async (err) => {
                    if (await askDuplicate(err, t, openExistingAnalysis)) send(withForce(data));
                },
            });
            send(formData);
            page.startOver();
            return;
        }

        // ─── Saqlash rejimi: tez, shu sahifada ───
        const save = async (data) => {
            warningAlert(t('please_wait_save'));
            dispatch({ type: 'SUBMIT_START' });
            try {
                const res = await analyzeEkgFileSave(data, { signal: page.newSignal() });
                dispatch({
                    type: 'SUBMIT_SUCCESS',
                    image: res.ecg_image_url ?? res.ecg_png_base64,
                    imageShort: res.ecg_thumbnail_url ?? res.ecg_png_base64_short,
                });
                successAlert(t('analyse_saved'));
                page.startOver();
            } catch (err) {
                if (isDuplicateError(err)) {
                    dispatch({ type: 'SUBMIT_ERROR', error: '' });
                    if (await askDuplicate(err, t, openExistingAnalysis)) await save(withForce(data));
                    return;
                }
                const msg = extractApiError(err, t('something_went_wrong_try_again', { defaultValue: 'Xatolik yuz berdi' }));
                dispatch({ type: 'SUBMIT_ERROR', error: msg });
                dangerAlert(msg);
            }
        };
        await save(formData);
    }, [state.files.length, page, selectedComplaints, checkAI, runInBackground, dispatch, t, openExistingAnalysis]);

    const modeTitle = checkAI
        ? t('ai_analyse', { defaultValue: 'AI bilan tahlil' })
        : t('save_only', { defaultValue: 'Faqat saqlash' });

    const checklist = [
        {
            key: 'patient', ok: checkReady,
            label: t('analyzer_check_patient', { defaultValue: 'Bemor' }),
            value: checkReady ? [patient.patcient?.lastName, patient.patcient?.firstName].filter(Boolean).join(' ') : '',
            hint: t('analyzer_need_patient', { defaultValue: 'Avval bemorni toping' }),
        },
        {
            key: 'file', ok: page.hasFile,
            label: t('ecg_upload_check_file', { defaultValue: 'EKG fayli' }),
            value: page.hasFile ? state.files[0].name : '',
            hint: t('ecg_upload_need_file', { defaultValue: 'EKG faylini yuklang' }),
        },
        {
            key: 'doctor', ok: page.hasDoctor,
            label: t('analyzer_check_doctor', { defaultValue: 'Shifokor' }),
            value: doctors.selectedDoctors.map((d) => `${d.lastName} ${d.firstName}`).join(', '),
            hint: t('analyzer_need_doctor', { defaultValue: 'Kamida bitta shifokorni tanlang' }),
        },
        {
            key: 'date', ok: page.hasDate,
            label: t('analysis_date'),
            hint: t('analyzer_need_date', { defaultValue: 'Tahlil sanasini kiriting' }),
        },
    ];

    const locked = !checkReady;
    const lockedText = t('analyzer_need_patient', { defaultValue: 'Avval bemorni toping' });

    return (
        <div className="anz-page">
            <EcgImageGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
            <AnalyzerHeader
                title={t('create_new_ecg_analyse', { defaultValue: 'Yangi EKG tahlil' })}
                subtitle={t('ecg_upload_subtitle', { defaultValue: '3 ta qadam: bemorni toping, EKG faylini yuklang va tahlilni yuboring.' })}
            />
            {doctors.doctorsLoaded && doctors.doctorDatas.length === 0 && <NoDoctorsAlert />}

            <AnalyzerLayout
                aside={(
                    <ReadinessPanel
                        items={checklist}
                        blocked={!state.showBtn}
                        mode={<>{checkAI ? <RobotOutlined /> : <SaveOutlined />}{modeTitle}</>}
                        submitIcon={checkAI ? <RobotOutlined /> : <SaveOutlined />}
                        submitLabel={checkAI
                            ? t('analyzer_submit_ai', { defaultValue: 'AI tahlilga yuborish' })
                            : t('ecg_upload_submit_save', { defaultValue: 'Saqlash' })}
                        loading={state.loading3}
                        onSubmit={handleSubmit}
                        note={checkAI ? t('analyzer_background_note', { defaultValue: 'Tahlil fonda bajariladi — natija tayyor bo\'lganda xabar beriladi.' }) : null}
                    />
                )}
            >
                <PatientStep
                    patient={patient}
                    onSearchChange={page.resetOnSearchChange}
                    onStartOver={page.startOver}
                />

                <AnalyzerStep
                    number={2}
                    tour="analyzer-file"
                    title={t('ecg_upload_step_file', { defaultValue: 'EKG fayli' })}
                    hint={`${t('access_file_types')}: ${page.fileTypes.label}`}
                    done={checkReady && page.hasFile}
                    locked={locked}
                    lockedText={lockedText}
                    action={(
                        <Button type="link" icon={<QuestionCircleOutlined />} onClick={() => setGuideOpen(true)}>
                            {t('ecg_upload_guide_link', { defaultValue: 'Qanday rasm kerak?' })}
                        </Button>
                    )}
                >
                    <FileDropzone
                        fileTypes={page.fileTypes}
                        files={state.files}
                        onSelect={page.handleUploadFile}
                        onRemove={page.removeFile}
                    />
                </AnalyzerStep>

                <AnalyzerStep
                    number={3}
                    title={t('analyzer_step_settings', { defaultValue: 'Tahlil sozlamalari' })}
                    done={page.baseReady}
                    locked={locked}
                    lockedText={lockedText}
                >
                    <Field label={t('select_analyse_mode', { defaultValue: 'Tahlil usuli' })}>
                        <ModeSwitch
                            value={checkAI}
                            onChange={setCheckAI}
                            options={[
                                {
                                    value: true,
                                    icon: <RobotOutlined />,
                                    title: t('ai_analyse', { defaultValue: 'AI bilan tahlil' }),
                                    desc: t('ai_analyse_desc', { defaultValue: 'Sun\'iy intellekt tahlil qiladi' }),
                                },
                                {
                                    value: false,
                                    icon: <SaveOutlined />,
                                    title: t('save_only', { defaultValue: 'Faqat saqlash' }),
                                    desc: t('save_only_desc', { defaultValue: 'Tahlil AI ishtirokisiz saqlanadi' }),
                                },
                            ]}
                        />
                    </Field>

                    <DoctorChips
                        tour="analyzer-doctors"
                        label={t('select_doctor_of_patcient')}
                        doctors={doctors.doctorDatas}
                        isSelected={(d) => doctors.selectedDoctors.some((x) => x.id === d.id)}
                        onToggle={doctors.onChangeDoctors}
                        note={t('has_not_doctor')}
                    />

                    <LangDateFields
                        lang={state.lang}
                        onLangChange={page.setLang}
                        dateValue={page.analysisDateValue}
                        onDateChange={page.changeDate}
                    />

                    <CollapsibleField
                        id="anz-complaints"
                        tour="analyzer-complaints"
                        title={t('patcient_complaint')}
                        count={selectedComplaints.length}
                        open={complaintsOpen}
                        onToggle={() => setComplaintsOpen((v) => !v)}
                    >
                        <div className="anz-chips">
                            {complaints.map((item) => (
                                <Chip
                                    key={item.id}
                                    selected={selectedComplaints.some((x) => x.id === item.id)}
                                    onClick={() => toggleComplaint(item)}
                                >
                                    {item[`name${t('data_lang')}`]}
                                </Chip>
                            ))}
                        </div>
                    </CollapsibleField>
                </AnalyzerStep>
            </AnalyzerLayout>

            <HistorySection
                title={t('ecg_upload_history', { defaultValue: 'Bemorning oldingi EKG tahlillari' })}
                items={state.oldAnalyses}
                renderItem={(item) => <EcgOldResult key={item.id} data={item} />}
                hasMore={state.page <= state.totalPage}
                loading={state.oldLoading}
                onMore={() => page.getOldAnalyses(patient.patcient.id)}
            />
        </div>
    );
}
