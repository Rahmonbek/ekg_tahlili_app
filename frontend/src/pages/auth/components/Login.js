import { Button, Form, Input } from 'antd'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next';
import login_img from '../../../images/login1.png'
import { IoMdLock } from 'react-icons/io';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../../../host/requests/AuthRequest';
import { dangerAlert, successAlert } from '../../../tools/Alerts';
import { useStore } from '../../../store/Store';
import { IoPerson } from 'react-icons/io5';
import Cookies from "js-cookie";
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

export default function Login() {
  const [loading, setloading] = useState(false);
  const { setuser_id } = useStore();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // reCAPTCHA hooki
  const { executeRecaptcha } = useGoogleReCaptcha();

  const onFinish = async (val) => {
    // reCAPTCHA yuklanganini tekshirish
    if (!executeRecaptcha) {
      dangerAlert("reCAPTCHA hali tayyor emas, iltimos biroz kuting.");
      return;
    }

    try {
      setloading(true);

      // 1. reCAPTCHA tokenni olish (fonda, foydalanuvchiga bildirmasdan)
      const token = await executeRecaptcha('login_action');

      // 2. Login so'rovi (token bilan birga)
      const res = await login({
        username: val.username,
        password: val.password,
        recaptchaToken: token
      });

      if (res.status === 200) {
        successAlert(t(res.data.message));

        // Tokenni saqlash
        Cookies.set("NMED_token", res.data.token, {
          expires: 1,
          path: "/",
          secure: true,
          sameSite: 'strict'
        });

        // Foydalanuvchi ID sini storega yozish
        setuser_id(res.data.userId);

        // Kabinetga yo'naltirish
        navigate('/cabinet');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message;

      // 1. Kiberxavfsizlik: Foydalanuvchi topilmaganda yoki parol xato bo'lganda 
      // bir xil umumiy xabar ko'rsatish (Obfuscation)
      if (errorMsg === 'user_not_find' || errorMsg === 'invalid_password') {
        dangerAlert(t("login_or_password_incorrect"));
      }

      // 2. Email tasdiqlanmagan bo'lsa, xavfsizlikka zarar etkazmagan holda yo'naltirish
      else if (errorMsg === 'email_not_verified') {
        dangerAlert(t("please_verify_email"));
        navigate('/register');
      }

      // 3. Klinika faollashtirilmagan (admin bo'lmagan xodimlar uchun)
      else if (errorMsg === 'clinic_not_active') {
        dangerAlert(t("clinic_not_active_login"));
      }

      // 4. Brute-force himoyasi (Backenddan keladigan blok xabari)
      else if (errorMsg === 'too_many_attempts') {
        dangerAlert(t("account_temporarily_locked"));
      }

      // 5. Boshqa kutilmagan xatoliklar
      else {
        dangerAlert(t("something_went_wrong_try_again"));
      }

    } finally {
      setloading(false);
    }
  };

  return (
    <div className='login_box'>
      <div className='login_form_box'>
        <div className='login_form'>
          <h1>{t("ymed_login")}</h1>
          <div className='login_form_form'>
            <Form
              name="user_profile_form"
              id="login-form"

              onFinish={onFinish}
              layout="vertical"
              component="form" // Brauzer formani tanishi uchun muhim
            >
              <Form.Item
                name="username"
                label={t("username")}
                rules={[{ required: true, message: t("please_enter_username") }]}
              >
                <Input
                  name="username" // Qo'shildi
                  autoComplete="username" // Qo'shildi
                  prefix={<IoPerson />}
                  className='login_input'
                  placeholder={t("enter_username")}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={t("password")}
                rules={[{ required: true, message: t("please_enter_password") }]}
              >
                <Input.Password
                  name="password" // Qo'shildi
                  autoComplete="current-password" // Qo'shildi 
                  prefix={<IoMdLock />}
                  className='login_input'
                  placeholder={t("enter_password")}
                />
              </Form.Item>

              <Form.Item wrapperCol={{ span: 24 }}>
                <Button
                  className='btn_form'
                  loading={loading}
                  htmlType="submit" // Brauzerga "yuborish" signali
                >
                  {t("login")}
                </Button>
              </Form.Item>
            </Form>
          </div>
        </div>
        <div className="login_bottom">
          <p dangerouslySetInnerHTML={{ __html: t("not_have_account") }} />
          <Link to={"/register"}>{t("register_a")}</Link>
        </div>
      </div>
      <div className='login_img'>
        <img src={login_img} alt="login decorative" />
      </div>
    </div>
  );
}