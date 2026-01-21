import { Button, Checkbox, Col, Form, Input, Row, Select, Table, Tooltip } from 'antd';
import Cleave from 'cleave.js/react';
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next';
import { FaAddressCard, FaFemale, FaMale } from 'react-icons/fa';
import { IoAlertCircleSharp, IoPerson } from 'react-icons/io5';
import InputMask from 'react-input-mask';
import { get_patcient_by_passport, save_patcient_data } from '../../../host/requests/PatcientRequest';
import { calculateAge, formatDate, formatPhoneNumber, formatPhoneNumberForForm } from '../../../tools/formatters';
import { get_ecg_analyses_by_patcient_id } from '../../../host/requests/ECGAnalyseRequest';
import { FaUserDoctor } from 'react-icons/fa6';
import { diagnoseFileSave } from '../../../host/EkgService';
import { successAlert, warningAlert } from '../../../tools/Alerts';
import { get_doctor_by_clinic_id, get_params_for_add_staff } from '../../../host/requests/DoctorRequest';
import { MdLanguage } from 'react-icons/md';
import { MoonLoader } from 'react-spinners';
import EcgResult from '../../../components/results/EcgResult';
import EcgOldResult from '../../../components/results/EcgOldResult';
import { useStore } from '../../../store/Store';
import { get_med_diagnoses_by_patcient_id } from '../../../host/requests/DiagnoseRequest';
import { LiaDownloadSolid } from 'react-icons/lia';
import { apiEcg } from '../../../host/Host';
export default function Diagnoses() {
  const [loading, setLoading] = useState(false);
  const [old_loading, setold_loading] = useState(false);
  const [ekg_saved, setekg_saved] = useState(false);
  const [loading1, setLoading1] = useState(false);
  const [loading3, setLoading3] = useState(false);
  const [page, setpage] = useState(1);
  const [total_page, settotal_page] = useState(0);
  const [check_ecg, setcheck_ecg] = useState(false);
    const [show_btn, setshow_btn] = useState(true);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [selected_doctor, setselected_doctor] = useState(null);
  const { t } = useTranslation();
  const [gender, setGender] = useState(true);
  const [lang, setlang] = useState('uz');
  const [old_anylyses, setold_anylyses] = useState([]);
  const [patcient, setPatcient] = useState(null);
  const [passport, setPassport] = useState(null);
  const [birthdate, setBirthdate] = useState(null);
  const [number, setnumber] = useState(0);
  const [form] = Form.useForm(); 
  const [form1] = Form.useForm(); 
    const [phoneValue, setPhoneValue] = useState('');
  const [form2] = Form.useForm(); 
    const [image, setimage] = useState(null)
    const [image_short, setimage_short] = useState(null)
    const [file_input, setfile_input] = useState("")
      const [files, setFiles] = useState([]);
      const {user, doctors, setdoctors}=useStore()

    const [position_ids, setposition_ids] = useState([]);
    const [position_datas, setposition_datas] = useState([]);
    const [doctor_datas, setdoctor_datas] = useState([]);
       useEffect(()=>{
      
       if(doctors.length==0 && user!=null){
        getDoctorsOfClinic()
       }else{
        setdoctor_datas(doctors)
       }
       }, [user])

      const handleChange = (e) => {
         setold_anylyses([])
         settotal_page(0)
         setpage(1)
         getOldECGAnaylses(patcient.id, 'first')
        setshow_btn(true)
    setfile_input(e.target.value)
    setFiles(Array.from(e.target.files));
    setnumber(number+1)
};


   
    const getDoctorsOfClinic=async()=>{
        try{
           var res1=await get_doctor_by_clinic_id({id:user.clinic.id})
           setdoctor_datas(res1.data.doctor)
           setdoctors(res1.data.doctor)
        }catch(err){

        }
    }
   
  const searchPatcient = async (val) => {
    try {
      setLoading(true);
      setPassport(val.passport);
      setBirthdate(val.birthdate);

      const res = await get_patcient_by_passport(val);
      console.log(res);

      setPatcient(res.data);
      form.setFieldsValue({
        firstname: res.data.firstName || '',
        lastname: res.data.lastName || '',
        surename: res.data.sureName || '',
        gender: res.data.gender,
        phone: formatPhoneNumberForForm(res.data.phone),
      });
      setPhoneValue(formatPhoneNumberForForm(res.data.phone));
      setcheck_ecg(true)
      getOldECGAnaylses(res.data.id)
    } catch (err) {
      setPatcient({});
    } finally {
      setLoading(false);
    }
  };

  const getOldECGAnaylses = async (id, type, targetPage = 1) => {
  try {
    setold_loading(true);
 
    const currentPage = type === "first" ? 1 : targetPage;
    
    var res = await get_med_diagnoses_by_patcient_id({
      id: id, 
      page: currentPage
    });

    if (type === "first") {
      setpage(1);
      setold_anylyses(res.data.items); 
    } else {
      setold_anylyses(res.data.items);
      setpage(currentPage);
    }
   settotal_page(res.data.totalPages);
  } catch (err) {
    console.error(err);
  } finally {
    setold_loading(false);
  }
};

  const savePatcient = async (val) => {
    try {
      setLoading1(true);
      const res = await save_patcient_data({
        ...val,
        passport,
        birthdate,
        phone: formatPhoneNumber(val.phone),
      });
      setPatcient(res.data);
      setcheck_ecg(true)
    } catch (err) {
      setPatcient({});
    } finally {
      setLoading1(false);
    }
  };


 const handleSubmit = async () => {
    console.log(files.length)
    if (files.length === 0) return alert(t("select_file_error"));
    
      warningAlert(t("please_wait_save"))
 
    
    setLoading3(true);
    setResult(null);
    setError(null);
    setimage(null)
    setimage_short(null)

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("file", f));
      formData.append('patcient_id', patcient.id)
      formData.append('created_doctor_id', user.doctor.id)
      formData.append('main_doctor_id', selected_doctor)
      var res
      
       res = await diagnoseFileSave(formData);
      
      setshow_btn(false)
      setimage(res.ecg_png_base64)
      setimage_short(res.ecg_png_base64_short)
      setekg_saved(true)
      
        successAlert(t("analyse_saved"))
        retryAnalyse()
    
    } catch (err) {
        console.log(err)
      setError(err.message);
    } finally {
      setLoading3(false);
    }
  };
const retryAnalyse=()=>{
    setPatcient(null);
    setekg_saved(false)
              setFiles([])
              setcheck_ecg(false)
              setshow_btn(false)
              setResult(null);
    setError(null);
    setimage(null)
    setpage(1)
    settotal_page(0)
    setold_anylyses([])
    setimage_short(null)
    setLoading(false)
    setLoading1(false)
    setLoading3(false)
     form.resetFields();
              form1.resetFields();
              form2.resetFields();
}
const resetData=()=>{
    setPatcient(null);
    setekg_saved(false)
              setFiles([])
              setcheck_ecg(false)
              setshow_btn(false)
              setResult(null);
    setError(null);
    setimage(null)
    setpage(1)
    settotal_page(0)
    setold_anylyses([])
    setimage_short(null)
    setLoading(false)
    setLoading1(false)
    setLoading3(false)
    
              form.resetFields();
              form2.resetFields();
}

const pageSize = 5;

const columns = [
  {
    title: '#',
    key: 'index',
    align: 'center',
    render: (_, __, index) => (page - 1) * pageSize + index + 1,
  },
  {
    title: t("owner_diagnosis"),
    dataIndex: 'createdDoctor',
    key: 'fio',
    render: (doctor) =>
      doctor ? `${doctor.lastName || ""} ${doctor.firstName || ""}` : "---",
  },
  {
    title: t("diagnoses_file"),
    dataIndex: 'diagnoseFileLink',
    key: 'file',
    render: (link) =>
      link ? (
        <a className='see_diagnoses' href={`${apiEcg}${link}`} target="_blank" rel="noreferrer">
          <LiaDownloadSolid />
        </a>
      ) : "",
  },
  {
    title: t("diagnoses_update"),
    dataIndex: 'updatedAt',
    key: 'updatedAt',
    render: (date) => (date ? formatDate(date) : "---"),
  },
];


  return (
    <div>
    <div className="main_card">
      <h1>{t('patcient_info')} <Tooltip placement="bottomRight" title={t("alert_patcient")}>
              <span className='alert_icon'><IoAlertCircleSharp /></span>
          </Tooltip></h1>
      <div className="main_card_content">
        {/* Search Form */}
        <Form
          form={form1}
          onValuesChange={() => {
           resetData()
          }}
          name="basic"
          labelCol={{ span: 24 }}
          wrapperCol={{ span: 24 }}
          initialValues={{ remember: true }}
          onFinish={searchPatcient}
        >
          <Row>
            <Col className="main_col" lg={8} md={12}>
              <Form.Item
                name="passport"
                label={t('passport_seria')}
                rules={[
                  { required: true, message: '' },
                  
                ]}
              >
                <InputMask
                  mask="** 9999999"
                  maskChar={null}
                  alwaysShowMask={true}
                  beforeMaskedValueChange={(newState, oldState, userInput) => {
                    let { value } = newState;
                    if (userInput === '') {
                      if (oldState.value && oldState.value.length > value.length) {
                        return oldState;
                      }
                    }
                    return { ...newState, value: value.toUpperCase() };
                  }}
                >
                  {(props) => (
                    <Input
                      {...props}
                      prefix={<FaAddressCard />}
                      className="login_input"
                      placeholder={t('enter_passport_seria')}
                    />
                  )}
                </InputMask>
              </Form.Item>
            </Col>

            <Col className="main_col" lg={8} md={12}>
              <Form.Item
                name="birthdate"
                label={t('birthdate')}
                rules={[{ required: true, message: '' }]}
              >
                <input className="input_date" type="date" />
              </Form.Item>
            </Col>


      
            <Col className="main_col" lg={6} md={12}>
              <div className="form_div">
                <Button className="btn_form" loading={loading} htmlType="submit">
                  {t('search_patcient')}
                </Button>
              </div>
            </Col>
          
          </Row>
        </Form>

        {/* Patient Form */}
        
          <div className={`hidden_box ${patcient?"showed_box":""}`}>
            <Form
              form={form}
              name="basic1"
              labelCol={{ span: 24 }}
              wrapperCol={{ span: 24 }}
              initialValues={{ remember: true }}
              onFinish={savePatcient}
            >
              <Row>
                <Col className="main_col" lg={8} md={24}>
                  <Form.Item
                    name="lastname"
                    label={t('lastname')}
                    normalize={(value) => value?.toUpperCase()}
                    rules={[{ required: true, message: '' }]}
                  >
                    <Input
                      prefix={<IoPerson />}
                      className="login_input"
                      placeholder={t('enter_lastname')}
                    />
                  </Form.Item>
                </Col>

                <Col className="main_col" lg={8} md={24}>
                  <Form.Item
                    name="firstname"
                    label={t('firstname')}
                    normalize={(value) => value?.toUpperCase()}
                    rules={[{ required: true, message: '' }]}
                  >
                    <Input
                      prefix={<IoPerson />}
                      className="login_input"
                      placeholder={t('enter_firstname')}
                    />
                  </Form.Item>
                </Col>

                <Col className="main_col" lg={8} md={24}>
                  <Form.Item
                    name="surename"
                    label={t('surename')}
                    normalize={(value) => value?.toUpperCase()}
                    rules={[{ required: true, message: '' }]}
                  >
                    <Input
                      prefix={<IoPerson />}
                      className="login_input"
                      placeholder={t('enter_surename')}
                    />
                  </Form.Item>
                </Col>

                <Col className="main_col" lg={8} md={24}>
                  <Form.Item
                    name="gender"
                    label={t('gender')}
                    rules={[{ required: true, message: '' }]}
                  >
                    <Select
                      style={{ width: '100%' }}
                      value={gender}
                      placeholder={t('enter_gender')}
                      prefix={gender?<FaMale />:<FaFemale />}
                      onChange={(value) => setGender(value)}
                      options={[
                        { value: true, label: <> {t('male')}</> },
                        { value: false, label: <>{t('female')}</> },
                      ]}
                    />
                  </Form.Item>
                </Col>

                <Col className="main_col" lg={8} md={24}>
                  <Form.Item
                    label={t('phone_number')}
                    name="phone"
                    wrapperCol={{ span: 24 }}
                    rules={[{ required: true, message: '' }, { len: 19, message: '' }]}
                  >
                    <Cleave
                     value={phoneValue}
  onChange={(e) => setPhoneValue(e.target.value)}
                      options={{
                        prefix: '+998',
                        delimiters: [' (', ') ', '-', '-'],
                        blocks: [4, 2, 3, 2, 2],
                        numericOnly: true,
                      }}
                      placeholder="+998 (__) ___-__-__"
                      className="ant-input claveInput"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>

                <Col className="main_col" lg={8} md={24}>
                  <div className="form_div">
                    <Button className="btn_form" loading={loading1} htmlType="submit">
                      {t('saveData')}
                    </Button>
                  </div>
                </Col>
              </Row>
            </Form>
          </div>
       
      </div>
    </div>
    {check_ecg?<div className="main_card">
      <h1>{t('patient_diagnostics')} <Tooltip placement="bottomRight" title={t("alert_ecg")}>
              <span className='alert_icon'><IoAlertCircleSharp /></span>
          </Tooltip></h1>
      <div className="main_card_content">
            <Form
            form={form2}
            onFinish={handleSubmit}
              name="basic2"
              labelCol={{ span: 24 }}
              wrapperCol={{ span: 24 }}
              initialValues={{ remember: true }}
              
            >
            <Row>
              <Col  className="main_col" lg={12} md={24}>

                   <Form.Item
name="select_ecg_file"
label={t('select_diagnosis_file')}
rules={[{ required: true, message: '' }]}
>
<div>
  <input
    className='file_input'
    type="file"
    
    onChange={handleChange}
    accept=".xml,.jpg,.png,.pdf,.doc,.docx"
  />
  <p className='file_input_bottom_text'>
    {t("access_file_types")}: xml, jpg, png, pdf, doc, docx
  </p>
</div>
</Form.Item>
              </Col>
             



                <Col className="main_col" lg={12} md={24}>
                                     <Form.Item
                                      name="main_doctor"
                                      label={t('owner_diagnosis')}
                                      rules={[
        {
          required: true,
          message: "",
        },
      ]}
                                    >
                 <Select
                 
                 value={selected_doctor}
                 onChange={(val)=>{setselected_doctor(val)}}
                                        style={{ width: '100%' }}
                                       
                                        prefix={<FaUserDoctor />}
                                        placeholder={t('owner_diagnosis')}
                                         options={doctors.map(role => ({
                    value: role.id,
                    label: role.lastName+" "+role.firstName,
                  }))}
                                        
                                      />
                
                                    </Form.Item>
                                    </Col>
                
                                     
             



              <Col lg={9} md={24}></Col>
              <Col lg={6} md={24}>
              {show_btn?<Button  loading={loading3} htmlType='submit'  className="btn_form">
        {t("save_diagnose")}
      </Button>:<></>}
      
              </Col>
              <Col lg={9} md={24}></Col>

            </Row>
            </Form>
      </div>
      </div>:<></>}
     {(result!=null || loading3)?<div className="main_card">
      <h1>{t('ecg_last_result')}</h1>
      <div className="main_card_content">
          {loading3?<div className='mini_loader'><MoonLoader size={50} color={"#4FD1C5"} /></div>:
          <>
          <EcgResult error={error} result={result} image={image} image_short={image_short} />
          <br/>
          <Row>
          <Col lg={9} md={24}></Col>
              <Col lg={6} md={24}>
              {<Button onClick={retryAnalyse} loading={loading3} htmlType='button'  className="btn_form">
        {t("retry_ecg_analyse")}
      </Button>}
              </Col>
              <Col lg={9} md={24}></Col>
          </Row></>
          }
          <br/>
          </div></div>:<></>}
          <div className=' diagnoses_table'>
{old_anylyses.length > 0 && (
<Table
  dataSource={old_anylyses}
  rowKey="id"
  columns={columns}
  loading={old_loading}
  pagination={{
    current: page,
    pageSize: 5,
    total: total_page * 5,
    onChange: (newPage) => {
      setpage(newPage);
      getOldECGAnaylses(patcient.id, "pagination", newPage);
    }
  }}
/>

)}
</div>
   
          <br/>
          <br/>
          <br/>
  </div>
  )
}
