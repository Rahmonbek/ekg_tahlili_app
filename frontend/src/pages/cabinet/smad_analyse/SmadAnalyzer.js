import { Alert, Button, Col, Form, Row, Select, Tooltip, Upload } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IoAlertCircleSharp } from 'react-icons/io5';
import { FaUserDoctor } from 'react-icons/fa6';
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
import { analyzeSmadFile } from '../../../host/smadService';
import { useBackgroundAnalysis } from '../../../hooks/useBackgroundAnalysis';
import { get_smad_analyses_by_patcient_id } from '../../../host/requests/SmadAnalyseRequest';
import { useStore } from '../../../store/Store';
import { calculateAge } from '../../../tools/formatters';
import { warningAlert } from '../../../tools/Alerts';

// ─── Result Components ───
import SmadResult from '../../../components/results/smad_analyse/SmadResult';
import SmadOldResult from '../../../components/results/smad_analyse/SmadOldResult';

export default function SmadAnalyzer() {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [form1] = Form.useForm();
    const [form2] = Form.useForm();
    const [gender, setGender] = useState(true);
    const [selectedMainDoctor, setSelectedMainDoctor] = useState(null);
    const [analysisDateValue, setAnalysisDateValue] = useState(getTodayDateInputValue());

    const { user, doctors } = useStore();
    const { runInBackground } = useBackgroundAnalysis();

    // ─── Custom Hooks ───
    const { regions, districts, fetchDistricts } = useRegionDistrict();
    const {
        doctorDatas, positionDatas, selectedDoctors,
        onChangeDoctors, filterByPosition, resetDoctorSelection, doctorsLoaded,
    } = useDoctorPositions();
    const { state, dispatch, resetAll } = useAnalyzerState();

    useEffect(() => {
        form2?.setFieldsValue?.({ lang: state.lang, analysis_date: analysisDateValue });
        if (!state.analysis_date && analysisDateValue) {
            dispatch({
                type: 'SET_FIELD',
                field: 'analysis_date',
                value: new Date(`${analysisDateValue}T00:00:00`).toISOString(),
            });
        }
    }, [analysisDateValue, dispatch, form2, state.analysis_date, state.lang]);

    // ─── Old Analyses ───
    const getOldAnalyses = useCallback(async (id, type) => {
        dispatch({ type: 'OLD_LOADING' });
        try {
            const res = await get_smad_analyses_by_patcient_id({
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
        onPatientFound: (data) => getOldAnalyses(data.id, 'first'),
    });

    // ─── File Select ───
    const handleUploadFile = useCallback((file) => {
        dispatch({ type: 'SET_FILES', files: [file], fileInput: '' });
        if (patcient?.id) getOldAnalyses(patcient.id, 'first');
        return false;
    }, [patcient, getOldAnalyses, dispatch]);

    // ─── Submit ───
    const handleSubmit = useCallback(() => {
        if (state.files.length === 0) return alert(t('select_file_error'));

        const formData = new FormData();
        state.files.forEach((f) => formData.append('file', f));
        formData.append('gender', patcient.gender ? 'erkak' : 'ayol');
        formData.append('patcient_id', patcient.id);
        formData.append('created_doctor_id', user.doctor.id);
        selectedDoctors.forEach((f) => formData.append('doctor_id', f.id));
        formData.append('main_doctor_id', selectedMainDoctor);
        formData.append('clinic_id', user.clinic.id);
        formData.append('lang', state.lang);
        formData.append('age', calculateAge(patcient.birthDate));
        if (state.analysis_date) {
            formData.append('analysis_date', state.analysis_date);
        }

        runInBackground({
            label: 'SMAD tahlil',
            listPath: '/smad-analyses',
            analyzePromise: analyzeSmadFile(formData),
        });
        retryAnalyse();
    }, [state, patcient, user, selectedDoctors, selectedMainDoctor, runInBackground, t, retryAnalyse]);

    // ─── Retry / Reset ───
    const retryAnalyse = useCallback(() => {
        resetPatient();
        resetDoctorSelection();
        setSelectedMainDoctor(null);
        setAnalysisDateValue(getTodayDateInputValue());
        resetAll();
        form.resetFields();
        form1.resetFields();
        form2.resetFields();
    }, [resetPatient, resetDoctorSelection, resetAll, form, form1, form2]);

    const resetData = useCallback(() => {
        resetPatient();
        resetDoctorSelection();
        setSelectedMainDoctor(null);
        setAnalysisDateValue(getTodayDateInputValue());
        resetAll();
        form.resetFields();
        form2.resetFields();
    }, [resetPatient, resetDoctorSelection, resetAll, form, form2]);

    const canSubmit =
        state.files.length > 0 &&
        !!analysisDateValue &&
        selectedDoctors.length > 0 &&
        !!selectedMainDoctor;

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
                    <PatientSearchSection form={form1} onFinish={searchPatcient} onReset={resetData} loading={loading} />
                    <PatientInfoForm
                        form={form} patcient={patcient} onFinish={savePatcient} loading={loadingSave}
                        phoneValue={phoneValue} setPhoneValue={setPhoneValue}
                        gender={gender} setGender={setGender}
                        regions={regions} districts={districts} fetchDistricts={fetchDistricts}
                    />
                </div>
            </div>

            {/* ═══════ SMAD Fayl Yuklash ═══════ */}
            {checkReady && (
                <div className="main_card">
                    <h1>
                        {t('smad_analyse')}{' '}
                        <Tooltip placement="bottomRight" title={t('alert_smad')}>
                            <span className="alert_icon"><IoAlertCircleSharp /></span>
                        </Tooltip>
                    </h1>
                    <div className="main_card_content">
                        <Form form={form2} name="smadUpload" labelCol={{ span: 24 }} wrapperCol={{ span: 24 }}>
                            <Row>
                                <Col className="main_col" lg={24} xs={24} sm={24} md={24}>
                                    <Form.Item name="select_lab_file" label={t('select_smad_file')} rules={[{ required: true, message: '' }]}>
                                        <Upload.Dragger
                                            accept=".pdf"
                                            beforeUpload={handleUploadFile}
                                            maxCount={1}
                                            fileList={state.files}
                                            onRemove={() => dispatch({ type: 'SET_FILES', files: [], fileInput: '' })}
                                        >
                                            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                                            <p className="ant-upload-text">{t('select_smad_file')}</p>
                                            <p className="ant-upload-hint">{t('access_file_types')}: pdf</p>
                                        </Upload.Dragger>
                                    </Form.Item>
                                </Col>
                                <Col className="main_col" lg={8} xs={24} sm={24} md={24}>
                                    <Form.Item name="lang" label={t('lang_analyse')} rules={[{ required: true, message: '' }]}>
                                        <Select
                                            style={{ width: '100%' }}
                                            className="login_input"
                                            value={state.lang}
                                            onChange={(value) => dispatch({ type: 'SET_FIELD', field: 'lang', value })}
                                            options={[
                                                { value: 'uz', label: <> {t('uzbek')}</> },
                                                { value: 'ru', label: <>{t('russian')}</> },
                                                { value: 'en', label: <>{t('english')}</> },
                                            ]}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col className="main_col" lg={8} xs={24} sm={24} md={24}>
                                    <Form.Item
                                        name="analysis_date"
                                        label={t('analysis_date')}
                                        rules={[{ required: true, message: t('enter_analysis_date') || '' }]}
                                    >
                                        <input
                                            className="input_date"
                                            type="date"
                                            value={analysisDateValue}
                                            onChange={(e) => {
                                                setAnalysisDateValue(e.target.value);
                                                dispatch({ type: 'SET_FIELD', field: 'analysis_date', value: e.target.value ? new Date(`${e.target.value}T00:00:00`).toISOString() : null });
                                            }}
                                        />
                                    </Form.Item>
                                </Col>

                                {/* SMAD uchun asosiy shifokor */}
                                <Col className="main_col" lg={8} xs={24} sm={24} md={24}>
                                    <Form.Item name="main_doctor" label={t('smad_doctor')} rules={[{ required: true, message: '' }]}>
                                        <Select
                                            style={{ width: '100%' }} value={selectedMainDoctor}
                                            prefix={<FaUserDoctor />} defaultValue={selectedMainDoctor}
                                            onChange={(value) => setSelectedMainDoctor(value)}
                                            options={doctors.map((item) => ({ value: item.id, label: `${item.lastName} ${item.firstName}` }))}
                                        />
                                    </Form.Item>
                                </Col>

                                <DoctorSelectSection
                                    doctorDatas={doctorDatas} positionDatas={positionDatas}
                                    selectedDoctors={selectedDoctors} onChangeDoctors={onChangeDoctors}
                                    filterByPosition={filterByPosition}
                                />

                                <Col lg={9} xs={24} sm={24} md={24}></Col>
                                <Col lg={6} xs={24} sm={24} md={24}>
                                    {canSubmit && state.showBtn && (
                                        <Button onClick={handleSubmit} loading={state.loading3} htmlType="button" className="btn_form">
                                            {t('check')}
                                        </Button>
                                    )}
                                </Col>
                                <Col lg={9} xs={24} sm={24} md={24}></Col>
                            </Row>
                        </Form>
                    </div>
                </div>
            )}

            {/* ═══════ Natijalar ═══════ */}
            {(state.result != null || state.loading3) && (
                <div className="main_card">
                    <h1>{t('smad_last_result')}</h1>
                    <div className="main_card_content">
                        {state.loading3 ? (
                            <div className="mini_loader"><MoonLoader size={50} color="#4FD1C5" /></div>
                        ) : (
                            <>
                                <SmadResult error={state.error} result={state.result} image={state.image} clinic={user.clinic} />
                                <br />
                                <Row>
                                    <Col lg={9} xs={24} sm={24} md={24}></Col>
                                    <Col lg={6} xs={24} sm={24} md={24}>
                                        <Button onClick={retryAnalyse} loading={state.loading3} htmlType="button" className="btn_form">
                                            {t('retry_smad_analyse')}
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
                <SmadOldResult key={item.id} data={item} />
            ))}
            {state.page <= state.totalPage && (
                <Button onClick={() => getOldAnalyses(patcient.id)} loading={state.oldLoading} htmlType="button" className="btn_form mini_btn_main">
                    {t('get_other_results')}
                </Button>
            )}
            <br /><br /><br />
        </div>
    );
}
