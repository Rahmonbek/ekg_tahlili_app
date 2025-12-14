import { Button, Col, DatePicker, Form, Input, Row } from 'antd'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FaBuilding } from 'react-icons/fa'
import { FaAddressCard, FaCalendarDays } from 'react-icons/fa6'
import InputMask from "react-input-mask";

const formatDate="dd.mm.yyyy"

export default function EcgAnalyzer() {
    const [loading, setloading]=useState()
    const {t}=useTranslation()
    const searchPatcient=(val)=>{
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
        <Col  className='main_col' lg={6} md={24}>
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
        <Col  className='main_col' lg={6} md={24}>
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
        {t("save_data")}
      </Button>
       
  </div>
        </Col>
    </Row>
       
 
        

    
    
  </Form>
                    </div>
    </div>
    
    </div>
  )
}
