import { Button, Checkbox, Col, Form, Radio, Row, Select, Tooltip, Upload } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import React, { useCallback, useEffect, useState } from 'react';
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
import { get_ecg_analyses_by_patcient_id } from '../../../host/requests/ECGAnalyseRequest';
import { useStore } from '../../../store/Store';
import { calculateAge } from '../../../tools/formatters';
import { dangerAlert, successAlert, warningAlert } from '../../../tools/Alerts';

// ─── Result Components ───
import EcgResult from '../../../components/results/EcgResult';
import EcgOldResult from '../../../components/results/EcgOldResult';

export default function EcgAnalyzer() {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [form1] = Form.useForm();
    const [form2] = Form.useForm();
    const [gender, setGender] = useState(true);
    const [selectedComplaints, setSelectedComplaints] = useState([]);
    const [checkAI, setCheckAI] = useState(false);
    const [analysisDateValue, setAnalysisDateValue] = useState(getTodayDateInputValue());

    const { complaints, user, setloader } = useStore();

    // ─── Custom Hooks ───
    const { regions, districts, fetchDistricts } = useRegionDistrict();
    const {
        doctorDatas, positionDatas, selectedDoctors,
        onChangeDoctors, filterByPosition, resetDoctorSelection,
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

    // Upload.Dragger uchun handler — auto-upload oldini oladi
    const handleUploadFile = useCallback((file) => {
        dispatch({ type: 'SET_FILES', files: [file], fileInput: '' });
        if (patcient?.id) getOldECGAnalyses(patcient.id, 'first');
        return false;
    }, [patcient, getOldECGAnalyses, dispatch]);

    const handleSubmit = useCallback(async () => {
        if (state.files.length === 0) return dangerAlert(t('select_file_error'));
        warningAlert(checkAI ? t('please_wait') : t('please_wait_save'));

        setloader(true);
        dispatch({ type: 'SUBMIT_START' });

        try {
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

            let res;
            if (checkAI) {
                res = await analyzeEkgFile(formData);
                let parsedResult;
                try {
                    parsedResult = res.ai_response.raw
                        ? typeof res.ai_response.raw === 'string'
                            ? JSON.parse(res.ai_response.raw)
                            : res.ai_response.raw
                        : typeof res.ai_response === 'string'
                            ? JSON.parse(res.ai_response)
                            : res.ai_response;
                } catch {
                    parsedResult = res.ai_response;
                }
                dispatch({
                    type: 'SUBMIT_SUCCESS',
                    result: parsedResult,
                    image: res.ecg_png_base64,
                    imageShort: res.ecg_png_base64_short,
                });
            } else {
                res = await analyzeEkgFileSave(formData);
                dispatch({
                    type: 'SUBMIT_SUCCESS',
                    image: res.ecg_png_base64,
                    imageShort: res.ecg_png_base64_short,
                });
                successAlert(t('analyse_saved'));
                retryAnalyse();
            }
        } catch (err) {
            dispatch({ type: 'SUBMIT_ERROR', error: err.message });
        } finally {
            setloader(false);
        }
    }, [state, patcient, user, selectedComplaints, selectedDoctors, setloader, dispatch, t, checkAI]);

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
                                    <Form.Item name="select_ecg_file" label={t('select_ecg_file')} rules={[{ required: true, message: '' }]}>
                                        <Upload.Dragger
                                            accept=".xml,.jpg,.png"
                                            beforeUpload={handleUploadFile}
                                            onRemove={() => dispatch({ type: 'SET_FILES', files: [], fileInput: '' })}
                                            maxCount={1}
                                            fileList={state.files.map((f, i) => ({
                                                uid: String(i), name: f.name, status: 'done', originFileObj: f,
                                            }))}
                                        >
                                            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                                            <p className="ant-upload-text" style={{ fontSize: 14 }}>
                                                {t('click_or_drag_file') || 'Fayl tanlang yoki bu yerga tashlang'}
                                            </p>
                                            <p className="ant-upload-hint">{t('access_file_types')}: xml, jpg, png</p>
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
                                        <input
                                            className="input_date login_input"
                                            type="date"
                                            value={analysisDateValue}
                                            onChange={(e) => {
                                                setAnalysisDateValue(e.target.value);
                                                dispatch({ type: 'SET_FIELD', field: 'analysis_date', value: e.target.value ? new Date(`${e.target.value}T00:00:00`).toISOString() : null });
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

                                <Col className="main_col" lg={24} xs={24} sm={24} md={24}>
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
                                        {t('select_analyse_mode') || 'Tahlil usulini tanlang'}
                                    </p>
                                    <Radio.Group
                                        value={checkAI ? 'ai' : 'save'}
                                        onChange={(e) => setCheckAI(e.target.value === 'ai')}
                                        buttonStyle="solid"
                                        size="large"
                                    >
                                        <Radio.Button value="save">
                                            💾 {t('save_only') || 'Faqat saqlash'}
                                        </Radio.Button>
                                        <Radio.Button value="ai">
                                            🤖 {t('ai_analyse') || 'AI bilan tahlil'}
                                        </Radio.Button>
                                    </Radio.Group>
                                </Col>

                                {canSubmit && state.showBtn && (
                                    <>
                                        <Col lg={9} xs={24} sm={24} md={24} />
                                        <Col lg={6} xs={24} sm={24} md={24}>
                                            <Button
                                                onClick={handleSubmit}
                                                loading={state.loading3}
                                                htmlType="button"
                                                className="btn_form"
                                            >
                                                {checkAI
                                                    ? (t('ai_analyse') || 'AI bilan tahlil')
                                                    : (t('save_only') || 'Faqat saqlash')
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
                            <div className="mini_loader"><MoonLoader size={50} color="#4FD1C5" /></div>
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
