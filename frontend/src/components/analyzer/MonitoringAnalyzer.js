/**
 * Monitoring hisobotini (Holter, SMAD) yuklash sahifasi.
 *
 * Ilgari `HolterAnalyzer.js` va `SmadAnalyzer.js` 361 qatorli bir xil
 * fayllar edi (faqat nomlar farq qilardi). Endi ikkalasi shu komponentni
 * o'z sozlamalari (`config`) bilan chaqiradi.
 *
 * Qadamlar: Bemor → Hisobot fayli → Tahlil sozlamalari (hisobot
 * muallifi, davolovchi shifokorlar, til, sana) + tayyorlik paneli.
 */
import React, { useCallback, useState } from 'react';
import { RobotOutlined } from '@ant-design/icons';

import {
    AnalyzerHeader, AnalyzerLayout, AnalyzerStep, Chip, DoctorChips, Field, FileDropzone,
    HistorySection, LangDateFields, NoDoctorsAlert, PatientStep, ReadinessPanel,
} from './AnalyzerUI';
import { useAnalyzerPage } from './useAnalyzerPage';
import { useBackgroundAnalysis } from '../../hooks/useBackgroundAnalysis';
import { useStore } from '../../store/Store';
import { dangerAlert } from '../../tools/Alerts';
import { analyzerTour } from '../../tools/tourSteps';
import { usePageTour } from '../shared/TourProvider';
import useDocumentTitle from '../../tools/useDocumentTitle';
import { askDuplicate, withForce } from '../shared/duplicateUpload';

/**
 * @param {object} config
 * @param {'holter'|'smad'} config.kind
 * @param {Function} config.upload            fayl yuklash servisi (`analyzeHolterFile`, …)
 * @param {Function} config.fetchOldAnalyses  bemorning oldingi tahlillari
 * @param {React.ComponentType} config.OldResult  oldingi tahlil kartochkasi
 * @param {string} config.listPath            fon paneli uchun ro'yxat manzili
 * @param {string} config.bgLabel             fon panelidagi nom
 * @param {object} config.text                `{ title, subtitle, fileTitle, fileHint, author, history, fileName, needFile }`
 */
export default function MonitoringAnalyzer({ config }) {
    usePageTour(analyzerTour, { keepMissing: true });
    const { doctors: clinicDoctors } = useStore();
    const { runInBackground } = useBackgroundAnalysis();
    // Hisobot muallifi — bitta shifokor (backend `main_doctor_id`)
    const [mainDoctor, setMainDoctor] = useState(null);

    const page = useAnalyzerPage({
        fileKind: config.kind,
        fetchOldAnalyses: config.fetchOldAnalyses,
        onReset: () => setMainDoctor(null),
    });
    const { t, patient, doctors, state } = page;
    const { checkReady } = patient;
    const text = config.text;
    useDocumentTitle(text.title);

    const handleSubmit = useCallback(() => {
        if (state.files.length === 0) return dangerAlert(t('select_file_error'));

        const formData = page.buildFormData();
        formData.append('main_doctor_id', mainDoctor.id);

        // Takroriy fayl aniqlansa server 409 qaytaradi; tasdiqlansa
        // aynan shu forma `force_duplicate` bilan qayta yuboriladi (T-096)
        const send = (data) => runInBackground({
            type: config.kind,
            label: config.bgLabel,
            listPath: config.listPath,
            makeRequest: (handlers) => config.upload(data, { ...handlers, signal: page.newSignal() }),
            onDuplicate: async (err) => {
                if (await askDuplicate(err, t)) send(withForce(data));
            },
        });
        send(formData);
        page.startOver();
    }, [state.files.length, page, mainDoctor, runInBackground, config, t]);

    const doctorName = (d) => (d ? `${d.lastName} ${d.firstName}` : '');

    const checklist = [
        {
            key: 'patient', ok: checkReady,
            label: t('analyzer_check_patient', { defaultValue: 'Bemor' }),
            value: checkReady ? [patient.patcient?.lastName, patient.patcient?.firstName].filter(Boolean).join(' ') : '',
            hint: t('analyzer_need_patient', { defaultValue: 'Avval bemorni toping' }),
        },
        {
            key: 'file', ok: page.hasFile,
            label: text.fileName,
            value: page.hasFile ? state.files[0].name : '',
            hint: text.needFile,
        },
        {
            key: 'author', ok: !!mainDoctor,
            label: t('analyzer_check_author', { defaultValue: 'Hisobot muallifi' }),
            value: doctorName(mainDoctor),
            hint: t('analyzer_need_author', { defaultValue: 'Hisobot muallifini tanlang' }),
        },
        {
            key: 'doctor', ok: page.hasDoctor,
            label: t('analyzer_check_doctor', { defaultValue: 'Shifokor' }),
            value: doctors.selectedDoctors.map(doctorName).join(', '),
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
    const { OldResult } = config;

    return (
        <div className="anz-page">
            <AnalyzerHeader title={text.title} subtitle={text.subtitle} />
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
                    title={text.fileTitle}
                    hint={`${t('access_file_types')}: ${page.fileTypes.label}`}
                    done={checkReady && page.hasFile}
                    locked={locked}
                    lockedText={lockedText}
                >
                    <FileDropzone
                        fileTypes={page.fileTypes}
                        files={state.files}
                        onSelect={page.handleUploadFile}
                        onRemove={page.removeFile}
                    />
                    {text.fileHint && <p className="anz-note">{text.fileHint}</p>}
                </AnalyzerStep>

                <AnalyzerStep
                    number={3}
                    title={t('analyzer_step_settings', { defaultValue: 'Tahlil sozlamalari' })}
                    done={page.baseReady && !!mainDoctor}
                    locked={locked}
                    lockedText={lockedText}
                >
                    {clinicDoctors.length > 0 && (
                        <Field label={text.author} required>
                            <div className="anz-chips" role="radiogroup">
                                {clinicDoctors.map((item) => (
                                    <Chip
                                        key={item.id}
                                        selected={mainDoctor?.id === item.id}
                                        onClick={() => setMainDoctor(item)}
                                    >
                                        {doctorName(item)}
                                    </Chip>
                                ))}
                            </div>
                        </Field>
                    )}

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
                title={text.history}
                items={state.oldAnalyses}
                renderItem={(item) => <OldResult key={item.id} data={item} />}
                hasMore={state.page <= state.totalPage}
                loading={state.oldLoading}
                onMore={() => page.getOldAnalyses(patient.patcient.id)}
            />
        </div>
    );
}
