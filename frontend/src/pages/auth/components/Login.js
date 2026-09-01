import { Button, Form, Input } from 'antd'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next';
import login_img from '../../../images/login1.jpg'
import { IoMdLock } from 'react-icons/io';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../../../host/requests/AuthRequest';
import { dangerAlert, successAlert, warningAlert } from '../../../tools/Alerts';
import { useStore } from '../../../store/Store';
import Cookies from "js-cookie";
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import PhoneInput from '../../../components/shared/PhoneInput';
import { formatPhoneNumber } from '../../../tools/formatters';
import ChangeLangs from '../../../components/ChangeLangs';

export default function Login() {
  const [loading, setloading] = useState(false);
  const { setuser_id } = useStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { executeRecaptcha } = useGoogleReCaptcha();

  const onFinish = async (val) => {
    if (!executeRecaptcha) {
      dangerAlert(t("recaptcha_not_ready"));
      return;
    }

    try {
      setloading(true);
      const token = await executeRecaptcha('login_action');
      const res = await login({
        phoneNumber: formatPhoneNumber(val.phone),
        password: val.password,
        recaptchaToken: token
      });

      if (res.status === 200) {
        successAlert(t(res.data.message));
        Cookies.set("NMED_token", res.data.token, {
          expires: 1,
          path: "/",
          secure: true,
          sameSite: 'strict'
        });
        setuser_id(res.data.userId);

        // Admin yaratgan vaqtinchalik parol hali almashtirilmagan bo'lsa,
        // foydalanuvchi darhol parol almashtirish sahifasiga tushadi.
        // Bunday parolni kamida ikki kishi biladi — admin va xodim (T-022).
        if (res.data.mustChangePassword) {
            warningAlert(t('must_change_password', {
                defaultValue: "Xavfsizlik uchun vaqtinchalik parolni o'zingiznikiga almashtiring."
            }));
            navigate('/profile?changePassword=1');
            return;
        }

        navigate('/cabinet');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message;

      if (errorMsg === 'user_not_found' || errorMsg === 'user_not_find' || errorMsg === 'invalid_password') {
        dangerAlert(t("login_or_password_incorrect"));
      } else if (errorMsg === 'phone_not_verified') {
        dangerAlert(t("please_verify_phone"));
        navigate('/register');
      } else if (errorMsg === 'clinic_not_active') {
        dangerAlert(t("clinic_not_active_login"));
      } else if (errorMsg === 'too_many_attempts') {
        dangerAlert(t("account_temporarily_locked"));
      } else {
        dangerAlert(t(errorMsg || "something_went_wrong_try_again"));
      }
    } finally {
      setloading(false);
    }
  };

  return (
    <div className='login_box'>
      <div className='login_form_box'>
        {/* Til almashtirgich: brauzeri boshqa tilda bo'lgan foydalanuvchi
            kirishdan OLDIN tilni tanlay olishi kerak — ilgari u faqat
            kabinet ichida bor edi */}
        <div className='auth_lang'>
          <ChangeLangs />
        </div>
        <div className='login_form'>
          <h1>{t("ymed_login")}</h1>
          <div className='login_form_form'>
            <Form
              name="user_profile_form"
              id="login-form"
              onFinish={onFinish}
              layout="vertical"
              component="form"
            >
              <Form.Item
                name="phone"
                label={t("phone_number")}
                rules={[{ required: true, message: t("phone_required") }, { len: 19, message: t("phone_number_invalid") }]}
              >
                <PhoneInput autoComplete="tel" withIcon />
              </Form.Item>

              <Form.Item
                name="password"
                label={t("password")}
                rules={[{ required: true, message: t("please_enter_password") }]}
              >
                <Input.Password
                  name="password"
                  autoComplete="current-password"
                  prefix={<IoMdLock />}
                  className='login_input'
                  placeholder={t("enter_password")}
                />
              </Form.Item>

              <div className="reset_pass_text">
                <Link to="/reset-password">{t("reset_password")}</Link>
              </div>

              <Form.Item wrapperCol={{ span: 24 }}>
                <Button className='btn_form' loading={loading} htmlType="submit">
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
