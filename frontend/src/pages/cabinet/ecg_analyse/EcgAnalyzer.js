import { Button, Checkbox, Col, Form, Input, Row, Select, Tooltip } from 'antd';
import Cleave from 'cleave.js/react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaFemale, FaMale } from 'react-icons/fa';
import { FaAddressCard, FaUserDoctor } from 'react-icons/fa6';
import { IoAlertCircleSharp, IoPerson } from 'react-icons/io5';
import InputMask from 'react-input-mask';
import { get_patcient_by_passport, save_patcient_data } from '../../../host/requests/PatcientRequest';
import { calculateAge, formatPhoneNumber, formatPhoneNumberForForm } from '../../../tools/formatters';
import { useStore } from '../../../store/Store';
import { select } from 'react-cookies';
import { analyzeEkgFile, analyzeEkgFileSave } from '../../../host/EkgService';
import EcgResult from '../../../components/results/EcgResult';
import { MoonLoader } from 'react-spinners';
import { successAlert, warningAlert } from '../../../tools/Alerts';
import { MdLanguage } from 'react-icons/md';
import { get_doctor_by_clinic_id, get_params_for_add_staff } from '../../../host/requests/DoctorRequest';
import { get_ecg_analyses_by_patcient_id } from '../../../host/requests/ECGAnalyseRequest';
import EcgOldResult from '../../../components/results/EcgOldResult';
import { get_districts_data, get_region_data } from '../../../host/requests/RegionRequest';
import i18n from '../../../locale/i18next';
import { AiFillHome, AiOutlineHome } from "react-icons/ai";
export default function EcgAnalyzer() {
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
      const {complaints, roles, positions, setroles, setpositions,user, doctors, setdoctors, setloader}=useStore()
const [role_id, setrole_id] = useState(null);
    const [position_ids, setposition_ids] = useState([]);
    const [position_datas, setposition_datas] = useState([]);
    const [doctor_datas, setdoctor_datas] = useState([]);

    const [region, setRegion]=useState([])
   const [regioname, setRegioname]=useState([])
const [ districts,  setDistricts]=useState([])
const [districtname, setDistrictname] = useState(null);


       useEffect(()=>{
       if(positions.length==0){
           getParamsData()
       }else{
       
 let a=positions.filter((item)=>(item.roleId==4))
           setposition_datas([...a])
        
       
       }
        getRegions()
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




const getParamsData=async()=>{
        try{
           var res=await get_params_for_add_staff()
           setpositions([...res.data.positions])
           setroles(res.data.roles)
           let a=res.data.positions.filter((item)=>(item.roleId==4))
           
           setposition_datas(a)
        }catch(err){

        }
    }
   
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
      let new_data={
        address: res.data.address ||'',
        firstname: res.data.firstName || '',
        lastname: res.data.lastName || '',
        surename: res.data.sureName || '',
        gender: res.data.gender,
        phone: formatPhoneNumberForForm(res.data.phone),
      }
if (res.data?.district?.region) {
  const regionId = res.data.district.region.id;

  // regionni set qilamiz
  new_data.regioname = regionId;

  // shu region bo‘yicha districtlarni oldindan yuklaymiz
  await getDistricts(regionId);

  // districtni set qilamiz
  new_data.districtname = {
    value: res.data.district.id,
    label: res.data.district[`name${t("data_lang")}`],
  };
}

      form.setFieldsValue(new_data);
      setPhoneValue(formatPhoneNumberForForm(res.data.phone));
      setcheck_ecg(true)
      getOldECGAnaylses(res.data.id)
    } catch (err) {
      setPatcient({});
    } finally {
      setLoading(false);
    }
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

  const savePatcient = async (val) => {
    try {
      setLoading1(true);
      const res = await save_patcient_data({
        ...val,
       district_id: val.districtname.value,
        passport,
        birthdate,
        address: val.address, 
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

const onChangeComplaints=(val)=>{
      let x=select_complaint.findIndex((x)=>(x.id==val.id))
      let a=select_complaint
      if(x==-1){
        a.push(val)
      }else{
        a.splice(x, 1)
      }
      setselect_complaint([...a])
      console.log(a)
}


const onChangeDoctors=(val)=>{
      let x=select_doctor.findIndex((x)=>(x.id==val.id))
      let a=select_doctor
      if(x==-1){
        a.push(val)
      }else{
        a.splice(x, 1)
      }
      setselect_doctor([...a])
      console.log(a)
}

 const handleSubmit = async () => {
    console.log(files.length)
    if (files.length === 0) return alert(t("select_file_error"));
    if(check_ai){
      warningAlert(t("please_wait"))
    }else{
      warningAlert(t("please_wait_save"))
    }
    setloader(true)
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
      formData.append('clinic_id', user.clinic.id)
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
      setloader(false)
    }
  };
const retryAnalyse=()=>{
    setPatcient(null);
    setekg_saved(false)
             setselect_doctor([])
              setselect_complaint([])
              setFiles([])
              setcheck_ecg(false)
              setshow_btn(false)
              setdoctor_datas(doctors)
              setResult(null);
    setError(null);
    setcheck_ai(false)
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
             setselect_doctor([])
              setselect_complaint([])
              setFiles([])
              setcheck_ecg(false)
              setshow_btn(false)
              setResult(null);
              setdoctor_datas(doctors)
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


const changePositions=(val)=>{
  
      setselect_doctor([])
       if(val.length==0){
        setdoctor_datas(doctors)
       }else{
 const result = doctors.filter(doctor =>
  doctor.positions.some(pos => val.includes(pos.id))
);
      setdoctor_datas([...result])
       }
     
}






const getRegions = async () => {
  try {
    const res = await get_region_data()
    console.log(res.data)
    setRegion(res.data)
  } catch (err) {
    console.log(err)
  }
}


const getDistricts = async (id) => {
  try {
    const res = await get_districts_data({ region_id: id }); 
    
    console.log("Tumanlar kelyapti:", res.data); 
    if (res.data) {
      setDistricts(res.data); 
    }
  } catch (err) {
    console.log("Tumanlarni yuklashda xatolik:", err);
  }
};




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
                   <Form.Item
  name="regioname"
  label={t('region')}
  rules={[{ required: true, message: '' }]}
>
  <Select
    style={{ width: '100%' }}
    value={regioname}
    placeholder={t('enter_region')}
onChange={(value) => {
    setRegioname(value); 
    form.setFieldsValue({ districtname: undefined }); 
    getDistricts(Number(value));
}}
    options={region?.map((item) => {
      const currentLang = i18n.language; 
      let labelText = item.nameUz;
      if (currentLang === 'ru') labelText = item.nameRu;
      if (currentLang === 'en') labelText = item.nameEn;
      return {
        value: item.id,
        label: labelText
      };
    })}
  />
</Form.Item>

                  </Col>

                <Col className="main_col" lg={8} md={24}>
  <Form.Item  
    name="districtname"
    label={t('district')}
    rules={[{ required: true, message: '' }]}
  >
    <Select
      style={{ width: '100%' }}
      placeholder={t('enter_district')}
      labelInValue
      options={districts?.map((item) => ({
        value: item.id, 
        label: i18n.language === 'ru' ? item.nameRu : (i18n.language === 'en' ? item.nameEn : item.nameUz)
      }))}
    />
  </Form.Item>
</Col>


                  <Col className="main_col" lg={16} md={24}>
                <Form.Item
  name="address"
  label={t('addres')}
  normalize={(value) => value?.toUpperCase()}
  rules={[{ required: true, message: '' }]}
>
  <Input
    prefix={<AiFillHome />}
    className="login_input"
    placeholder={t('enter_addres')}
  />
</Form.Item>

                  </Col>


          <div className='save-pat-data'>
                  <Col className="main_col" lg={8} md={24}>
                    <div className="form_div">
                      <Button className="btn_form" loading={loading1} htmlType="submit">
                        {t('saveData')}
                      </Button>
                    </div>
                  </Col>
        </div>
                </Row>
              </Form>
            </div>
         
        </div>
      </div>
      {check_ecg?<div className="main_card">
        <h1>{t('ecg_analyse')} <Tooltip placement="bottomRight" title={t("alert_ecg")}>
                <span className='alert_icon'><IoAlertCircleSharp /></span>
            </Tooltip></h1>
        <div className="main_card_content">
              <Form
              form={form2}
                name="basic2"
                labelCol={{ span: 24 }}
                wrapperCol={{ span: 24 }}
                initialValues={{ remember: true }}
                
              >
              <Row>
                <Col  className="main_col" lg={12} md={24}>

                     <Form.Item
  name="select_ecg_file"
  label={t('select_ecg_file')}
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
                      name="lang"
                      label={t('lang_analyse')}
                      rules={[{ required: true, message: '' }]}
                    >
                      <Select
                        style={{ width: '100%' }}
                        value={lang}
                        prefix={<MdLanguage />}
                        defaultValue={lang}
                        onChange={(value) => setlang(value)}
                        options={[
                          { value: 'uz', label: <> {t('uzbek')}</> },
                          { value: 'ru', label: <>{t('russian')}</> },
                          { value: 'en', label: <>{t('english')}</> },
                        ]}
                      />
                    </Form.Item>
                  </Col>
<Col lg={24} md={24}>
<Form.Item
                      name="check_ai"
                      
                    >
 <div className='complaint_item'>
                             <Checkbox value={check_ai} onChange={(val)=>{setcheck_ai(val.target.checked)}} ><span className='complaint_name'>{t("check_by_ai")}</span></Checkbox>
                        </div>
                        </Form.Item></Col>
                  {doctors.length>0?<><Col className="main_col" lg={24} md={24}>
                                       <Form.Item
                                        name="positions"
                                        label={t('position')}
                                        
                                      >
                   <Select
                   onChange={(val)=>{changePositions(val)}}
                                          style={{ width: '100%' }}
                                          mode="multiple"
                                          prefix={<FaUserDoctor />}
                                          placeholder={t('enter_position_doctor')}
                                          options={position_datas.map(item => ({
                      value: item.id,
                      label: item[`name${t("data_lang")}`],
                    }))}
                                    
                                        />
                                       
                                      </Form.Item>
                                      </Col>
                   <Col  className="main_col" lg={24} md={24}>
                <p className='ecg_label'>{t("select_doctor_of_patcient")}</p>
                <br/>
                <Row>
                    {doctor_datas.map((item, key)=>{
                        return(<Col lg={12} md={24}><div className='complaint_item'>
                             <Checkbox checked={select_doctor.findIndex(x=>(x.id==item.id))!=-1} onChange={()=>{onChangeDoctors(item)}}><span className='complaint_name'>{item.lastName} {item.firstName}</span></Checkbox>
                        </div></Col>)
                    })}
                    </Row>
                   <p className='ecg_has_not_label'>{t("has_not_doctor")}</p> 
                </Col></>:<></>}
                                       
                <Col  className="main_col" lg={24} md={24}>
                <p className='ecg_label'>{t("patcient_complaint")}</p>
                <br/>
                <Row>
                    {complaints.map((item, key)=>{
                        return(<Col lg={12} md={24}><div className='complaint_item'>
                             <Checkbox checked={select_complaint.findIndex(x=>(x.id==item.id))!=-1} onChange={()=>{onChangeComplaints(item)}}><span className='complaint_name'>{item[`name${t("data_lang")}`]}</span></Checkbox>
                        </div></Col>)
                    })}
                    </Row>
                </Col>



                <Col lg={9} md={24}></Col>
                <Col lg={6} md={24}>
                {show_btn?<Button onClick={handleSubmit} loading={loading3} htmlType='button'  className="btn_form">
           {check_ai?t("check"):t("save_ecg")}
        </Button>:<></>}
        
                </Col>
                <Col lg={9} md={24}></Col>

              </Row>
              </Form>
        </div>
        </div>:<></>}
       {(result!=null || loading3) && check_ai?<div className="main_card">
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

            {old_anylyses.map((item, key)=>{
              return <EcgOldResult data={item}/>
            })}
            
           {page<=total_page?<Button onClick={()=>{getOldECGAnaylses(patcient.id)}} loading={old_loading} htmlType='button'  className="btn_form mini_btn_main">
          {t("get_other_results")}
        </Button>:<></>}
            <br/>
            <br/>
            <br/>
    </div>
  );
}
