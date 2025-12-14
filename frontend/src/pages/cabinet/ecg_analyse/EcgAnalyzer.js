import { Button, Col, DatePicker, Form, Input, Row, Select } from 'antd'
import Cleave from 'cleave.js/react'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FaBuilding, FaFemale, FaMale } from 'react-icons/fa'
import { FaAddressCard, FaCalendarDays } from 'react-icons/fa6'
import InputMask from "react-input-mask";
import { get_patcient_by_passport } from '../../../host/requests/PatcientRequest'

const formatDate="dd.mm.yyyy"

export default function EcgAnalyzer() {
    const [loading, setloading]=useState(false)
    const {t}=useTranslation()
    const [gender, setGender] = useState(true);
    const [check_ecg, setcheck_ecg] = useState(false);
    const [patcient, setpatcient] = useState(null);
    const searchPatcient=async(val)=>{
       try{
        setloading(true)
        var res=await get_patcient_by_passport(val)
        console.log(res)
       }catch(err){

       }finally{
        setloading(false)
       }
    }

    const savePatcient=(val)=>{
       console.log(val)
    }
  return (
    <div>
    
    <div className='main_card'>
         <h1>{t("patcient_info")}</h1>
         <div className='main_card_content'>
                          <Form
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
    onFinish={searchPatcient}
    // onFinishFailed={onFinishFailed}
    
  >
    <Row>
        <Col  className='main_col' lg={8} md={24}>
        <Form.Item
      name="passport"
      label={t("passport_seria")}
      rules={[
        {
           required: true,
           message: "",
            
        }
      ]}
    >
         <InputMask
  mask="** 9999999"
  maskChar={null}
  alwaysShowMask={true}
  beforeMaskedValueChange={(newState, oldState, userInput) => {
    let { value } = newState;

    // 🔒 Belgilarni siljishidan himoya
    if (userInput === "") {
      if (oldState.value && oldState.value.length > value.length) {
        return oldState;
      }
    }

    // 🔥 Uppercase qilish
    return {
      ...newState,
      value: value.toUpperCase(),
    };
  }}
>
  {(props) => (
    <Input
      {...props}
      prefix={<FaAddressCard />}
      className="login_input"
      placeholder={t("enter_passport_seria")}
    />
  )}
</InputMask>
    </Form.Item>
        </Col>
        <Col  className='main_col' lg={8} md={24}>
        <Form.Item
      name="birthdate"
      label={t("birthdate")}
      rules={[
        {
           required: true,
           message: "",
            
        }
      ]}
    >
      <input className='input_date' type='date'/>
    </Form.Item>
        </Col>
        <Col  className='main_col' lg={6} md={24}>
         <div className='form_div'>
      <Button className='btn_form' loading={loading} htmlType="submit">
        {t("search_patcient")}
      </Button>
       
  </div>
        </Col>
    </Row>
       
 
        

    
    
  </Form>
<div className={`hidden_box ${check_ecg?"showed_box":''}`}>
    <Form
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
    onFinish={savePatcient}
    // onFinishFailed={onFinishFailed}
    
  >
<Row>
    <Col  className='main_col' lg={8} md={24}>
      
 <Form.Item
      name="lastname"
      label={t("lastname")}
      normalize={(value) =>
  value
    ?.toUpperCase()
}
      rules={[
        {
           required: true,
           message: "",
            
        }
      ]}
    >
      <Input prefix={<FaBuilding />} className='login_input' placeholder={t("enter_lastname")} />
    </Form.Item>
    </Col>
    <Col  className='main_col' lg={8} md={24}>
 <Form.Item
  name="firstname"
  label={t("firstname")}
  normalize={(value) =>
  value
    ?.toUpperCase()
}
  rules={[{ required: true, message: "" }]}
>
  <Input
    prefix={<FaBuilding />}
    className="login_input"
    placeholder={t("enter_firstname")}
  />
</Form.Item>
    </Col>
    <Col  className='main_col' lg={8} md={24}>
      
 <Form.Item
      name="surename"
      label={t("surename")}
      normalize={(value) =>
  value
    ?.toUpperCase()
}
      rules={[
        {
           required: true,
           message: "",
            
        }
      ]}
    >
      <Input prefix={<FaBuilding />} className='login_input' placeholder={t("enter_surename")} />
    </Form.Item>
    </Col>
    <Col  className='main_col' lg={8} md={24}>
      
 <Form.Item
      name="gender"
      label={t("gender")}
      rules={[
        {
           required: true,
           message: "",
            
        }
      ]}
    >
       <Select
      prefix={gender === true ? <FaMale /> : <FaFemale />}
      defaultValue={true}
      style={{ width: "100%" }}
    onChange={(value) => setGender(value)}
      options={[
        { value: true, label: t("male") },
        { value: false, label: t("female") },
      ]}
    />
    </Form.Item>
    </Col>
    <Col  className='main_col' lg={8} md={24}>
     <Form.Item
              
                 wrapperCol={{
      span: 24,
    }}
    label={t("phone_number")}
                name={"phone_number"}
                rules={[{ required: true, message: '' }, { len: 19, message: '' }]}
              >
                <Cleave
    options={{
      prefix: "+998",
      delimiters: [" (", ") ", "-", "-"],
      blocks: [4, 2, 3, 2, 2],
      numericOnly: true
    }}
    placeholder="+998 (__) ___-__-__"
    className="ant-input claveInput"
    style={{ width: "100%" }}
  />
              </Form.Item>
    </Col>
     <Col  className='main_col' lg={8} md={24}>
         <div className='form_div'>
      <Button className='btn_form' loading={loading} htmlType="submit">
        {t("saveData")}
      </Button>
       
  </div>
        </Col>
</Row>

  </Form>
          </div>          </div>
    </div>
    
    </div>
  )
}
