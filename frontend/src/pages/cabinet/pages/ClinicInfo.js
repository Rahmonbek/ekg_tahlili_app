import { Button, Col, Form, Input, Row, Select, Space, Upload } from 'antd'
import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { FaBuilding, FaLocationDot, FaPlus } from 'react-icons/fa6'
import { MinusCircleOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom'
import { useStore } from '../../../store/Store'
import { AiFillHome, AiOutlineFieldNumber } from 'react-icons/ai'
import { IoPersonSharp } from 'react-icons/io5'
import InputMask from "react-input-mask";
import { BsBank2 } from 'react-icons/bs'
import Cleave from "cleave.js/react"
import { get_clinic_by_id, send_clinic_detail, send_clinic_info, send_clinic_phone } from '../../../host/requests/ClinicRequest';
import { api, imgApi } from '../../../host/Host';
import { formatPhoneForCleave, formatPhoneNumber, formatPhoneNumberForForm2 } from '../../../tools/formatters';
import { useForm } from 'antd/es/form/Form';
import { formatPhoneNumberForForm } from '../../../tools/formatters';
import { dangerAlert, successAlert } from '../../../tools/Alerts';
import { LiaDownloadSolid } from "react-icons/lia";
import i18n from '../../../locale/i18next';
import { get_districts_data, get_region_data } from '../../../host/requests/RegionRequest';
export default function ClinicInfo() {
    const {t}=useTranslation()
    const [formPhones]=Form.useForm()
    const [loadingMain, setloadingMain]=useState(false)
    const [loadingPhone, setloadingPhone]=useState(false)
    const [loadingDetail, setloadingDetail]=useState(false)
    const [clinic, setclinic]=useState(null)
    const [phones, setphones]=useState([])
    const {user, loader, setloader}=useStore()
    const [form] = Form.useForm();
    const [formMain] = Form.useForm();
    const [formSecend] = Form.useForm();
    const [formPhone] = Form.useForm();
    const [filename, setFilename]=useState();
    const [licenseFile, setLicenseFile] = useState(null);
    const [clinicLogoFile, setClinicLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);

    
    const [region, setRegion]=useState([])
   const [regioname, setRegioname]=useState([])
const [ districts,  setDistricts]=useState([])
const [districtname, setDistrictname] = useState(null);


const [licenseUrl, setLicenseUrl] = useState(null);
    const fileRef = useRef(null);
    useEffect(()=>{
         setloader(true)
         getRegions()
         getClinicData()
    }, [user])
    

    const getClinicData = async () => {
      try {
        const res = await get_clinic_by_id({ id: user.clinic.id });
    
        setclinic(res.data);
        
        formMain.setFieldsValue({
          clinicName:res.data.clinicName,
          clinicLogo:res.data.clinicLogo
        })
    
     
     var a=res.data.clinicPhoneNumber.map((item,key)=>{
      return({
        id:item.id,
        phoneNumber:formatPhoneNumberForForm(item.phoneNumber)
      })
     })
      if(a.length==0){
      a=[{
        id:null,
        phoneNumber:''
      }]
     }
     setphones([...a])

     formPhones.setFieldsValue({
      phone_numbers: [...a]
    });

     const detail = res.data.clinicDetail;

       let new_data={
        bankAccount: formatBankAccount(detail.bankAccaunt), 
        mfo: detail.mfo,
        bankName: detail.bankName,
        inn: detail.inn,
        license: detail.license,
        address: detail.address,
       
       }
      
      if(res.data!=null && detail.district!=null){
        new_data. districtname={
          value: detail.district.id, 
          label: detail.district[`name${t("data_lang")}`] 
        }
    if(detail.district.region!=null){
       new_data.regioname=detail.district.region[`name${t("data_lang")}`]
        }
      }
         
       
        formSecend.setFieldsValue(new_data);
      setLicenseUrl(detail.license);
      setloader(false)
      setloadingMain(false)
      setloadingDetail(false)
      setloadingPhone(false)
  }catch(err){
    // getClinicData xatoligi
  }finally{
  setloader(false);
  }}

       
          
        
       
    

     const formatBankAccount = (v) =>
        {
              return(v ? v.replace(/(.{4})/g, "$1 ").trim() : "")
        }



const handleClick = () => {
  if (fileRef.current) {
    fileRef.current.value = ""; 
    fileRef.current.click();
  }
};


const onFinish =()=>{

}



const onFinished = async (values) => {
  try {
    setloadingMain(true)
    const formData = new FormData();
formData.append("Id", clinic.id);
    formData.append("ClinicName", values.clinicName);
 if (clinicLogoFile) {
      formData.append("ClinicLogo", clinicLogoFile);
 }  

 await send_clinic_info(formData);
 successAlert(t("data_saved"))
getClinicData()
} catch (error) {
    dangerAlert(t("server_error"))
 }

}

 const onFinishPhones=async(values)=>{
         try{
          setloadingPhone(true)
          var b=values.phone_numbers.map((item, key)=>({id:item.id, phoneNumber:formatPhoneNumber(item.phoneNumber)}))
        var a={
          ClinicId:clinic.id,
          PhoneNumbers:b
        } 
        var res=await send_clinic_phone(a)
        successAlert(t("data_saved"))
         getClinicData()
         }catch(err){
console.error( err);
dangerAlert(t("server_error"))
         }
         
    
    }




const onFinishFinish = async (values) => {
  try {
    setloadingDetail(true)
    const formData = new FormData();

    if (clinic?.clinicDetail?.id) {
      formData.append("Id", clinic.clinicDetail.id);
    }

    formData.append("ClinicId", clinic.id);

    formData.append("BankAccaunt", values.bankAccount?.replace(/\s/g, ""));
    formData.append("BankName", values.bankName);
    formData.append("Mfo", values.mfo);
  
    formData.append("DistrictId", values.districtname?.value);


    formData.append("Inn", values.inn);
    formData.append("Address", values.address);
    formData.append("License", values.license);
  
    if (licenseFile) {
      formData.append("LicenseFile", licenseFile);
    }
    await send_clinic_detail(formData);
    successAlert(t("data_saved"))
    getClinicData()

  } catch (error) {
    console.error(error);
    dangerAlert(t("server_error"))
  }
};


const formatUzPhone = (value = "") => {
  // faqat raqamlar
  let digits = value.replace(/\D/g, "");
if(digits.length<=3){
    return "+998"
  }
  // 998 ni olib tashlaymiz (agar foydalanuvchi yozsa ham)
  if (digits.startsWith("998")) {
    digits = digits.slice(3);
  }
  
  let result = "+998";
  // AGAR 1 ta ham raqam bo'lmasa — faqat +998
  if (digits.length === 0) {
    return result;
  }

  // 1–2 raqam bo‘lsa — (9 yoki (91
  result += " (" + digits.slice(0, 2);

  // qavs faqat 2 ta raqam bo‘lsa yopiladi
  if (digits.length > 2) {
    result += ")";
  }

  // keyingi qismlar
  if (digits.length > 2) {
    result += " " + digits.slice(2, 5);
  }

  if (digits.length > 5) {
    result += "-" + digits.slice(5, 7);
  }

  if (digits.length > 7) {
    result += "-" + digits.slice(7, 9);
  }

  return result;
};

const getRegions = async () => {
  try {
    const res = await get_region_data()
    setRegion(res.data)
  } catch (err) {
    // viloyatlar yuklanmadi
  }
}

const getDistricts = async (id) => {
  try {
    const res = await get_districts_data({ region_id: id });
    if (res.data) {
      setDistricts(res.data);
    }
  } catch (err) {
    // tumanlar yuklanmadi
  }
};


  
  return (
    <>
    {clinic!=null?<div>
        <Row>
                         <Col className='main_col' lg={8} xs={24} sm={24} md={12} sm={24}>
                         <div className='main_card'>
                    <h1>{t("main_info")}</h1>
                    
                    <div className='main_card_content'>
                          <Form
                          form={formMain}
    name="basic"
    labelCol={{
      span: 24,
    }}
    wrapperCol={{
      span: 24,
    }}
   initialValues={{
      remember: true,
    }}
    onFinish={onFinished}
    
  >
    
        <Form.Item
      name="clinicLogo"
      label={t("clinic_logo")}
      rules={[
        {
           required: true,
           message: "",
            
        }
      ]}
    >
       <div className="input_img_box">
  <input
    type="file"
    accept="image/*"
    onChange={(e) => {
      const file = e.target.files[0];
      if (file) {
        setClinicLogoFile(file);
        setLogoPreview(URL.createObjectURL(file));
      }
    }}
  />

  {logoPreview ? (
    <img src={logoPreview} />
  ) : clinic?.clinicLogo ? (
    <img src={imgApi + clinic.clinicLogo} />
  ) : (
    <div className="input_img_icon">
      <FaPlus />
    </div>
  )}
</div>

         
        </Form.Item>
 <Form.Item
      name="clinicName"
      label={t("clinic_name")}
      rules={[
        {
           required: true,
           message: "",
            
        }
      ]}
    >
      <Input prefix={<FaBuilding />} className='login_input' placeholder={t("enter_clinic_name")} />
    </Form.Item>
        

    
     <Form.Item
     style={{"marginBottom":"10px"}}
      wrapperCol={{
        span: 24,
      }}
    >
      <Button className='btn_form' loading={loadingMain} htmlType="submit">
        {t("save_data")}
      </Button>
       
    </Form.Item>
  </Form>
                    </div>
                 </div>
      
       <div className='main_card'>
                    <h1>{t("phone_numbers")}</h1>
                    
                    <div className='main_card_content'>
                          <Form 
                          
                          form={formPhones}
    name="basic"
    labelCol={{
      span: 24,
    }}
    wrapperCol={{
      span: 24,
    }}
   initialValues={{
      remember: true,
    }}
    onFinish={onFinishPhones}
    // onFinishFailed={onFinishFailed}
    
  >
   
 <Form.List name="phone_numbers">
  {(fields, { add, remove }) => (
    <>
      {fields.map(({ key, name, ...restField }) => (
        <div
          key={key}
          style={{ display: "flex", width:'100%', alignItems: "flex-start" }}
        >
         
          {/* ID yashirin holda */}
          <Form.Item
            {...restField}
            name={[name, "id"]}
            hidden
          >
            <Input />
          </Form.Item>

          {/* Telefon raqam */}
          <Form.Item
            {...restField}
            name={[name, "phoneNumber"]}
            rules={[
              { required: true },
              { len: 19 }
            ]}
            style={{width:'95%'}}
          >
            <Cleave
              options={{
              prefix: phones[name]?.phoneNumber ? "" : "+998",
                delimiters: [" (", ") ", "-", "-"],
                blocks: [4, 2, 3, 2, 2],
              }}
              className="ant-input claveInput"
                        style={{ width: '100%' }}
              value={phones[name]?.phoneNumber || ""}
              onChange={(e) => {
    const value = e.target.value;
    setphones((prev) =>
      prev.map((item, index) =>
        index === name
          ? { ...item, phoneNumber: value }
          : item )); }}
         placeholder="+998 (__) ___-__-__"
         />
          </Form.Item>

          <MinusCircleOutlined
         style={{ marginTop: 10, fontSize:'20px', marginLeft:'5px' }}
            onClick={() => remove(name)}
          />
        </div>
      ))}

      <Form.Item>
        <Button
          type="dashed"
          block
          icon={<PlusOutlined />}
          onClick={() =>
            add({ id: null, phoneNumber: "" })
          }
        >
          Telefon qo‘shish
        </Button>
      </Form.Item>
    </>
  )}
</Form.List>

    
     <Form.Item
     style={{"marginBottom":"10px"}}
      wrapperCol={{
        span: 24,
      }}
    >
      <Button className='btn_form' loading={loadingPhone} htmlType="submit">
        {t("save_data")}
      </Button>
       
    </Form.Item>
  </Form>
                    </div>
                 </div>
      
      
                         </Col>
                         <Col className='main_col' lg={16} xs={24} sm={24} md={12} sm={24}>
                          <div className='main_card'>
                    <h1>{t("bank_info")}</h1>
                    
                    <div className='main_card_content'>
                        <Form
                            form={formSecend}

    name="basic"
    labelCol={{
      span: 24,
    }}
    wrapperCol={{
      span: 24,
    }}
   initialValues={{
      remember: true,
    }}
    onFinish={onFinishFinish}
    
  >
<Row>
                         <Col className='main_col' lg={12} xs={24} sm={24} md={24} sm={24}>
                         <Form.Item
      name="inn"
      label={t("inn")}
      rules={[
        {
           required: true,
           message: "",
            
        },
        
      ]}
    >
      <InputMask
  mask="999999"
  maskChar={null}
  alwaysShowMask={true}
  beforeMaskedValueChange={(newState, oldState, userInput) => {
    let { value } = newState;


    if (userInput === "") {
      if (oldState.value && oldState.value.length > value.length) {

        return oldState;
      }
    }

    return newState;
  }}
>
  {(props) => 
      <Input  prefix={<AiOutlineFieldNumber />} className='login_input' placeholder={t("enter_inn")} />}
</InputMask>
    </Form.Item>
                      
                      
                      
                         </Col>
    <Col className='main_col' lg={12} xs={24} sm={24} md={24} sm={24}>
                         <Form.Item
      name="license"
      label={t("license")}
      rules={[
        {
           required: true,
           message: "",
            
        }
      ]}
    >
 <div className="file-input-wrapper">
  <input
    type="file"
    accept=".pdf,.jpg,.png"
    onChange={(e) => {
      const file = e.target.files[0];
      if (file) {
        setLicenseFile(file); 
        setFilename(file.name);   
      }
    }}
  />

 <div className="download_button">
  <button
    type="button"

    disabled={!licenseUrl} 
    onClick={async () => {
      if (!licenseUrl) return;

      const fullUrl = `${api.replace('/api', '')}${licenseUrl}`;

      try {
        const response = await fetch(fullUrl);
        if (!response.ok) throw new Error("Serverdan faylni olib bo'lmadi");
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        const fileName = licenseUrl.split('/').pop() || "license.pdf";
        a.download = fileName; 
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);

      } catch (error) {
        console.error("Xatolik:", error);
 
        window.open(fullUrl, "_blank");
      }
    }}
  >
    <LiaDownloadSolid />
  </button>
</div>
</div>



    </Form.Item>
                         </Col>




      <Col className="main_col" lg={12} xs={24} sm={24} md={24}>
                   <Form.Item
  name="regioname"
  label={t('region')}
  rules={[{ required: true, message: '' }]}
>
  <Select
    style={{ width: '100%' }}
    value={regioname}
    placeholder={t('enter_region_clinic')}
onChange={(value) => {
    setRegioname(value); 
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

                <Col className="main_col" lg={12} xs={24} sm={24} md={24}>
  <Form.Item  
    name="districtname"
    label={t('district')}
    rules={[{ required: true, message: '' }]}
  >
    <Select
      style={{ width: '100%' }}
      placeholder={t('enter_district_clinic')}
      labelInValue
      options={districts?.map((item) => ({
        value: item.id, 
        label: i18n.language === 'ru' ? item.nameRu : (i18n.language === 'en' ? item.nameEn : item.nameUz)
      }))}
    />
  </Form.Item>
</Col>


              



                         <Col className='main_col' lg={24} xs={24} sm={24} md={24} sm={24}>
                         <Form.Item
      name="address"
      label={t("address")}
      rules={[
        {
           required: true,
           message: "",
            
        }
      ]}
    >
      <Input prefix={<FaLocationDot />} className='login_input' placeholder={t("enter_address")} />
    </Form.Item>
                         </Col>
                         <Col className='main_col' lg={12} xs={24} sm={24} md={24} sm={24}>
                         <Form.Item
  name="bankAccount"
  label={t("bank_account")}
  rules={[{ required: true }]}
>
  <InputMask
    mask="9999 9999 9999 9999"
    maskChar={null}
    alwaysShowMask
  >
    {(props) => (
      <Input
        {...props}  
        prefix={<AiOutlineFieldNumber />}
        className="login_input"
        placeholder={t("enter_bank_account")}
      />
    )}
  </InputMask>
</Form.Item>

                         </Col>
                          <Col className='main_col' lg={12} xs={24} sm={24} md={24} sm={24}>
                         <Form.Item
      name="mfo"
      label={t("mfo")}
      rules={[
        {
           required: true,
           message: "",
            
        }
      ]}
    ><InputMask
  mask="9999"
  maskChar={null}
  alwaysShowMask={true}
  beforeMaskedValueChange={(newState, oldState, userInput) => {
    let { value } = newState;

    // Belgilarni siljishidan himoya
    if (userInput === "") {
      if (oldState.value && oldState.value.length > value.length) {
        // eski qiymatni qaytarib qo'yamiz
        return oldState;
      }
    }

    return newState;
  }}
>
  {(props) => 
      <Input prefix={<AiOutlineFieldNumber />} className='login_input' placeholder={t("enter_mfo")} />}
</InputMask>
    </Form.Item>
                         </Col>
                          <Col className='main_col' lg={24} xs={24} sm={24} md={24} sm={24}>
                         <Form.Item
      name="bankName"
      label={t("bankName")}
      rules={[
        {
           required: true,
           message: "",
            
        }
      ]}
    >
      <Input prefix={<BsBank2 />} className='login_input' placeholder={t("enter_bankName")} />
    </Form.Item>
                         </Col>

            
</Row>
 <Form.Item
 style={{"marginBottom":"10px"}}
      wrapperCol={{
        span: 24,
      }}
    >
      <Button className='btn_form' loading={loadingDetail} htmlType="submit">
        {t("save_data")}
      </Button>
       
    </Form.Item>
  </Form>
  </div>
  </div>
                         </Col>
                    </Row>
 

    </div>:<></>}</>
  )
}
