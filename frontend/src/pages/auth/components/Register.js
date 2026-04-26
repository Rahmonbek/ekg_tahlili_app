import { Button, Form, Input, Modal } from 'antd';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import register_img from '../../../images/register1.png';
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

  // 1. OTP Tasdiqlash
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
        Cookies.set("NMED_token", res.data.token, {
          expires: 1,
          path: "/",
          secure: true,
          sameSite: 'strict'
        });
        navigate('/');
      }
    } catch (err) {
      dangerAlert(t(err?.response?.data?.message || "error"));
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

      // reCAPTCHA tokenni olish
      const gToken = await executeRecaptcha('registration');

      // Username tekshirish
      const checkRes = await checkusername({ username: val.username });
      if (checkRes.data.exists) {
        dangerAlert(t("username_already_exists"));
        return;
      }

      setemail(val.email);

      // ✅ FIX: "captchaToken" emas — "recaptchaToken" (backend RegisterDto.RecaptchaToken bilan mos)
      const res = await registration({
        email: val.email,
        password: val.password,
        username: val.username,
        recaptchaToken: gToken
      });

      if (res.status === 200) {
        successAlert(t(res.data.message));
        setopen(true);
      }
    } catch (err) {
      dangerAlert(t(err?.response?.data?.message || "registration_failed"));
    } finally {
      setloading(false);
    }
  };

  return (
    <div className='login_box'>
      {/* ── Chap: Forma ─────────────────────────────────── */}
      <div className='login_form_box'>
        <div className='login_form'>
          <h1>{t("ymed_register")}</h1>
          <div className='login_form_form'>
            <Form
              name="register_form"
              layout="vertical"
              onFinish={onFinish}
              form={form}
              component="form"
            >
              <Form.Item
                name="email"
                label={t("email")}
                rules={[
                  { required: true, message: t("not_empty") },
                  { type: 'email', message: t("invalid_email") }
                ]}
              >
                <Input
                  name="email"
                  autoComplete="email"
                  prefix={<IoIosMail />}
                  className='login_input'
                  placeholder={t("enter_email")}
                />
              </Form.Item>

              <Form.Item
                name="username"
                label={t("username")}
                rules={[{ required: true, message: t("not_empty") }]}
              >
                <Input
                  name="username"
                  autoComplete="username"
                  prefix={<IoPerson />}
                  className='login_input'
                  placeholder={t("enter_username")}
                />
              </Form.Item>

              {/* O'zMSt 841:2026: Parol murakkabligi talabi */}
              <Form.Item
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
                <Input.Password
                  name="password"
                  autoComplete="new-password"
                  prefix={<IoMdLock />}
                  className='login_input'
                  placeholder={t("enter_new_password")}
                />
              </Form.Item>

              <Form.Item wrapperCol={{ span: 24 }}>
                <Button
                  className='btn_form'
                  loading={loading}
                  htmlType="submit"
                >
                  {t("register")}
                </Button>
              </Form.Item>
            </Form>
          </div>
        </div>

        <div className="login_bottom">
          <p dangerouslySetInnerHTML={{ __html: t("have_account") }} />
          <Link to={"/"}>{t("login_a")}</Link>
        </div>
      </div>

      {/* ── O'ng: Rasm ──────────────────────────────────── */}
      <div className='login_img'>
        <img src={register_img} alt="register decorative" />
      </div>

      {/* ── OTP Modal ───────────────────────────────────── */}
      <Modal
        open={open}
        closable={false}
        maskClosable={false}
        footer={null}
        centered
      >
        <div className='code_verify_box' style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{
            fontSize: 48,
            marginBottom: 12,
            lineHeight: 1
          }}>📧</div>
          <h2 style={{
            color: '#2C3E6B',
            fontWeight: 700,
            fontSize: 18,
            marginBottom: 8
          }}>
            {t("sended_code")}
          </h2>
          <p style={{ color: '#666', fontSize: 13, marginBottom: 20 }}>
            {email}
          </p>
          <Form form={codeForm} onFinish={handleFinish}>
            <Form.Item
              name="code"
              rules={[{ required: true, message: t("not_empty") }]}
            >
              <Input.OTP length={4} size="large" />
            </Form.Item>
            <Button
              className='btn_form'
              loading={loading}
              htmlType="submit"
              block
            >
              {t("verify")}
            </Button>
          </Form>
        </div>
      </Modal>
    </div>
  );
}
