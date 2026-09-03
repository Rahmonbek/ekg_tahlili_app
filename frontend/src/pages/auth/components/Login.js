import { Button, Form, Input, Modal } from 'antd'
import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next';
import login_img from '../../../images/login1.jpg'
import { IoMdLock } from 'react-icons/io';
import { FaShieldHalved } from 'react-icons/fa6';
import { Link, useNavigate } from 'react-router-dom';
import { login, verify_code, send_reset_code } from '../../../host/requests/AuthRequest';
import { dangerAlert, successAlert, warningAlert } from '../../../tools/Alerts';
import { useStore } from '../../../store/Store';
import { setTokenAccess } from '../../../host/Host';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import PhoneInput from '../../../components/shared/PhoneInput';
import { formatPhoneNumber } from '../../../tools/formatters';
import ChangeLangs from '../../../components/ChangeLangs';

// SMS kodni qayta yuborish orasidagi kutish (soniya) — Register bilan bir xil
const RESEND_SECONDS = 60;

export default function Login() {
  const [loading, setloading] = useState(false);
  const { setuser_id } = useStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { executeRecaptcha } = useGoogleReCaptcha();

  // Tasdiqlanmagan hisob uchun login sahifasidagi SMS tasdiqlash oynasi
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resend, setResend] = useState(0);
  const [phone, setPhone] = useState(null);
  const timerRef = useRef(null);
  const [codeForm] = Form.useForm();

  useEffect(() => () => clearInterval(timerRef.current), []);

  // Sessiya tugagani sababli bu yerga qaytarilgan bo'lsa, sababini
  // aytamiz — aks holda foydalanuvchi "nega meni chiqarib yubordi?"
  // degan savol bilan qoladi. Xabar bir marta ko'rsatiladi va
  // manzildagi belgi tozalanadi (sahifa yangilansa takrorlanmasin).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('session') !== 'expired') return;

    warningAlert(t('session_expired', {
      defaultValue: "Sessiya muddati tugadi. Iltimos, qaytadan kiring."
    }));
    window.history.replaceState(null, '', window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startResendTimer = () => {
    setResend(RESEND_SECONDS);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResend((s) => {
        if (s <= 1) { clearInterval(timerRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  const closeVerify = () => {
    setVerifyOpen(false);
    setResend(0);
    clearInterval(timerRef.current);
    codeForm.resetFields();
  };

  const applyLoginSuccess = (data) => {
    // Cookie muddati backenddagi token muddati bilan bir joydan olinadi
    // (`Host.js: TOKEN_TTL_HOURS`, hozir 3 soat)
    setTokenAccess(data.token);
    setuser_id(data.userId);

    if (data.mustChangePassword) {
      warningAlert(t('must_change_password', {
        defaultValue: "Xavfsizlik uchun vaqtinchalik parolni o'zingiznikiga almashtiring."
      }));
      navigate('/profile?changePassword=1');
      return;
    }
    navigate('/cabinet');
  };

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
        applyLoginSuccess(res.data);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message;

      if (errorMsg === 'user_not_found' || errorMsg === 'user_not_find' || errorMsg === 'invalid_password') {
        dangerAlert(t("login_or_password_incorrect"));
      } else if (errorMsg === 'phone_not_verified') {
        // Hisob tasdiqlanmagan, lekin parol to'g'ri — backend kodni qayta
        // yubordi. Tupikка (/register) otish o'rniga shu yerda tasdiqlash
        // oynasini ochamiz.
        setPhone(formatPhoneNumber(val.phone));
        setVerifyOpen(true);
        startResendTimer();
        warningAlert(t("please_verify_phone"));
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

  const handleVerify = async (values) => {
    try {
      setVerifyLoading(true);
      const res = await verify_code({ phoneNumber: phone, code: values.code });
      if (res.status === 200) {
        clearInterval(timerRef.current);
        successAlert(t(res.data.message));
        applyLoginSuccess(res.data);
      }
    } catch (err) {
      dangerAlert(t(err?.response?.data?.message || 'error'));
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResend = async () => {
    if (resend > 0 || resendLoading) return;
    try {
      setResendLoading(true);
      await send_reset_code({ phoneNumber: phone });
      codeForm.resetFields();
      startResendTimer();
      successAlert(t('code_resent', { defaultValue: 'Kod qayta yuborildi' }));
    } catch (err) {
      dangerAlert(t(err?.response?.data?.message || 'something_went_wrong_try_again'));
    } finally {
      setResendLoading(false);
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

      <Modal
        open={verifyOpen}
        closable={false}
        maskClosable={false}
        footer={null}
        centered
        width={420}
        className='sms-verify-modal'
      >
        <div className='sms-verify'>
          <span className='reset-modal-badge sms-verify-badge'>
            <FaShieldHalved />
          </span>
          <h2 className='sms-verify-title'>
            {t('verification_code', { defaultValue: 'Tasdiqlash kodi' })}
          </h2>
          <p className='sms-verify-hint'>
            {t('sms_sent_hint', { defaultValue: 'Ushbu raqamga 4 xonali kod yuborildi' })}
          </p>
          <div className='sms-verify-phone'>+{phone}</div>

          <Form form={codeForm} onFinish={handleVerify} className='sms-verify-form'>
            <Form.Item
              name='code'
              rules={[{ required: true, message: t('not_empty') }]}
              style={{ marginBottom: 0 }}
            >
              <Input.OTP
                length={4}
                size='large'
                inputMode='numeric'
                autoFocus
                formatter={(v) => v.replace(/\D/g, '')}
                onChange={(val) => { if (val?.length === 4) codeForm.submit(); }}
              />
            </Form.Item>

            <div className='reset-modal-resend sms-verify-resend'>
              {resend > 0 ? (
                <span className='reset-modal-resend-wait'>
                  {t('resend_in', { seconds: resend, defaultValue: 'Qayta yuborish: {{seconds}} s' })}
                </span>
              ) : (
                <button
                  type='button'
                  className='reset-modal-link'
                  onClick={handleResend}
                  disabled={resendLoading}
                >
                  {resendLoading
                    ? t('sending', { defaultValue: 'Yuborilmoqda…' })
                    : t('resend_code', { defaultValue: 'Kodni qayta yuborish' })}
                </button>
              )}
            </div>

            <Button className='btn_form' loading={verifyLoading} htmlType='submit' block>
              {t('verify')}
            </Button>
            <button
              type='button'
              className='reset-modal-link reset-modal-back'
              onClick={closeVerify}
            >
              {t('cancel', { defaultValue: 'Bekor qilish' })}
            </button>
          </Form>
        </div>
      </Modal>
    </div>
  );
}
