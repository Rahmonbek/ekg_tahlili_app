import { Button, Checkbox, Col, Form, Row, Select, Tooltip } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IoAlertCircleSharp } from 'react-icons/io5';
import { MdLanguage } from 'react-icons/md';
import { MoonLoader } from 'react-spinners';

// ─── Hooks (shared) ───
import { usePatientSearch } from '../../../hooks/usePatientSearch';
import { useRegionDistrict } from '../../../hooks/useRegionDistrict';
import { useDoctorPositions } from '../../../hooks/useDoctorPositions';
import { useAnalyzerState } from '../../../hooks/useAnalyzerState';

// ─── Shared Components ───
import PatientSearchSection from '../../../components/shared/PatientSearchSection';
import PatientInfoForm from '../../../components/shared/PatientInfoForm';
import DoctorSelectSection from '../../../components/shared/DoctorSelectSection';

// ─── Services & Utils ───
import { analyzeLabFile } from '../../../host/LabService';
import { get_lab_analyses_by_patcient_id } from '../../../host/requests/LabAnalyseRequest';
import { get_lab_categories_data } from '../../../host/requests/LabCategories';
import { useStore } from '../../../store/Store';
import { calculateAge } from '../../../tools/formatters';
import { warningAlert } from '../../../tools/Alerts';

// ─── Result Components ───
import LabResult from '../../../components/results/lab_analyse/LabResult';
import LabOldResult from '../../../components/results/lab_analyse/LabOldResult';

export default function LabAnalyzer() {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [form1] = Form.useForm();
    const [form2] = Form.useForm();
    const [gender, setGender] = useState(true);
    const [selectedCategories, setSelectedCategories] = useState([]);

    const { lab_categories, setlab_categories, user, setloader } = useStore();

    // ─── Custom Hooks ───
    const { regions, districts, fetchDistricts } = useRegionDistrict();
    const {
        doctorDatas, positionDatas, selectedDoctors,
        onChangeDoctors, filterByPosition, resetDoctorSelection,
    } = useDoctorPositions();
    const { state, dispatch, resetAll } = useAnalyzerState();

    // ─── Lab Categories ───
    useEffect(() => {
        if (lab_categories.length === 0) {
            fetchLabCategories();
        }
    }, []);

    const fetchLabCategories = useCallback(async () => {
        try {
            const res = await get_lab_categories_data();
            setlab_categories(res.data);
        } catch {
            // Lab kategoriyalarni yuklashda xatolik
        }
    }, [setlab_categories]);

    // ─── Old Analyses ───
    const getOldAnalyses = useCallback(async (id, type) => {
        dispatch({ type: 'OLD_LOADING' });
        try {
            const res = await get_lab_analyses_by_patcient_id({
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

    // ─── Category Toggle ───
    const onChangeCategory = useCallback((val) => {
        setSelectedCategories((prev) => {
            const idx = prev.findIndex((x) => x.id === val.id);
            if (idx === -1) return [...prev, val];
            return prev.filter((x) => x.id !== val.id);
        });
    }, []);

    // ─── File Select ───
    const handleChange = useCallback((e) => {
        dispatch({
            type: 'SET_FILES',
            files: Array.from(e.target.files),
            fileInput: e.target.value,
        });
        if (patcient?.id) getOldAnalyses(patcient.id, 'first');
    }, [patcient, getOldAnalyses, dispatch]);

    // ─── Submit ───
    const handleSubmit = useCallback(async () => {
        if (state.files.length === 0) return alert(t('select_file_error'));
        warningAlert(t('please_wait_lab'));

        setloader(true);
        dispatch({ type: 'SUBMIT_START' });

        try {
            const formData = new FormData();
            state.files.forEach((f) => formData.append('file', f));
            selectedCategories.forEach((f) => formData.append('lab_category_id', f.id));
            selectedDoctors.forEach((f) => formData.append('doctor_id', f.id));
            formData.append('gender', patcient.gender ? 'erkak' : 'ayol');
            formData.append('patcient_id', patcient.id);
            formData.append('created_doctor_id', user.doctor.id);
            formData.append('clinic_id', user.clinic.id);
            formData.append('lang', state.lang);
            formData.append('age', calculateAge(patcient.birthDate));

            const res = await analyzeLabFile(formData);
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
                image: res.analyse_file_path,
            });
        } catch (err) {
            dispatch({ type: 'SUBMIT_ERROR', error: err.message });
        } finally {
            setloader(false);
        }
    }, [state, patcient, user, selectedCategories, selectedDoctors, setloader, dispatch, t]);

    // ─── Retry / Reset ───
    const retryAnalyse = useCallback(() => {
        resetPatient();
        resetDoctorSelection();
        setSelectedCategories([]);
        resetAll();
        form.resetFields();
        form1.resetFields();
        form2.resetFields();
    }, [resetPatient, resetDoctorSelection, resetAll, form, form1, form2]);

    const resetData = useCallback(() => {
        resetPatient();
        resetDoctorSelection();
        setSelectedCategories([]);
        resetAll();
        form.resetFields();
        form2.resetFields();
    }, [resetPatient, resetDoctorSelection, resetAll, form, form2]);

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

            {/* ═══════ Lab Fayl Yuklash ═══════ */}
            {checkReady && (
                <div className="main_card">
                    <h1>
                        {t('lab_analyse')}{' '}
                        <Tooltip placement="bottomRight" title={t('alert_ecg')}>
                            <span className="alert_icon"><IoAlertCircleSharp /></span>
                        </Tooltip>
                    </h1>
                    <div className="main_card_content">
                        <Form form={form2} name="labUpload" labelCol={{ span: 24 }} wrapperCol={{ span: 24 }}>
                            <Row>
                                <Col className="main_col" lg={12} md={24}>
                                    <Form.Item name="select_lab_file" label={t('select_lab_file')} rules={[{ required: true, message: '' }]}>
                                        <div>
                                            <input className="file_input" type="file" onChange={handleChange} accept=".pdf,.jpg,.png" />
                                            <p className="file_input_bottom_text">{t('access_file_types')}: pdf, jpg, png</p>
                                        </div>
                                    </Form.Item>
                                </Col>
                                <Col className="main_col" lg={12} md={24}>
                                    <Form.Item name="lang" label={t('lang_analyse')} rules={[{ required: true, message: '' }]}>
                                        <Select
                                            style={{ width: '100%' }}
                                            value={state.lang}
                                            prefix={<MdLanguage />}
                                            defaultValue={state.lang}
                                            onChange={(value) => dispatch({ type: 'SET_FIELD', field: 'lang', value })}
                                            options={[
                                                { value: 'uz', label: <> {t('uzbek')}</> },
                                                { value: 'ru', label: <>{t('russian')}</> },
                                                { value: 'en', label: <>{t('english')}</> },
                                            ]}
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

                                <Col className="main_col" lg={24} md={24}>
                                    <p className="ecg_label">{t('select_lab_category_type')}</p>
                                    <br />
                                    {lab_categories.map((item1) => (
                                        <React.Fragment key={item1.id}>
                                            <h2 className="title_complaint_item">{item1[`name${t('data_lang')}`]}</h2>
                                            <Row>
                                                {item1.categories.map((item) => (
                                                    <Col key={item.id} lg={12} md={24}>
                                                        <div className="complaint_item">
                                                            <Checkbox
                                                                checked={selectedCategories.findIndex((x) => x.id === item.id) !== -1}
                                                                onChange={() => onChangeCategory(item)}
                                                            >
                                                                <span className="complaint_name">{item[`name${t('data_lang')}`]}</span>
                                                            </Checkbox>
                                                        </div>
                                                    </Col>
                                                ))}
                                            </Row>
                                        </React.Fragment>
                                    ))}
                                </Col>

                                <Col lg={9} md={24}></Col>
                                <Col lg={6} md={24}>
                                    {state.showBtn && (
                                        <Button onClick={handleSubmit} loading={state.loading3} htmlType="button" className="btn_form">
                                            {t('check')}
                                        </Button>
                                    )}
                                </Col>
                                <Col lg={9} md={24}></Col>
                            </Row>
                        </Form>
                    </div>
                </div>
            )}

            {/* ═══════ Natijalar ═══════ */}
            {(state.result != null || state.loading3) && (
                <div className="main_card">
                    <h1>{t('lab_last_result')}</h1>
                    <div className="main_card_content">
                        {state.loading3 ? (
                            <div className="mini_loader"><MoonLoader size={50} color="#4FD1C5" /></div>
                        ) : (
                            <>
                                <LabResult error={state.error} result={state.result} image={state.image} />
                                <br />
                                <Row>
                                    <Col lg={9} md={24}></Col>
                                    <Col lg={6} md={24}>
                                        <Button onClick={retryAnalyse} loading={state.loading3} htmlType="button" className="btn_form">
                                            {t('retry_lab_analyse')}
                                        </Button>
                                    </Col>
                                    <Col lg={9} md={24}></Col>
                                </Row>
                            </>
                        )}
                        <br />
                    </div>
                </div>
            )}

            {/* ═══════ Oldingi Tahlillar ═══════ */}
            {state.oldAnalyses.map((item) => (
                <LabOldResult key={item.id} data={item} />
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
