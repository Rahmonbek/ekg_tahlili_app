import { Button, Form, Input, Modal } from 'antd';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import register_img from '../../../images/register1.png';
import { IoMdLock } from 'react-icons/io';
import { Link, useNavigate } from 'react-router-dom';
import { checkClinicInn, checkphone, registration, verify_code } from '../../../host/requests/AuthRequest';
import { dangerAlert, successAlert } from '../../../tools/Alerts';
import { useStore } from '../../../store/Store';
import Cookies from "js-cookie";
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import PhoneInput from '../../../components/shared/PhoneInput';
import { formatPhoneNumber } from '../../../tools/formatters';

export default function Register() {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [open, setopen] = useState(false);
  const [loading, setloading] = useState(false);
  const [phone, setPhone] = useState(null);
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { setuser_id } = useStore();
  const [codeForm] = Form.useForm();
  const { t } = useTranslation();

  const handleFinish = async (values) => {
    try {
      setloading(true);
      const res = await verify_code({
        phoneNumber: phone,
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
        navigate('/cabinet');
      }
    } catch (err) {
      dangerAlert(t(err?.response?.data?.message || "error"));
    } finally {
      setloading(false);
    }
  };

  const onFinish = async (val) => {
    if (!executeRecaptcha) {
      dangerAlert(t("recaptcha_not_ready"));
      return;
    }

    try {
      setloading(true);
      const normalizedPhone = formatPhoneNumber(val.phone);
      const normalizedInn = String(val.clinicInn || '').replace(/\D/g, '');

      const innRes = await checkClinicInn({ clinicInn: normalizedInn });
      if (innRes.data.exists) {
        dangerAlert(t("clinic_already_registered"));
        return;
      }

      const phoneRes = await checkphone({ phone: normalizedPhone });
      if (phoneRes.data.exists) {
        dangerAlert(t("phone_already_exists"));
        return;
      }

      const gToken = await executeRecaptcha('registration');
      const res = await registration({
        phoneNumber: normalizedPhone,
        clinicInn: normalizedInn,
        password: val.password,
        recaptchaToken: gToken
      });

      if (res.status === 200) {
        setPhone(normalizedPhone);
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
                name="clinicInn"
                label={t("clinic_inn")}
                rules={[
                  { required: true, message: t("clinic_inn_required") },
                  { len: 9, message: t("clinic_inn_invalid") }
                ]}
                normalize={(value) => value ? value.replace(/\D/g, '') : ''}
              >
                <Input
                  inputMode="numeric"
                  maxLength={9}
                  className='login_input'
                  placeholder={t("enter_clinic_inn")}
                />
              </Form.Item>

              <Form.Item
                name="phone"
                label={t("phone_number")}
                rules={[{ required: true, message: t("phone_required") }, { len: 19, message: t("phone_number_invalid") }]}
              >
                <PhoneInput autoComplete="tel" />
              </Form.Item>

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
                <Button className='btn_form' loading={loading} htmlType="submit">
                  {t("register")}
                </Button>
              </Form.Item>
            </Form>
          </div>
        </div>

        <div className="login_bottom">
          <p dangerouslySetInnerHTML={{ __html: t("have_account") }} />
          <Link to={"/login"}>{t("login_a")}</Link>
        </div>
      </div>

      <div className='login_img'>
        <img src={register_img} alt="register decorative" />
      </div>

      <Modal open={open} closable={false} maskClosable={false} footer={null} centered>
        <div className='code_verify_box' style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: 42, marginBottom: 12, lineHeight: 1 }}>SMS</div>
          <h2 style={{ color: '#2C3E6B', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
            {t("sended_code")}
          </h2>
          <p style={{ color: '#666', fontSize: 13, marginBottom: 20 }}>
            +{phone}
          </p>
          <Form form={codeForm} onFinish={handleFinish}>
            <Form.Item name="code" rules={[{ required: true, message: t("not_empty") }]}>
              <Input.OTP length={4} size="large" />
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
