import { Button, Form, Input, Modal } from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next';
import logo from '../../../images/logo.png'
import login_img from '../../../images/doctor2.svg'
import { IoIosMail, IoMdLock } from 'react-icons/io';
import { Link } from 'react-router-dom';
import { checkusername, registration, verify_code } from '../../../host/requests/AuthRequest';
import { dangerAlert, successAlert } from '../../../tools/Alerts';
import { useStore } from '../../../store/Store';
import { IoPerson } from 'react-icons/io5';


export default function Register() {
  const [open, setopen]=useState(false)
  const [loading, setloading]=useState(false)
  const [email, setemail]=useState(null)
 
  const [usernameError, setUsernameError] = useState(""); 
  const [emailError, setEmailError] = useState("");

  const {user_id, setuser_id} = useStore()
 const [codeForm] = Form.useForm();
    const {t}=useTranslation()
   
const handleFinish = async (values) => {
try{
  setloading(true)
            var res=await verify_code({
                email:email,
                code:values.code
            })
            if(res.status==200){
              successAlert(t(res.data.message))
              setopen(true)
              setuser_id(res.data.userId)
               window.localStorage.setItem("NMED_token", res.data.token)
            }
        }catch(err){
            dangerAlert(t(err.response.data.message));
        }finally{
          setloading(false)
        }
}


const onFinish = async (val) => {
  try {
    setloading(true);

    const checkRes = await checkusername(val.username);

    if (checkRes.status === 200 && checkRes.data.exists === false) {
      setUsernameError("");
      setEmailError("");
      setemail(val.email);

      const res = await registration({
        email: val.email,
        password: val.password,
        username: val.username,
      });

      if (res.status === 200) {
        successAlert(t(res.data.message));
        setopen(true);
      }

    } else if (checkRes.status === 200 && checkRes.data.exists === true) {
      setUsernameError(t(checkRes.data.message));
      dangerAlert(t(checkRes.data.message));
    }

  } catch (err) {
    console.log(err);


    if (err.response && err.response.data && err.response.data.message) {
   
      setEmailError(t(err.response.data.message));
      dangerAlert(t(err.response.data.message));
    }

  } finally {
    setloading(false);
  }
};


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
    validateStatus={emailError ? "error" : ""}
    help={emailError || ""}
    rules={[
      {
        type: 'email',
        message: t("please_enter_valid_email"),
      },
      {
        required: true,
        message: t("please_enter_email"),
      }
    ]}
    normalize={(value) => {
      return value ? value.replace(/[.,!? ]/g, '') : '';
    }}
  >
    <Input
      prefix={<IoIosMail />}
      placeholder={t("enter_email")}
      onChange={() => setEmailError("")}
    />
  </Form.Item>



<Form.Item
    name="username"
    label={t("username")}
    validateStatus={usernameError ? "error" : ""}
    help={usernameError || ""}
    rules={[
      {
        required: true,
        message: t("please_enter_username"),
      },
    ]}
    normalize={(value) => {
      return value ? value.replace(/[.,!? ]/g, '') : '';
    }}
  >
    <Input
      prefix={<IoPerson />}
      placeholder={t("enter_username")}
      onChange={() => setUsernameError("")} 
    />
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
      normalize={(value) => {
        return value ? value.replace(/[.,!? ]/g, '') : '';
      }}
    >
      <Input.Password  prefix={<IoMdLock />} className='login_input'  placeholder={t("enter_new_password")} autoComplete="new-password"/>
    </Form.Item>

     <Form.Item
      wrapperCol={{
        span: 24,
      }}
      
    >
      <Button loading={loading} className='btn_form' htmlType="submit">
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
      <Modal open={open} closable={false} footer={null} onCancel={()=>{}}
        
        width={{
          xs: '90%',
          sm: '80%',
          md: '60%',
          lg: '50%',
          xl: '40%',
          xxl: '30%',
        }}
        >
  <div className='code_verify_box'>
    <h2>{t("sended_code")}</h2>
    
   <Form
              form={codeForm}
              onFinish={handleFinish}
              labelCol={{ span: 24 }}
              wrapperCol={{ span: 24 }}
              autoComplete="off"
            >
              <Form.Item name="code" rules={[{ required: true, message: '' }]}>
                <Input.OTP
                  className="teg_code_input"
                  length={4}
                  formatter={(str) => str.toUpperCase()}
                />
              </Form.Item>
              <Form.Item
      wrapperCol={{
        span: 24,
      }}
    >
      <Button className='btn_form'  loading={loading} htmlType="submit">
        {t("register")}
      </Button>
        <Button className='btn_form btn_form_cencel' htmlType="button" onClick={()=>{setopen(false); codeForm.resetFields(['code'])}} style={{marginLeft:"10px"}}>
        {t("retry_send")}
      </Button>
    </Form.Item>
   
            </Form>
  </div>
      </Modal>
    </div>
  )
}
