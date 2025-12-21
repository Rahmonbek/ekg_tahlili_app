import { Button, Col, Form, Input, Row, Space, Upload } from 'antd'
import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { FaBuilding, FaLocationDot, FaPlus } from 'react-icons/fa6'
import { MinusCircleOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom'
import { useStore } from '../../../store/Store'
import { AiOutlineFieldNumber } from 'react-icons/ai'
import { IoPersonSharp } from 'react-icons/io5'
import InputMask from "react-input-mask";
import { BsBank2 } from 'react-icons/bs'
import Cleave from "cleave.js/react"
import { get_clinic_by_id, send_clinic_detail, send_clinic_info } from '../../../host/requests/ClinicRequest';
import { api, imgApi } from '../../../host/Host';
import { formatPhoneForCleave } from '../../../tools/formatters';
import { useForm } from 'antd/es/form/Form';
import { formatPhoneNumberForForm } from '../../../tools/formatters';
export default function ClinicInfo() {
    const {t}=useTranslation()
    const [formPhones]=Form.useForm()
    const [loading, setloading]=useState(false)
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

    const fileRef = useRef(null);
    useEffect(()=>{
         setloader(true)
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
    
     setphones([...res.data.clinicPhoneNumber])
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
     console.log(a)
     formPhones.setFieldsValue({
      phone_numbers: a
    });
     const detail = res.data.clinicDetail;

        formSecend.setFieldsValue({
          bankAccount: formatBankAccount(detail.bankAccaunt), 
          mfo: detail.mfo,
          bankName: detail.bankName,
          inn: detail.inn,
          license: detail.license,
          address: detail.address,
        });
        
    
      setloader(false)
  }catch(err){
console.log(err)
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
    const formData = new FormData();
formData.append("Id", clinic.id);
    formData.append("ClinicName", values.clinicName);
 if (clinicLogoFile) {
      formData.append("ClinicLogo", clinicLogoFile);
 }  

 const res = await send_clinic_info(formData);

console.log( res);
} catch (error) {
    console.error( error);
 }

}

 const onFinishPhones=(values)=>{
         setphones(values.phone_numbers);
    console.log(values.phone_numbers); 
    
    }




const onFinishFinish = async (values) => {
  try {
    const formData = new FormData();

    if (clinic?.clinicDetail?.id) {
      formData.append("Id", clinic.clinicDetail.id);
    }

 
    formData.append("ClinicId", clinic.id);

    formData.append("BankAccaunt", values.bankAccount?.replace(/\s/g, ""));
    formData.append("BankName", values.bankName);
    formData.append("Mfo", values.mfo);

  
    formData.append("Inn", values.inn);
    formData.append("Address", values.address);
    formData.append("License", values.license);


    if (licenseFile) {
      formData.append("LicenseFile", licenseFile);
    }

    await send_clinic_detail(formData);
    getClinicData()
  } catch (error) {
    console.error(error);
  }
};




  
  return (
    <>
    {clinic!=null?<div>
        <Row>
                         <Col className='main_col' lg={8} md={12} sm={24}>
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
      <Button className='btn_form' loading={loading} htmlType="submit">
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
            form={formPhone}
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
                prefix: "+998",
                delimiters: [" (", ") ", "-", "-"],
                blocks: [4, 2, 3, 2, 2],
                numericOnly: true
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
          : item
      )
    );
  }}
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
            add({
              id: null,
              phoneNumber: ""
            })
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
      <Button className='btn_form' loading={loading} htmlType="submit">
        {t("save_data")}
      </Button>
       
    </Form.Item>
  </Form>
                    </div>
                 </div>
      
      
                         </Col>
                         <Col className='main_col' lg={16} md={12} sm={24}>
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
                         <Col className='main_col' lg={12} md={24} sm={24}>
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
      <Input  prefix={<AiOutlineFieldNumber />} className='login_input' placeholder={t("enter_inn")} />}
</InputMask>
    </Form.Item>
                      
                      
                      
                         </Col>
    <Col className='main_col' lg={12} md={24} sm={24}>
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
</div>


    </Form.Item>
                         </Col>

                         <Col className='main_col' lg={24} md={24} sm={24}>
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
                         <Col className='main_col' lg={12} md={24} sm={24}>
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
                          <Col className='main_col' lg={12} md={24} sm={24}>
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
                          <Col className='main_col' lg={24} md={24} sm={24}>
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
      <Button className='btn_form' loading={loading} htmlType="submit">
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
