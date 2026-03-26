import { Button, Form, Input, Modal } from 'antd';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import login_img from '../../../images/doctor2.svg';
import { IoIosMail, IoMdLock } from 'react-icons/io';
import { Link, useNavigate } from 'react-router-dom';
import { checkusername, registration, verify_code } from '../../../host/requests/AuthRequest';
import { dangerAlert, successAlert } from '../../../tools/Alerts';
import { useStore } from '../../../store/Store';
import { IoPerson } from 'react-icons/io5';
import Cookies from "js-cookie";
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

export default function Register() {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [open, setopen] = useState(false);
  const [loading, setloading] = useState(false);
  const [email, setemail] = useState(null);
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { setuser_id } = useStore();
  const [codeForm] = Form.useForm();
  const { t } = useTranslation();

  // 1. OTP Tasdiqlash (Brute-force himoyasi bilan)
  const handleFinish = async (values) => {
    try {
      setloading(true);
      const res = await verify_code({
        email: email,
        code: values.code
      });
      if (res.status === 200) {
        successAlert(t(res.data.message));
        setuser_id(res.data.userId);
        // Kiberxavfsizlik: XSS dan himoya uchun Secure va SameSite flaglari
        Cookies.set("NMED_token", res.data.token, {
          expires: 1,
          path: "/",
          secure: true, 
          sameSite: 'strict'
        });
        navigate('/');
      }
    } catch (err) {
      dangerAlert(t(err?.response?.data?.message || "Error"));
    } finally {
      setloading(false);
    }
  };

  // 2. Ro'yxatdan o'tish (reCAPTCHA v3 bilan)
  const onFinish = async (val) => {
    if (!executeRecaptcha) {
      dangerAlert(t("recaptcha_not_ready"));
      return;
    }

    try {
      setloading(true);

      // reCAPTCHA tokenni olish (Botlardan himoya)
      const gToken = await executeRecaptcha('registration');

      const checkRes = await checkusername({ username: val.username });

      if (checkRes.status === 200 && !checkRes.data.exists) {
        setemail(val.email);

        const res = await registration({
          email: val.email,
          password: val.password,
          username: val.username,
          captchaToken: gToken // Backend buni tekshirishi shart
        });

        if (res.status === 200) {
          successAlert(t(res.data.message));
          setopen(true);
        }
      } else {
        dangerAlert(t("username_exists"));
      }
    } catch (err) {
      dangerAlert(t(err?.response?.data?.message || "registration_failed"));
    } finally {
      setloading(false);
    }
  };

  return (
    <div className='login_box'>
      <div className='login_form_box'>
        <div className='login_form'>
          <h1>{t("ymed_register")}</h1>
          <div className='login_form_form'>
            <Form name="basic" layout="vertical" onFinish={onFinish} form={form}>
              
              <Form.Item
                name="email"
                label={t("email")}
                rules={[{ type: 'email', message: t("invalid_email") }, { required: true }]}
              >
                <Input autoComplete='new-password' prefix={<IoIosMail />} placeholder={t("enter_email")} />
              </Form.Item>

              <Form.Item
                name="username"
                label={t("username")}
                rules={[{ required: true }]}
              >
                <Input autoComplete='new-password' prefix={<IoPerson />} placeholder={t("enter_username")} />
              </Form.Item>

              {/* O‘zMSt 841:2026: Parol murakkabligi talabi */}
              <Form.Item
              className='new-password'
                name="password"
                label={t("new_password")}
                rules={[
                  { required: true, message: t("please_enter_password") },
                  { 
                    min: 8,
                    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
                    message: t("password_complexity_error") 
                  }
                ]}
              >
                <Input.Password autoComplete='new-password' prefix={<IoMdLock />} placeholder={t("enter_new_password")} />
              </Form.Item>

              <Button loading={loading} className='btn_form' block htmlType="submit" type="primary">
                {t("register")}
              </Button>
            </Form>
          </div>
        </div>
      </div>

      {/* OTP Modal */}
      <Modal open={open} closable={false} footer={null}>
        <div className='code_verify_box' style={{ textAlign: 'center' }}>
          <h2>{t("sended_code")}</h2>
          <Form form={codeForm} onFinish={handleFinish}>
            <Form.Item name="code" rules={[{ required: true }]}>
              <Input.OTP length={4} />
            </Form.Item>
            <Button className='btn_form' loading={loading} htmlType="submit" block>
              {t("verify")}
            </Button>
          </Form>
        </div>
      </Modal>
    </div>
  );
}