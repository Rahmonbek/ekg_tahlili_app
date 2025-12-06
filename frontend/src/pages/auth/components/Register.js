import { Button, Form, Input } from 'antd'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next';
import logo from '../../../images/logo.png'
import login_img from '../../../images/doctor2.svg'
import { IoIosMail, IoMdLock } from 'react-icons/io';
import { Link } from 'react-router-dom';

export default function Register() {
  
 
    const {t}=useTranslation()
   



    const  onFinish=async(val)=>{
      
    }

    useEffect(()=>{
      
     }, [])

  return (
    <div className='login_box'>
      
      <div className='login_form_box'>
    <div className='login_form'>
      
    <h1>{t("ymed_register")}</h1>
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
      label={t("new_password")}
      rules={[
        {
          required: true,
          message: "",
        },
      ]}
    >
      <Input.Password  prefix={<IoMdLock />} className='login_input'  placeholder={t("enter_new_password")} autoComplete="new-password"/>
    </Form.Item>
   <Form.Item
  name="check_password"
  label={t("check_password")}
  dependencies={['password']}
  rules={[
    {
      required: true,
      message: "",
    },
    ({ getFieldValue }) => ({
      validator(_, value) {
        if (!value || getFieldValue('password') === value) {
          return Promise.resolve();
        }
        if(getFieldValue('password').length==value.length){
return Promise.reject(new Error(t("password_not_match")));
        }else{
          return Promise.reject(new Error(t("")));
        }
        
      },
    }),
  ]}
>
  <Input.Password prefix={<IoMdLock />}   className='login_input' placeholder={t("enter_check_password")} autoComplete="new-password" />
</Form.Item>
     <Form.Item
      wrapperCol={{
        span: 24,
      }}
    >
      <Button className='btn_form' htmlType="submit">
        {t("register")}
      </Button>
       
    </Form.Item>
  </Form> </div>
</div>
<div className="login_bottom">
  <p dangerouslySetInnerHTML={{__html:t("have_account")}}/>
  <Link to={"/"}>{t("login_a")}</Link>
</div>
    </div>
    <div className='login_img'>
        <img src={login_img}/>
      </div>
    </div>
  )
}
