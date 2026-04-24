import { Alert, Button, Col, Form, Row, Select, Tooltip, DatePicker } from 'antd';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { IoAlertCircleSharp } from 'react-icons/io5';
import { MdLanguage } from 'react-icons/md';
import { MoonLoader } from 'react-spinners';

import { usePatientSearch } from '../../../hooks/usePatientSearch';
import { useRegionDistrict } from '../../../hooks/useRegionDistrict';
import { useDoctorPositions } from '../../../hooks/useDoctorPositions';
import { getTodayDateInputValue, useAnalyzerState } from '../../../hooks/useAnalyzerState';

import PatientSearchSection from '../../../components/shared/PatientSearchSection';
import PatientInfoForm from '../../../components/shared/PatientInfoForm';
import DoctorSelectSection from '../../../components/shared/DoctorSelectSection';

import { analyzeParasitologyFile, getParasitologyByPatientId } from '../../../host/parasitologyService';
import { useStore } from '../../../store/Store';
import { warningAlert } from '../../../tools/Alerts';

import ParasitologyResult from './ParasitologyResult';
import ParasitologyOldResult from './ParasitologyOldResult';

export default function ParasitologyAnalyzer() {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [form1] = Form.useForm();
    const [form2] = Form.useForm();
    const [gender, setGender] = React.useState(true);
    const [analysisDateValue, setAnalysisDateValue] = React.useState(getTodayDateInputValue());

    const { user, setloader } = useStore();

    const { regions, districts, fetchDistricts } = useRegionDistrict();
    const {
        doctorDatas, positionDatas, selectedDoctors,
        onChangeDoctors, filterByPosition, resetDoctorSelection,
    } = useDoctorPositions();
    const { state, dispatch, resetAll } = useAnalyzerState();

    React.useEffect(() => {
        form2?.setFieldsValue?.({ lang: state.lang, analysis_date: analysisDateValue });
        if (!state.analysis_date && analysisDateValue) {
            dispatch({
                type: 'SET_FIELD',
                field: 'analysis_date',
                value: new Date(`${analysisDateValue}T00:00:00`).toISOString(),
            });
        }
    }, [analysisDateValue, dispatch, form2, state.analysis_date, state.lang]);

    const getOldAnalyses = useCallback(async (id, type) => {
        dispatch({ type: 'OLD_LOADING' });
        try {
            const res = await getParasitologyByPatientId({ id, page: type === 'first' ? 1 : state.page });
            dispatch({
                type: 'SET_OLD_ANALYSES',
                items: res.items,
                replace: type === 'first',
                nextPage: type === 'first' ? 2 : state.page + 1,
                totalPages: res.totalPages,
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

    const handleChange = useCallback((e) => {
        dispatch({
            type: 'SET_FILES',
            files: Array.from(e.target.files),
            fileInput: e.target.value,
        });
        if (patcient?.id) getOldAnalyses(patcient.id, 'first');
    }, [patcient, getOldAnalyses, dispatch]);

    const handleSubmit = useCallback(async () => {
        if (state.files.length === 0) return alert(t('select_file_error'));

        let values;
        try {
            values = await form2.validateFields();
        } catch {
            return;
        }

        warningAlert(t('please_wait'));
        setloader(true);
        dispatch({ type: 'SUBMIT_START' });

        try {
            const formData = new FormData();
            formData.append('file', state.files[0]);
            selectedDoctors.forEach((d) => formData.append('DoctorIds', d.id));
            formData.append('PatcientId', patcient.id);
            formData.append('CreatedDoctorId', user.doctor.id);
            formData.append('ClinicId', user.clinic.id);
            formData.append('Magnification', values.magnification);
            formData.append('Lang', state.lang);
            if (state.analysis_date) {
                formData.append('AnalysisDate', state.analysis_date);
            }

            const res = await analyzeParasitologyFile(formData);

            let parsedResult = null;
            if (res.aiResponse) {
                try {
                    parsedResult = typeof res.aiResponse === 'string'
                        ? JSON.parse(res.aiResponse)
                        : res.aiResponse;
                } catch {
                    parsedResult = res.aiResponse;
                }
            }

            dispatch({
                type: 'SUBMIT_SUCCESS',
                result: parsedResult,
                image: res.filePath,
            });
        } catch (err) {
            dispatch({ type: 'SUBMIT_ERROR', error: err.message });
        } finally {
            setloader(false);
        }
    }, [state, patcient, user, selectedDoctors, setloader, dispatch, form2, t]);

    const retryAnalyse = useCallback(() => {
        resetPatient();
        resetDoctorSelection();
        setAnalysisDateValue(getTodayDateInputValue());
        resetAll();
        form.resetFields();
        form1.resetFields();
        form2.resetFields();
    }, [resetPatient, resetDoctorSelection, resetAll, form, form1, form2]);

    const resetData = useCallback(() => {
        resetPatient();
        resetDoctorSelection();
        setAnalysisDateValue(getTodayDateInputValue());
        resetAll();
        form.resetFields();
        form2.resetFields();
    }, [resetPatient, resetDoctorSelection, resetAll, form, form2]);

    return (
        <div>
            {/* Bemor qidirish */}
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

            {/* Rasm yuklash */}
            {checkReady && (
                <div className="main_card">
                    <h1>
                        {t('parasitology_analyse')}{' '}
                        <Tooltip placement="bottomRight" title={t('alert_parasitology')}>
                            <span className="alert_icon"><IoAlertCircleSharp /></span>
                        </Tooltip>
                    </h1>
                    <div className="main_card_content">
                        <Form form={form2} name="parasitologyUpload" labelCol={{ span: 24 }} wrapperCol={{ span: 24 }}>
                            <Row>
                                <Col className="main_col" lg={24} xs={24} sm={24} md={24}>
                                    <Form.Item name="select_file" label={t('select_lab_file')} rules={[{ required: true, message: '' }]}>
                                        <div>
                                            <input
                                                className="file_input"
                                                type="file"
                                                onChange={handleChange}
                                                accept=".jpg,.jpeg,.png"
                                            />
                                            <p className="file_input_bottom_text">{t('access_file_types')}: jpg, jpeg, png</p>
                                        </div>
                                    </Form.Item>
                                </Col>

                                <Col className="main_col" lg={8} xs={24} sm={24} md={24}>
                                    <Form.Item name="lang" label={t('lang_analyse')} rules={[{ required: true, message: '' }]}>
                                        <Select
                                            style={{ width: '100%' }}
                                            value={state.lang}
                                            prefix={<MdLanguage />}
                                            defaultValue={state.lang}
                                            onChange={(value) => dispatch({ type: 'SET_FIELD', field: 'lang', value })}
                                            options={[
                                                { value: 'uz', label: t('uzbek') },
                                                { value: 'ru', label: t('russian') },
                                                { value: 'en', label: t('english') },
                                            ]}
                                        />
                                    </Form.Item>
                                </Col>

                                <Col className="main_col" lg={8} xs={24} sm={24} md={24}>
                                    <Form.Item
                                        name="magnification"
                                        label={t('magnification')}
                                        rules={[{ required: true, message: '' }]}
                                    >
                                        <Select
                                            style={{ width: '100%' }}
                                            options={[
                                                { value: '4x', label: '4x' },
                                                { value: '10x', label: '10x' },
                                                { value: '40x', label: '40x' },
                                                { value: '100x', label: '100x' },
                                                { value: '400x', label: '400x' },
                                                { value: '1000x', label: '1000x' },
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

                                <DoctorSelectSection
                                    doctorDatas={doctorDatas}
                                    positionDatas={positionDatas}
                                    selectedDoctors={selectedDoctors}
                                    onChangeDoctors={onChangeDoctors}
                                    filterByPosition={filterByPosition}
                                />

                                <Col lg={9} xs={24} sm={24} md={24} />
                                <Col lg={6} xs={24} sm={24} md={24}>
                                    {state.showBtn && (
                                        <Button
                                            onClick={handleSubmit}
                                            loading={state.loading3}
                                            htmlType="button"
                                            className="btn_form"
                                        >
                                            {t('check')}
                                        </Button>
                                    )}
                                </Col>
                                <Col lg={9} xs={24} sm={24} md={24} />
                            </Row>
                        </Form>
                    </div>
                </div>
            )}

            {/* AI natijasi */}
            {(state.result != null || state.loading3 || state.error) && (
                <div className="main_card">
                    <h1>{t('ai_result')}</h1>
                    <div className="main_card_content">
                        {state.loading3 ? (
                            <div className="mini_loader"><MoonLoader size={50} color="#4FD1C5" /></div>
                        ) : state.error ? (
                            <Alert
                                message={t('api_error')}
                                description={state.error}
                                type="error"
                                showIcon
                                style={{ marginBottom: 16 }}
                            />
                        ) : (
                            <>
                                <ParasitologyResult result={state.result} image={state.image} />
                                <br />
                                <Row>
                                    <Col lg={9} xs={24} sm={24} md={24} />
                                    <Col lg={6} xs={24} sm={24} md={24}>
                                        <Button
                                            onClick={retryAnalyse}
                                            htmlType="button"
                                            className="btn_form"
                                        >
                                            {t('retry_parasitology_analyse')}
                                        </Button>
                                    </Col>
                                    <Col lg={9} xs={24} sm={24} md={24} />
                                </Row>
                            </>
                        )}
                        <br />
                    </div>
                </div>
            )}

            {/* Oldingi tahlillar */}
            {state.oldAnalyses.map((item) => (
                <ParasitologyOldResult key={item.id} data={item} />
            ))}

            {state.page <= state.totalPage && (
                <Button
                    onClick={() => getOldAnalyses(patcient.id)}
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
