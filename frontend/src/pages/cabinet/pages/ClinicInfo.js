import { Button, Col, Form, Input, Row } from 'antd'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FaBuilding, FaLocationDot, FaPlus } from 'react-icons/fa6'
import { IoIosMail, IoMdLock } from 'react-icons/io'
import { Link } from 'react-router-dom'
import { useStore } from '../../../store/Store'
import { AiOutlineFieldNumber } from 'react-icons/ai'
import { IoPersonSharp } from 'react-icons/io5'
import { BsBank2 } from 'react-icons/bs'

export default function ClinicInfo() {
    const {t}=useTranslation()
    const [loading, setloading]=useState(false)
    const {clinic}=useStore()
    const onFinish=()=>{

    }
  return (
    <div>
        <Row>
                         <Col className='main_col' lg={8} md={12} sm={24}>
                         <div className='main_card'>
                    <h1>{t("main_info")}</h1>
                    
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
    onFinish={onFinish}
    // onFinishFailed={onFinishFailed}
    
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
        <div className='input_img_box'>
 <input type='file' />

    {clinic.clinicLogo!=null?<img src={clinic.clinicLogo}/>:<div className='input_img_icon'><FaPlus /></div>}
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
    onFinish={onFinish}
    // onFinishFailed={onFinishFailed}
    
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
            
        }
      ]}
    >
      <Input prefix={<AiOutlineFieldNumber />} className='login_input' placeholder={t("enter_inn")} />
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
      <Input prefix={<AiOutlineFieldNumber />} className='login_input' placeholder={t("")} />
    </Form.Item>
                         </Col>
                          <Col className='main_col' lg={24} md={24} sm={24}>
                         <Form.Item
      name="director"
      label={t("director")}
      rules={[
        {
           required: true,
           message: "",
            
        }
      ]}
    >
      <Input prefix={<IoPersonSharp />} className='login_input' placeholder={t("enter_director")} />
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
      name="bankAccaunt"
      label={t("bank_account")}
      rules={[
        {
           required: true,
           message: "",
            
        }
      ]}
    >
      <Input prefix={<AiOutlineFieldNumber />} className='login_input' placeholder={t("enter_bank_account")} />
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
    >
      <Input prefix={<AiOutlineFieldNumber />} className='login_input' placeholder={t("enter_mfo")} />
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
  </Form>
  </div>
  </div>
                         </Col>
                    </Row>
 

    </div>
  )
}
