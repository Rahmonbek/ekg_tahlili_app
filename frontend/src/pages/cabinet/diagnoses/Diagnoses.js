import { Button, Col, Form, Input, Row, Select, Tooltip } from 'antd';
import Cleave from 'cleave.js/react';
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next';
import { FaAddressCard, FaFemale, FaMale } from 'react-icons/fa';
import { IoAlertCircleSharp, IoPerson } from 'react-icons/io5';
import InputMask from 'react-input-mask';
import { get_patcient_by_passport, save_patcient_data } from '../../../host/requests/PatcientRequest';
import { formatPhoneNumber, formatPhoneNumberForForm } from '../../../tools/formatters';
import { get_ecg_analyses_by_patcient_id } from '../../../host/requests/ECGAnalyseRequest';
import { FaUserDoctor } from 'react-icons/fa6';
export default function Diagnoses() {
  const [loading, setLoading] = useState(false);
  const [old_loading, setold_loading] = useState(false);
  const [ekg_saved, setekg_saved] = useState(false);
  const [check_ai, setcheck_ai] = useState(false);
  const [loading1, setLoading1] = useState(false);
  const [loading3, setLoading3] = useState(false);
  const [page, setpage] = useState(1);
  const [total_page, settotal_page] = useState(0);
  const [check_ecg, setcheck_ecg] = useState(false);
    const [show_btn, setshow_btn] = useState(true);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
  const { t } = useTranslation();
  const [gender, setGender] = useState(true);
  const [lang, setlang] = useState('uz');
  const [select_complaint, setselect_complaint] = useState([]);
  const [old_anylyses, setold_anylyses] = useState([]);
  const [select_doctor, setselect_doctor] = useState([]);
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

 const getOldECGAnaylses=async(id, type)=>{
    try{
      setold_loading(true)
         var res=await get_ecg_analyses_by_patcient_id({id:id, page:type=="first"?1:page})
         if(type=="first"){
          setpage(2)
setold_anylyses([...res.data.items])
         }else{
          setpage(page+1)
setold_anylyses([...old_anylyses, ...res.data.items])
         }
         
         settotal_page(res.data.totalPages)
    }catch(err){

    }finally{
setold_loading(false)
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

              } catch (err) {
                setPatcient({});
              } finally {
                setLoading(false);
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
      getOldECGAnaylses(res.data.id)
    } catch (err) {
      setPatcient({});
    } finally {
      setLoading1(false);
    }
  };

const handleSubmit = async () => {
    console.log(files.length)
    if (files.length === 0) return alert(t("select_file_error"));
    if(check_ai){
      warningAlert(t("please_wait"))
    }else{
      warningAlert(t("please_wait_save"))
    }
    
    setLoading3(true);
    setResult(null);
    setError(null);
    setimage(null)
    setimage_short(null)

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("file", f));
      select_complaint.forEach((f) => formData.append("complaint", f.nameUz));
      select_complaint.forEach((f) => formData.append("complaint_id", f.id));
      select_doctor.forEach((f) => formData.append("doctor_id", f.id));
      formData.append('gender', patcient.gender?"erkak":'ayol')
      formData.append('patcient_id', patcient.id)
      formData.append('created_doctor_id', user.doctor.id)
      formData.append('lang', lang)
      formData.append('age', calculateAge(patcient.birthDate))
      var res
      if(check_ai){
          res = await analyzeEkgFile(formData);
      console.log(res)
      let parsedResult;
     try {
  // agar string bo'lsa JSON.parse qilamiz
  parsedResult =res.ai_response.raw?  typeof res.ai_response.raw === "string" 
    ? JSON.parse(res.ai_response.raw) 
    : res.ai_response.raw: typeof res.ai_response === "string" 
    ? JSON.parse(res.ai_response) 
    : res.ai_response;
} catch (e) {
       console.log(e)
  // parse bo‘lmasa, shunchaki original qiymatni o‘rnatamiz
  parsedResult = res.ai_response;
}

setResult(parsedResult);
      
      }else{
       res = await analyzeEkgFileSave(formData);
      }
      setshow_btn(false)
      setimage(res.ecg_png_base64)
      setimage_short(res.ecg_png_base64_short)
      setekg_saved(true)
      if(!check_ai){
        successAlert(t("analyse_saved"))
        retryAnalyse()
      }
    } catch (err) {
        console.log(err)
      setError(err.message);
    } finally {
      setLoading3(false);
    }
  };


const resetData=()=>{
    setPatcient(null);
    setekg_saved(false)
    setselect_doctor([])
    setselect_complaint([])
    setFiles([])
    setcheck_ecg(false)
    setshow_btn(false)
    setResult(null);
    setError(null);
    setimage(null)
    setpage(1)
    setcheck_ai(false)
    settotal_page(0)
    setold_anylyses([])
    setimage_short(null)
    setLoading(false)
    setLoading1(false)
    setLoading3(false)
   form.resetFields();
   form2.resetFields();
}



  return (

    <div> 
        <div className="main_card">
              <h1>{t('patient_diagnostics')} <Tooltip placement="bottomRight" title={t("alert_patcient")}>
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
            
   {check_ecg ? (
  <div className="main_card">
    <h1>
      {t('download_diagnosis')}{' '}
      <Tooltip placement="bottomRight" title={t("alert_ecg")}>
        <span className='alert_icon'><IoAlertCircleSharp /></span>
      </Tooltip>
    </h1>

    <div className="main_card_content">
      <Form
        form={form2}
        name="basic2"
        labelCol={{ span: 24 }}
        wrapperCol={{ span: 24 }}
        initialValues={{ remember: true }}
      >
        <Row>
          <Col className="main_col" lg={12} md={24}>
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
                  accept=".xml,.jpg,.png"
                />
                <p className='file_input_bottom_text'>
                  {t("access_file_types")}: xml, jpg, png
                </p>
              </div>
            </Form.Item>
          </Col>


    <Col className="main_col" lg={12} md={24}>
                     <Form.Item
                      name="main_doctor"
                      label={t('owner_diagnosis')}
                      rules={[{ required: true, message: '' }]}
                    >
 <Select
style={{ width: '100%' }}
                       prefix={<FaUserDoctor />}
                        placeholder={t('select_diagnose_doctor')}
    />

                    </Form.Item>
                    </Col>
<Col lg={9} md={24}></Col>
                <Col lg={6} md={24}>
                {show_btn?<Button onClick={handleSubmit} loading={loading3} htmlType='button'  className="btn_form">
          {t("check")}
        </Button>:<></>}
        
                </Col>
                <Col lg={9} md={24}></Col>
        </Row>
      </Form>
    </div>
  </div>
) : null}

            
 </div>
  )
}
