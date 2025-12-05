import { Button, Form, Input } from 'antd'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next';
import logo from '../../../images/logo.png'
import login_img from '../../../images/login_img.svg'
import { IoIosMail, IoMdLock } from 'react-icons/io';
export default function Login() {
  
 
    const {t}=useTranslation()
   



    const  onFinish=async(val)=>{
      
    }

    useEffect(()=>{
      
     }, [])

  return (
    <div className='login_box'>
      <div className='login_img'>
        <img src={login_img}/>
      </div>
      <div className='login_form_box'>
    <div className='login_form'>
      
    <h1>{t("ymed_login")}</h1>
    <div className='login_form_form'>

   
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
      name="email"
      label={t("email")}
      rules={[
        {
          type: 'email',
          message: "",
        },
        {
           required: true,
           message: "",
            
        }
      ]}
    >
      <Input prefix={<IoIosMail />} className='login_input' placeholder={t("enter_email")} />
    </Form.Item>

    <Form.Item
      name="password"
      label={t("password")}
      rules={[
        {
          required: true,
          message: "",
        },
      ]}
    >
      <Input.Password prefix={<IoMdLock />} className='login_input'  placeholder={t("enter_password")} autoComplete="new-password"/>
    </Form.Item>
     <Form.Item
      wrapperCol={{
        span: 24,
      }}
    >
      <Button className='btn_form' htmlType="submit">
        {t("login")}
      </Button>
       
    </Form.Item>
  </Form> </div>
</div>
    </div>
    </div>
  )
}
