import { Button, Form, Input, Modal } from 'antd'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next';
import login_img from '../../../images/login1.png'
import { IoMdLock } from 'react-icons/io';
import { Link, useNavigate } from 'react-router-dom';
import { change_password, login, send_reset_code } from '../../../host/requests/AuthRequest';
import { dangerAlert, successAlert } from '../../../tools/Alerts';
import { useStore } from '../../../store/Store';
import Cookies from "js-cookie";
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import PhoneInput from '../../../components/shared/PhoneInput';
import { formatPhoneNumber } from '../../../tools/formatters';

export default function Login() {
  const [loading, setloading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [resetPhone, setResetPhone] = useState(null);
  const { setuser_id } = useStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [resetForm] = Form.useForm();

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

  const sendResetCode = async () => {
    try {
      const values = await resetForm.validateFields(['phone']);
      setResetLoading(true);
      const phone = formatPhoneNumber(values.phone);
      const res = await send_reset_code({ phoneNumber: phone });
      setResetPhone(phone);
      setResetCodeSent(true);
      successAlert(t(res.data.message));
    } catch (err) {
      if (err?.errorFields) return;
      dangerAlert(t(err?.response?.data?.message || "something_went_wrong_try_again"));
    } finally {
      setResetLoading(false);
    }
  };

  const resetPassword = async (values) => {
    try {
      setResetLoading(true);
      const res = await change_password({
        phoneNumber: resetPhone || formatPhoneNumber(values.phone),
        code: values.code,
        newPassword: values.newPassword
      });
      successAlert(t(res.data.message));
      setResetOpen(false);
      setResetCodeSent(false);
      resetForm.resetFields();
    } catch (err) {
      dangerAlert(t(err?.response?.data?.message || "something_went_wrong_try_again"));
    } finally {
      setResetLoading(false);
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
              component="form"
            >
              <Form.Item
                name="phone"
                label={t("phone_number")}
                rules={[{ required: true, message: t("phone_required") }, { len: 19, message: t("phone_number_invalid") }]}
              >
                <PhoneInput autoComplete="tel" />
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
                <button type="button" onClick={() => setResetOpen(true)}>
                  {t("reset_password")}
                </button>
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

      <Modal open={resetOpen} footer={null} centered onCancel={() => setResetOpen(false)} title={t("reset_password")}>
        <Form form={resetForm} layout="vertical" onFinish={resetPassword}>
          <Form.Item
            name="phone"
            label={t("phone_number")}
            rules={[{ required: true, message: t("phone_required") }, { len: 19, message: t("phone_number_invalid") }]}
          >
            <PhoneInput disabled={resetCodeSent} />
          </Form.Item>

          {!resetCodeSent ? (
            <Button className="btn_form" loading={resetLoading} onClick={sendResetCode} block>
              {t("send_code")}
            </Button>
          ) : (
            <>
              <Form.Item name="code" label={t("verification_code")} rules={[{ required: true, message: t("not_empty") }]}>
                <Input.OTP length={4} />
              </Form.Item>
              <Form.Item
                name="newPassword"
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
                <Input.Password prefix={<IoMdLock />} placeholder={t("enter_new_password")} />
              </Form.Item>
              <Button className="btn_form" loading={resetLoading} htmlType="submit" block>
                {t("save")}
              </Button>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
}
