import { Button, Form, Input } from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next';
import logo from '../../../images/logo.png'
import login_img from '../../../images/doctor3.svg'
import { IoIosMail, IoMdLock } from 'react-icons/io';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../../../host/requests/AuthRequest';
import { dangerAlert, successAlert } from '../../../tools/Alerts';
import { useStore } from '../../../store/Store';
export default function Login() {
  const [loading, setloading]=useState(false)
  const {user_id, setuser_id} = useStore()
    const {t}=useTranslation()
   const navigate=useNavigate()



     const  onFinish=async(val)=>{
            try{
              setloading(true)
                var res=await login({
                    email:val.email,
                    password:val.password
                })
                if(res.status==200){
                  successAlert(t(res.data.message))
               setuser_id(res.data.userId)
               window.localStorage.setItem("NMED_token", res.data.token)
                }
            }catch(err){
               dangerAlert(t(err.response.data.message));
              if(err.response.data.message=='user_not_find' || err.response.data.message=='email_not_verified'){
                navigate('/register')
              }
               
            }finally{
          setloading(false)
        }
        }

    useEffect(()=>{
      
     }, [])

  return (
    <div className='login_box'>
      
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
      <Input prefix={<IoIosMail />}  autoComplete="email" className='login_input' placeholder={t("enter_email")} />
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
      <Input.Password prefix={<IoMdLock />} className='login_input'  placeholder={t("enter_password")} autoComplete="current-password"/>
    </Form.Item>
   <div className="reset_pass_text">
    <Link to={"/change_password"}>{t("reset_password")}</Link>
</div>
     <Form.Item
      wrapperCol={{
        span: 24,
      }}
    >
      <Button className='btn_form' loading={loading} htmlType="submit">
        {t("login")}
      </Button>
       
    </Form.Item>
  </Form> </div>
</div>
<div className="login_bottom">
  <p dangerouslySetInnerHTML={{__html:t("not_have_account")}}/>
  <Link to={"/register"}>{t("register_a")}</Link>
</div>
    </div>
    <div className='login_img'>
        <img src={login_img}/>
      </div>
    </div>
  )
}
