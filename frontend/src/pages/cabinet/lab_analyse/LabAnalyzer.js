/**
 * Laboratoriya tahlil natijasini yuklash sahifasi (`/analyse-lab`).
 *
 * Umumiy tuzilish (`components/analyzer`): Bemor → Natija fayllari →
 * Tahlil sozlamalari + tayyorlik paneli.
 *
 * Laboratoriyaga xos: BIR NECHTA fayl (10 tagacha). Klinikalar bitta
 * topshiriq natijasini ko'pincha bir necha varaqda beradi (qon, siydik,
 * biokimyo alohida). Ilgari bitta tahlilga bitta fayl biriktirilardi va
 * xodim har varaqni alohida tahlil qilib yuklashga majbur edi. Endi
 * hammasi bitta tahlil sifatida birga AI ga yuboriladi.
 *
 * "Qaysi tahlillar topshirilgani" (kategoriyalar) bo'limi olib
 * tashlandi — AI ko'rsatkichlarni fayldan o'zi aniqlaydi.
 */
import React, { useCallback } from 'react';
import { RobotOutlined } from '@ant-design/icons';

import {
    AnalyzerHeader, AnalyzerLayout, AnalyzerStep, DoctorChips,
    FileDropzone, HistorySection, LangDateFields, NoDoctorsAlert, PatientStep, ReadinessPanel,
} from '../../../components/analyzer/AnalyzerUI';
import { useAnalyzerPage } from '../../../components/analyzer/useAnalyzerPage';

import { analyzeLabFile } from '../../../host/LabService';
import { useBackgroundAnalysis } from '../../../hooks/useBackgroundAnalysis';
import { get_lab_analyses_by_patcient_id } from '../../../host/requests/LabAnalyseRequest';
import { dangerAlert } from '../../../tools/Alerts';
import LabOldResult from '../../../components/results/lab_analyse/LabOldResult';
import { analyzerTour } from '../../../tools/tourSteps';
import { usePageTour } from '../../../components/shared/TourProvider';
import useDocumentTitle from '../../../tools/useDocumentTitle';
import { askDuplicate, withForce } from '../../../components/shared/duplicateUpload';

// Bitta tahlilga biriktiriladigan fayllar chegarasi — Python
// `lab_analyses_api.MAX_LAB_FILES` bilan bir xil bo'lishi SHART
const MAX_LAB_FILES = 10;

export default function LabAnalyzer() {
    usePageTour(analyzerTour, { keepMissing: true });
    const { runInBackground } = useBackgroundAnalysis();

    const page = useAnalyzerPage({
        fileKind: 'lab',
        fetchOldAnalyses: get_lab_analyses_by_patcient_id,
        maxFiles: MAX_LAB_FILES,
    });
    const { t, patient, doctors, state } = page;
    const { checkReady } = patient;
    useDocumentTitle(t('create_new_lab_analyse', { defaultValue: 'Yangi laboratoriya tahlili' }));

    const handleSubmit = useCallback(() => {
        if (state.files.length === 0) return dangerAlert(t('select_file_error'));

        // Barcha tanlangan fayllar `file` maydonida — bitta tahlil
        const formData = page.buildFormData();

        // Takroriy fayl aniqlansa server 409 qaytaradi; tasdiqlansa
        // aynan shu forma `force_duplicate` bilan qayta yuboriladi (T-096)
        const send = (data) => runInBackground({
            type: 'lab',
            label: 'Laboratoriya tahlil',
            listPath: '/lab-analyses',
            makeRequest: (handlers) => analyzeLabFile(data, { ...handlers, signal: page.newSignal() }),
            onDuplicate: async (err) => {
                if (await askDuplicate(err, t)) send(withForce(data));
            },
        });
        send(formData);
        page.startOver();
    }, [state.files.length, page, runInBackground, t]);

    const checklist = [
        {
            key: 'patient', ok: checkReady,
            label: t('analyzer_check_patient', { defaultValue: 'Bemor' }),
            value: checkReady ? [patient.patcient?.lastName, patient.patcient?.firstName].filter(Boolean).join(' ') : '',
            hint: t('analyzer_need_patient', { defaultValue: 'Avval bemorni toping' }),
        },
        {
            key: 'file', ok: page.hasFile,
            label: page.hasFile
                ? `${t('lab_upload_check_files', { defaultValue: 'Natija fayllari' })}: ${state.files.length}`
                : t('lab_upload_check_files', { defaultValue: 'Natija fayllari' }),
            value: state.files.map((f) => f.name).join(', '),
            hint: t('lab_upload_need_file', { defaultValue: 'Laboratoriya natijasi faylini yuklang' }),
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
            <AnalyzerHeader
                title={t('create_new_lab_analyse', { defaultValue: 'Laboratoriya tahlil yuklash' })}
                subtitle={t('lab_upload_subtitle', { defaultValue: '3 ta qadam: bemorni toping, laboratoriya natijasini yuklang va tahlilga yuboring.' })}
            />
            {doctors.doctorsLoaded && doctors.doctorDatas.length === 0 && <NoDoctorsAlert />}

            <AnalyzerLayout
                aside={(
                    <ReadinessPanel
                        items={checklist}
                        blocked={!state.showBtn}
                        submitIcon={<RobotOutlined />}
                        submitLabel={t('analyzer_submit_ai', { defaultValue: 'AI tahlilga yuborish' })}
                        loading={state.loading3}
                        onSubmit={handleSubmit}
                        note={t('analyzer_background_note', { defaultValue: 'Tahlil fonda bajariladi — natija tayyor bo\'lganda xabar beriladi.' })}
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
                    title={t('lab_upload_step_file', { defaultValue: 'Laboratoriya natijasi' })}
                    hint={`${t('access_file_types')}: ${page.fileTypes.label}`
                        + ` · ${t('lab_upload_max_files', { count: MAX_LAB_FILES, defaultValue: `${MAX_LAB_FILES} tagacha fayl` })}`}
                    done={checkReady && page.hasFile}
                    locked={locked}
                    lockedText={lockedText}
                >
                    <FileDropzone
                        fileTypes={page.fileTypes}
                        files={state.files}
                        onSelect={page.handleUploadFile}
                        onRemove={page.removeFile}
                        maxFiles={MAX_LAB_FILES}
                        text={t('lab_upload_drop_text', { defaultValue: 'Fayllarni tanlang yoki bu yerga tashlang' })}
                        hint={t('lab_upload_drop_hint', { defaultValue: "Natija bir necha varaqda bo'lsa, hammasini birga biriktiring — ular bitta tahlil sifatida birga tekshiriladi" })}
                    />
                    <p className="anz-note">{t('alert_lab')}</p>
                </AnalyzerStep>

                <AnalyzerStep
                    number={3}
                    title={t('analyzer_step_settings', { defaultValue: 'Tahlil sozlamalari' })}
                    done={page.baseReady}
                    locked={locked}
                    lockedText={lockedText}
                >
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

                </AnalyzerStep>
            </AnalyzerLayout>

            <HistorySection
                title={t('lab_upload_history', { defaultValue: 'Bemorning oldingi laboratoriya tahlillari' })}
                items={state.oldAnalyses}
                renderItem={(item) => <LabOldResult key={item.id} data={item} />}
                hasMore={state.page <= state.totalPage}
                loading={state.oldLoading}
                onMore={() => page.getOldAnalyses(patient.patcient.id)}
            />
        </div>
    );
}
