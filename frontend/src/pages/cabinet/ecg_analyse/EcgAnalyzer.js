import { Alert, Button, Checkbox, Col, Form, Row, Select, Tooltip, Upload } from 'antd';
import { InboxOutlined, SaveOutlined, RobotOutlined, CheckCircleFilled } from '@ant-design/icons';
import React, { useCallback, useEffect, useState, useRef} from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IoAlertCircleSharp } from 'react-icons/io5';
import { MoonLoader } from 'react-spinners';

// ─── Hooks (shared) ───
import { usePatientSearch } from '../../../hooks/usePatientSearch';
import { useRegionDistrict } from '../../../hooks/useRegionDistrict';
import { useDoctorPositions } from '../../../hooks/useDoctorPositions';
import { getTodayDateInputValue, useAnalyzerState } from '../../../hooks/useAnalyzerState';

// ─── Shared Components ───
import PatientSearchSection from '../../../components/shared/PatientSearchSection';
import PatientInfoForm from '../../../components/shared/PatientInfoForm';
import DoctorSelectSection from '../../../components/shared/DoctorSelectSection';

// ─── Services & Utils ───
import { analyzeEkgFile, analyzeEkgFileSave } from '../../../host/EkgService';
import { useBackgroundAnalysis } from '../../../hooks/useBackgroundAnalysis';
import { get_ecg_analyses_by_patcient_id } from '../../../host/requests/ECGAnalyseRequest';
import { useStore } from '../../../store/Store';
import { calculateAge } from '../../../tools/formatters';
import { dangerAlert, successAlert, warningAlert } from '../../../tools/Alerts';
import { extractApiError } from '../../../tools/apiError';
import { validatedBeforeUpload } from '../../../tools/validatedBeforeUpload';

// ─── Result Components ───
import EcgResult from '../../../components/results/EcgResult';
import EcgOldResult from '../../../components/results/EcgOldResult';
import { analyzerTour } from '../../../tools/tourSteps';
import { usePageTour } from '../../../components/shared/TourProvider';
import useDocumentTitle from '../../../tools/useDocumentTitle';
import DateField from '../../../components/shared/DateField';
import { askDuplicate, withForce, isDuplicateError } from '../../../components/shared/duplicateUpload';
import useFileTypes from '../../../hooks/useFileTypes';

export default function EcgAnalyzer() {
    // Ruxsat etilgan formatlar serverdan olinadi — ilgari ular
    // bu yerda qo'lda yozilgan va server ro'yxatidan farq qilardi (T-041)
    const fileTypes = useFileTypes('ecg');
    // Qo'llanma qadamlari ro'yxatdan o'tkaziladi; tugma header'da
    usePageTour(analyzerTour, { keepMissing: true });
    const { t } = useTranslation()
    useDocumentTitle(t('create_new_ecg_analyse', { defaultValue: "Yangi EKG tahlil" }));
    const [form] = Form.useForm();
    const [form1] = Form.useForm();
    const [form2] = Form.useForm();
    const [gender, setGender] = useState(true);
    const [selectedComplaints, setSelectedComplaints] = useState([]);
    const [checkAI, setCheckAI] = useState(false);
    const [analysisDateValue, setAnalysisDateValue] = useState(getTodayDateInputValue());

    const { complaints, user } = useStore();
    const { runInBackground } = useBackgroundAnalysis();

    // ─── Custom Hooks ───
    const { regions, districts, fetchDistricts } = useRegionDistrict();
    const {
        doctorDatas, positionDatas, selectedDoctors,
        onChangeDoctors, filterByPosition, resetDoctorSelection, doctorsLoaded,
    } = useDoctorPositions();
    const { state, dispatch, resetAll } = useAnalyzerState();

    useEffect(() => {
        if (!state.analysis_date && analysisDateValue) {
            dispatch({
                type: 'SET_FIELD',
                field: 'analysis_date',
                value: new Date(`${analysisDateValue}T00:00:00`).toISOString(),
            });
        }
    }, [analysisDateValue, dispatch, state.analysis_date]);

    const getOldECGAnalyses = useCallback(async (id, type) => {
        dispatch({ type: 'OLD_LOADING' });
        try {
            const res = await get_ecg_analyses_by_patcient_id({
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
    }, [state.page, dispatch]);

    const {
        patcient, loading, loadingSave, checkReady,
        phoneValue, setPhoneValue, searchPatcient, savePatcient, resetPatient,
    } = usePatientSearch({
        form,
        getDistricts: fetchDistricts,
        onPatientFound: (data) => getOldECGAnalyses(data.id, 'first'),
    });

    // ─── Complaints Toggle ───
    const onChangeComplaints = useCallback((val) => {
        setSelectedComplaints((prev) => {
            const idx = prev.findIndex((x) => x.id === val.id);
            if (idx === -1) return [...prev, val];
            return prev.filter((x) => x.id !== val.id);
        });
    }, []);

    // Upload.Dragger uchun handler — fayl tanlangan zahoti sifatini
    // tekshiradi (loader + aniq xato), yaroqli bo'lsagina formaga qo'shadi
    const handleUploadFile = useCallback((file) => (
        validatedBeforeUpload(file, {
            t,
            extensions: fileTypes.extensions,
            onValid: () => {
                dispatch({ type: 'SET_FILES', files: [file], fileInput: '' });
                if (patcient?.id) getOldECGAnalyses(patcient.id, 'first');
            },
        })
    ), [t, fileTypes.extensions, patcient, getOldECGAnalyses, dispatch]);

    // ─── Retry / Reset ───
    const retryAnalyse = useCallback(() => {
        resetPatient();
        resetDoctorSelection();
        setSelectedComplaints([]);
        setCheckAI(false);
        setAnalysisDateValue(getTodayDateInputValue());
        resetAll();
        form.resetFields();
        form1.resetFields();
        form2.resetFields();
    }, [resetPatient, resetDoctorSelection, resetAll, form, form1, form2]);


    const uploadAbortRef = useRef(null);

    /** Yuklashni bekor qilish (T-054). Fon panelидagi yozuv o'chiriladi. */
    const cancelUpload = () => {
        uploadAbortRef.current?.abort();
    };

    const handleSubmit = useCallback(async () => {
        if (state.files.length === 0) return dangerAlert(t('select_file_error'));

        const formData = new FormData();
        state.files.forEach((f) => formData.append('file', f));
        selectedComplaints.forEach((f) => formData.append('complaint', f.nameUz));
        selectedComplaints.forEach((f) => formData.append('complaint_id', f.id));
        selectedDoctors.forEach((f) => formData.append('doctor_id', f.id));
        formData.append('gender', patcient.gender ? 'erkak' : 'ayol');
        formData.append('patcient_id', patcient.id);
        formData.append('created_doctor_id', user.doctor.id);
        formData.append('clinic_id', user.clinic.id);
        formData.append('lang', state.lang);
        formData.append('age', calculateAge(patcient.birthDate));
        if (state.analysis_date) {
            formData.append('analysis_date', state.analysis_date);
        }

        // Takroriy fayl aniqlansa server 409 qaytaradi va hech qanday
        // yozuv yaratmaydi. Foydalanuvchi tasdiqlasa, aynan shu forma
        // `force_duplicate` bayrog'i bilan qayta yuboriladi (T-096).
        if (checkAI) {
            // ─── AI rejimi: fon da ishlaydi, forma darhol tozalanadi ───
            const send = (data) => runInBackground({
                type: 'ecg',
                label: 'EKG AI tahlil',
                listPath: '/ecg-analyses',
                makeRequest: (handlers) => analyzeEkgFile(data, {
                    ...handlers,
                    signal: (uploadAbortRef.current = new AbortController()).signal,
                }),
                onDuplicate: async (err) => {
                    if (await askDuplicate(err, t)) send(withForce(data));
                },
            });
            send(formData);
            retryAnalyse();
        } else {
            // ─── Saqlash rejimi: tez, shu sahifada ───
            const save = async (data) => {
                warningAlert(t('please_wait_save'));
                dispatch({ type: 'SUBMIT_START' });
                try {
                    const res = await analyzeEkgFileSave(data, {
                        signal: (uploadAbortRef.current = new AbortController()).signal,
                    });
                    dispatch({
                        type: 'SUBMIT_SUCCESS',
                        image: res.ecg_image_url ?? res.ecg_png_base64,
                        imageShort: res.ecg_thumbnail_url ?? res.ecg_png_base64_short,
                    });
                    successAlert(t('analyse_saved'));
                    retryAnalyse();
                } catch (err) {
                    if (isDuplicateError(err)) {
                        dispatch({ type: 'SUBMIT_ERROR', error: '' });
                        if (await askDuplicate(err, t)) await save(withForce(data));
                        return;
                    }
                    const msg = extractApiError(err, t('something_went_wrong_try_again', { defaultValue: 'Xatolik yuz berdi' }));
                    dispatch({ type: 'SUBMIT_ERROR', error: msg });
                    dangerAlert(msg);
                }
            };
            await save(formData);
        }
    }, [state, patcient, user, selectedComplaints, selectedDoctors, runInBackground, dispatch, t, checkAI, retryAnalyse]);

    const resetData = useCallback(() => {
        resetPatient();
        resetDoctorSelection();
        setSelectedComplaints([]);
        setCheckAI(false);
        setAnalysisDateValue(getTodayDateInputValue());
        resetAll();
        form.resetFields();
        form2.resetFields();
    }, [resetPatient, resetDoctorSelection, resetAll, form, form2]);

    // Tugmani ko'rsatish sharti: fayl + sana + kamida 1 shifokor
    const canSubmit = state.files.length > 0 && !!analysisDateValue && selectedDoctors.length > 0;

    // ─── RENDER ───
    return (
        <div>
            {doctorsLoaded && doctorDatas.length === 0 && (
                <Alert
                    type="warning"
                    showIcon
                    message={t('no_doctors_alert_title')}
                    description={t('no_doctors_alert_desc')}
                    action={<Link to="/doctor" className="ant-btn ant-btn-default ant-btn-sm">{t('go_to_staff')}</Link>}
                    style={{ marginBottom: 16 }}
                />
            )}
            {/* ═══════ Bemor Qidirish ═══════ */}
            <div className="main_card">
                <h1>
                    {t('patcient_info')}{' '}
                    <Tooltip placement="bottomRight" title={t('alert_patcient')}>
                        <span className="alert_icon"><IoAlertCircleSharp /></span>
                    </Tooltip>
                </h1>
                <div className="main_card_content">
                    <PatientSearchSection
                        form={form1}
                        onFinish={searchPatcient}
                        onReset={resetData}
                        loading={loading}
                    />
                    <PatientInfoForm
                        form={form}
                        patcient={patcient}
                        onFinish={savePatcient}
                        loading={loadingSave}
                        phoneValue={phoneValue}
                        setPhoneValue={setPhoneValue}
                        gender={gender}
                        setGender={setGender}
                        regions={regions}
                        districts={districts}
                        fetchDistricts={fetchDistricts}
                    />
                </div>
            </div>

            {/* ═══════ EKG Fayl Yuklash ═══════ */}
            {checkReady && (
                <div className="main_card">
                    <h1>
                        {t('ecg_analyse')}{' '}
                        <Tooltip placement="bottomRight" title={t('alert_ecg')}>
                            <span className="alert_icon"><IoAlertCircleSharp /></span>
                        </Tooltip>
                    </h1>
                    <div className="main_card_content">
                        <Form form={form2} name="ecgUpload" labelCol={{ span: 24 }} wrapperCol={{ span: 24 }}>
                            <Row>
                                <Col className="main_col" lg={24} xs={24} sm={24} md={24}>
                                    <Form.Item name="select_ecg_file" data-tour="analyzer-file" label={t('select_ecg_file')} rules={[{ required: true, message: t('field_required') }]}>
                                        <Upload.Dragger
                                            accept={fileTypes.accept}
                                            beforeUpload={handleUploadFile}
                                            onRemove={() => dispatch({ type: 'SET_FILES', files: [], fileInput: '' })}
                                            maxCount={1}
                                            fileList={state.files.map((f, i) => ({
                                                uid: String(i), name: f.name, status: 'done', originFileObj: f,
                                            }))}
                                        >
                                            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                                            <p className="ant-upload-text" style={{ fontSize: 14 }}>
                                                {t('click_or_drag_file', { defaultValue: 'Fayl tanlang yoki bu yerga tashlang' })}
                                            </p>
                                            <p className="ant-upload-hint">{t('access_file_types')}: {fileTypes.label}</p>
                                        </Upload.Dragger>
                                    </Form.Item>
                                </Col>
                                <Col className="main_col" lg={12} xs={24} sm={24} md={24}>
                                    <div className="filter_item" style={{ paddingBottom: 8 }}>
                                        <label className="filter_label">{t('lang_analyse')}</label>
                                        <Select
                                            style={{ width: '100%' }}
                                            className="login_input"
                                            value={state.lang}
                                            onChange={(value) => dispatch({ type: 'SET_FIELD', field: 'lang', value })}
                                            options={[
                                                { value: 'uz', label: <>{t('uzbek')}</> },
                                                { value: 'ru', label: <>{t('russian')}</> },
                                                { value: 'en', label: <>{t('english')}</> },
                                            ]}
                                        />
                                    </div>
                                </Col>
                                <Col className="main_col" lg={12} xs={24} sm={24} md={24}>
                                    <div className="filter_item" style={{ paddingBottom: 8 }}>
                                        <label className="filter_label">{t('analysis_date')}</label>
                                        {/* Tug'ma `<input type="date">` brauzer tiliga
                                            bo'ysunardi (o'zbek interfeysda ruscha `дд.мм.гггг`)
                                            va har bir brauzerda boshqacha ko'rinardi. */}
                                        <DateField
                                            value={analysisDateValue}
                                            onChange={(value) => {
                                                setAnalysisDateValue(value || '');
                                                dispatch({
                                                    type: 'SET_FIELD',
                                                    field: 'analysis_date',
                                                    value: value ? new Date(`${value}T00:00:00`).toISOString() : null,
                                                });
                                            }}
                                        />
                                    </div>
                                </Col>

                                <DoctorSelectSection
                                    doctorDatas={doctorDatas}
                                    positionDatas={positionDatas}
                                    selectedDoctors={selectedDoctors}
                                    onChangeDoctors={onChangeDoctors}
                                    filterByPosition={filterByPosition}
                                />

                                <Col className="main_col" data-tour="analyzer-complaints" lg={24} xs={24} sm={24} md={24}>
                                    <p className="ecg_label">{t('patcient_complaint')}</p>
                                    <br />
                                    <Row>
                                        {complaints.map((item) => (
                                            <Col key={item.id} lg={12} xs={24} sm={24} md={24}>
                                                <div className="complaint_item">
                                                    <Checkbox
                                                        checked={selectedComplaints.findIndex((x) => x.id === item.id) !== -1}
                                                        onChange={() => onChangeComplaints(item)}
                                                    >
                                                        <span className="complaint_name">{item[`name${t('data_lang')}`]}</span>
                                                    </Checkbox>
                                                </div>
                                            </Col>
                                        ))}
                                    </Row>
                                </Col>

                                <Col className="main_col" lg={24} xs={24} sm={24} md={24}>
                                    <p className="ecg_label" style={{ marginBottom: 12 }}>
                                        {t('select_analyse_mode', { defaultValue: 'Tahlil usulini tanlang' })}
                                    </p>
                                    <div className="analyse_mode_group" role="radiogroup">
                                        <div
                                            className={`analyse_mode_card ${!checkAI ? 'active' : ''}`}
                                            role="radio"
                                            aria-checked={!checkAI}
                                            tabIndex={0}
                                            onClick={() => setCheckAI(false)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCheckAI(false); } }}
                                        >
                                            <span className="analyse_mode_icon"><SaveOutlined /></span>
                                            <span className="analyse_mode_text">
                                                <span className="analyse_mode_title">{t('save_only', { defaultValue: 'Faqat saqlash' })}</span>
                                                <span className="analyse_mode_desc">{t('save_only_desc', { defaultValue: 'Tahlil AI ishtirokisiz saqlanadi' })}</span>
                                            </span>
                                            <CheckCircleFilled className="analyse_mode_check" />
                                        </div>
                                        <div
                                            className={`analyse_mode_card ${checkAI ? 'active' : ''}`}
                                            role="radio"
                                            aria-checked={checkAI}
                                            tabIndex={0}
                                            onClick={() => setCheckAI(true)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCheckAI(true); } }}
                                        >
                                            <span className="analyse_mode_icon"><RobotOutlined /></span>
                                            <span className="analyse_mode_text">
                                                <span className="analyse_mode_title">{t('ai_analyse', { defaultValue: 'AI bilan tahlil' })}</span>
                                                <span className="analyse_mode_desc">{t('ai_analyse_desc', { defaultValue: 'Sun\'iy intellekt tahlil qiladi' })}</span>
                                            </span>
                                            <CheckCircleFilled className="analyse_mode_check" />
                                        </div>
                                    </div>
                                </Col>

                                {canSubmit && state.showBtn && (
                                    <>
                                        <Col lg={9} xs={24} sm={24} md={24} />
                                        <Col lg={6} xs={24} sm={24} md={24}>
                                            <Button
                                                onClick={handleSubmit}
                                                data-tour="analyzer-submit"
                                                loading={state.loading3}
                                                htmlType="button"
                                                className="btn_form"
                                            >
                                                {checkAI
                                                    ? (t('ai_analyse', { defaultValue: 'AI bilan tahlil' }))
                                                    : (t('save_only', { defaultValue: 'Faqat saqlash' }))
                                                }
                                            </Button>
                                        </Col>
                                        <Col lg={9} xs={24} sm={24} md={24} />
                                    </>
                                )}
                            </Row>
                        </Form>
                    </div>
                </div>
            )}

            {/* ═══════ Natijalar ═══════ */}
            {(state.result != null || state.loading3) && checkAI && (
                <div className="main_card">
                    <h1>{t('ecg_last_result')}</h1>
                    <div className="main_card_content">
                        {state.loading3 ? (
                            <div className="mini_loader"><MoonLoader size={50} color="#00B39A" /></div>
                        ) : (
                            <>
                                <EcgResult error={state.error} result={state.result} image={state.image} image_short={state.imageShort} clinic={user.clinic} />
                                <br />
                                <Row>
                                    <Col lg={9} xs={24} sm={24} md={24}></Col>
                                    <Col lg={6} xs={24} sm={24} md={24}>
                                        <Button onClick={retryAnalyse} loading={state.loading3} htmlType="button" className="btn_form">
                                            {t('retry_ecg_analyse')}
                                        </Button>
                                    </Col>
                                    <Col lg={9} xs={24} sm={24} md={24}></Col>
                                </Row>
                            </>
                        )}
                        <br />
                    </div>
                </div>
            )}

            {/* ═══════ Oldingi Tahlillar ═══════ */}
            {state.oldAnalyses.map((item) => (
                <EcgOldResult key={item.id} data={item} />
            ))}

            {state.page <= state.totalPage && (
                <Button
                    onClick={() => getOldECGAnalyses(patcient.id)}
                    loading={state.oldLoading}
                    htmlType="button"
                    className="btn_form mini_btn_main"
                >
                    {t('get_other_results')}
                </Button>
            )}
            <br /><br /><br />
        </div>
    );
}
