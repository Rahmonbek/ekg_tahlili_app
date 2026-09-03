import { Checkbox, Button, Col, Form, Input, Modal, Row } from 'antd';
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import register_img from '../../../images/register1.jpg';
import { IoMdLock } from 'react-icons/io';
import { LiaDownloadSolid } from 'react-icons/lia';
import { FaShieldHalved } from 'react-icons/fa6';
import { Link, useNavigate } from 'react-router-dom';
import { registration, verify_code } from '../../../host/requests/AuthRequest';
import { dangerAlert, successAlert } from '../../../tools/Alerts';
import { useStore } from '../../../store/Store';
import { setTokenAccess } from '../../../host/Host';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import PhoneInput from '../../../components/shared/PhoneInput';
import { formatPhoneNumber } from '../../../tools/formatters';
import ChangeLangs from '../../../components/ChangeLangs';
import PasswordField, { passwordRule } from '../../../components/shared/PasswordField';

// SMS kodni qayta yuborish orasidagi kutish (soniya) — ResetPassword bilan bir xil
const RESEND_SECONDS = 60;

export default function Register() {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [open, setopen] = useState(false);
  const [loading, setloading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resend, setResend] = useState(0);
  const timerRef = useRef(null);
  const [phone, setPhone] = useState(null);
  const [licenseFile, setLicenseFile] = useState(null);
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { setuser_id } = useStore();
  const [codeForm] = Form.useForm();
  const { t } = useTranslation();

  // Countdown timerni tozalash (modal yopilganda/unmount)
  useEffect(() => () => clearInterval(timerRef.current), []);

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

  const closeModal = () => {
    setopen(false);
    setResend(0);
    clearInterval(timerRef.current);
    codeForm.resetFields();
  };

  const handleFinish = async (values) => {
    try {
      setloading(true);
      const res = await verify_code({
        phoneNumber: phone,
        code: values.code
      });
      if (res.status === 200) {
        clearInterval(timerRef.current);
        successAlert(t(res.data.message));
        setuser_id(res.data.userId);
        // Cookie muddati backend token muddati bilan bir joydan
        // (`Host.js: TOKEN_TTL_HOURS`, hozir 3 soat)
        setTokenAccess(res.data.token);
        navigate('/cabinet');
      }
    } catch (err) {
      dangerAlert(t(err?.response?.data?.message || 'error'));
    } finally {
      setloading(false);
    }
  };

  // Registratsiya so'rovi — dastlabki yuborish va qayta yuborish (resend)
  // uchun umumiy. Pending (hali tasdiqlanmagan) foydalanuvchi uchun backend
  // yangi SMS kod generatsiya qiladi, shu bois resend ham shu yo'l bilan ishlaydi.
  const submitRegistration = async (values) => {
    const gToken = await executeRecaptcha('registration');
    const normalizedPhone = formatPhoneNumber(values.phone);
    const normalizedInn = String(values.clinicInn || '').replace(/\D/g, '');

    const formData = new FormData();
    formData.append('clinicName', values.clinicName?.trim() || '');
    formData.append('phoneNumber', normalizedPhone);
    formData.append('clinicInn', normalizedInn);
    formData.append('bankAccaunt', values.bankAccaunt?.replace(/\s/g, '') || '');
    // Haqiqiy email bo'lsa uni yuboramiz — busiz tizim
    // `...@phone.nmed.local` sun'iy manzilini yaratadi
    if (values.email) formData.append('email', values.email);
    formData.append('mfo', values.mfo?.trim() || '');
    formData.append('bankName', values.bankName?.trim() || '');
    formData.append('password', values.password);
    formData.append('recaptchaToken', gToken);
    formData.append('licenseFile', licenseFile);

    const res = await registration(formData);
    return { res, normalizedPhone };
  };

  const handleResend = async () => {
    if (resend > 0 || resendLoading) return;
    if (!executeRecaptcha) {
      dangerAlert(t('recaptcha_not_ready'));
      return;
    }
    try {
      setResendLoading(true);
      const { res } = await submitRegistration(form.getFieldsValue(true));
      if (res.status === 200) {
        codeForm.resetFields();
        startResendTimer();
        successAlert(t('code_resent', { defaultValue: 'Kod qayta yuborildi' }));
      }
    } catch (err) {
      dangerAlert(t(err?.response?.data?.message || 'something_went_wrong_try_again'));
    } finally {
      setResendLoading(false);
    }
  };

  const onFinish = async (values) => {
    if (!executeRecaptcha) {
      dangerAlert(t('recaptcha_not_ready'));
      return;
    }

    if (!licenseFile) {
      dangerAlert(t('license_file_required'));
      return;
    }

    try {
      setloading(true);
      const { res, normalizedPhone } = await submitRegistration(values);

      if (res.status === 200) {
        setPhone(normalizedPhone);
        successAlert(t(res.data.message));
        setopen(true);
        startResendTimer();
      }
    } catch (err) {
      dangerAlert(t(err?.response?.data?.message || 'registration_failed'));
    } finally {
      setloading(false);
    }
  };

  return (
    <div className='login_box register_page'>
      <div className='login_form_box'>
        {/* Ro'yxatdan o'tishdan oldin ham til tanlanadi */}
        <div className='auth_lang'>
          <ChangeLangs />
        </div>
        <div className='login_form'>
          <h1>{t('clinic_admin_register_title')}</h1>
          <p className='mini_title'>{t('clinic_admin_register_desc')}</p>
          <div className='login_form_form'>
         

            <Form
              name='register_form'
              layout='vertical'
              onFinish={onFinish}
              form={form}
              component='form'
            >
              <div className='register_section_title'>{t('clinic_info')}</div>
              <Row gutter={12}>
                <Col span={24}>
                  <Form.Item
                    name='clinicName'
                    label={t('clinic_name')}
                    rules={[{ required: true, message: t('clinic_name_required') }]}
                  >
                    <Input className='login_input' placeholder={t('enter_clinic_name')} maxLength={200} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name='clinicInn'
                    label={t('clinic_inn')}
                    rules={[
                      { required: true, message: t('clinic_inn_required') },
                      { len: 9, message: t('clinic_inn_invalid') }
                    ]}
                    normalize={(value) => value ? value.replace(/\D/g, '') : ''}
                  >
                    <Input
                      inputMode='numeric'
                      maxLength={9}
                      className='login_input'
                      placeholder={t('enter_clinic_inn')}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name='licenseFileName'
                    label={t('license')}
                    rules={[{ required: true, message: t('license_file_required') }]}
                  >
                    <div className='file-input-wrapper'>
                      <Input
                        readOnly
                        className='login_input'
                        value={licenseFile?.name || ''}
                        placeholder={t('select_license_file')}
                        suffix={<LiaDownloadSolid />}
                      />
                      <input
                        className='hidden-file-input'
                        type='file'
                        accept='.pdf,.jpg,.jpeg,.png'
                        onChange={(event) => {
                          const file = event.target.files?.[0] || null;
                          setLicenseFile(file);
                          form.setFieldValue('licenseFileName', file?.name || '');
                        }}
                      />
                    </div>
                  </Form.Item>
                </Col>

                {/* Uch bank maydoni keng ekranda bitta qatorga sig'adi —
                    ilgari ular ikki qator egallab, formani uzaytirardi */}
                <Col xs={24} md={8}>
                  <Form.Item
                    name='bankAccaunt'
                    label={t('bank_account')}
                    // To'lov bosqichida kerak, ro'yxatdan o'tishda emas (T-073)
                    normalize={(value) => {
    if (!value) return '';

    return value
        .replace(/\D/g, '')
        .slice(0, 20)
        .replace(/(\d{4})(?=\d)/g, '$1 ')
        .trim();
}}
                  >
                    <Input
                      inputMode='numeric'

                      className='login_input'
                      placeholder={t('enter_bank_account')}
                      maxLength={24}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item
                    name='mfo'
                    label={t('mfo')}
                    // To'lov bosqichida kerak, ro'yxatdan o'tishda emas (T-073)
                    normalize={(value) => value ? value.replace(/\D/g, '') : ''}
                  >
                    <Input
                      inputMode='numeric'
                      className='login_input'
                      placeholder={t('enter_mfo')}
                      maxLength={9}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name='bankName' label={t('bankName')}>
                    <Input className='login_input' placeholder={t('enter_bankName')} maxLength={200} />
                  </Form.Item>
                </Col>
              </Row>

              <div className='register_section_title'>{t('admin_info')}</div>
              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name='phone'
                    label={t('phone_number')}
                    rules={[{ required: true, message: t('phone_required') }, { len: 19, message: t('phone_number_invalid') }]}
                  >
                    <PhoneInput autoComplete='tel' />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name='password'
                    label={t('new_password')}
                    rules={[
                      { required: true, message: t('please_enter_password') },
                      // `min: 6` yetarli emas edi: `123456` ham o'tardi.
                      // Qoida endi server siyosati bilan bir xil (T-022).
                      passwordRule(t),
                    ]}
                  >
                    <PasswordField
                      name='password'
                      autoComplete='new-password'
                      className='login_input'
                      placeholder={t('enter_new_password')}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  {/* Parol xato yozilsa, foydalanuvchi buni faqat keyingi
                      kirishda bilardi (T-073) */}
                  <Form.Item
                    name='confirmPassword'
                    label={t('confirm_password')}
                    dependencies={['password']}
                    rules={[
                      { required: true, message: t('please_enter_password') },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('password') === value) return Promise.resolve();
                          return Promise.reject(new Error(t('passwords_do_not_match')));
                        },
                      }),
                    ]}
                  >
                    <Input.Password
                      autoComplete='new-password'
                      className='login_input'
                      placeholder={t('confirm_password')}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  {/* Email bo'lmasa: parolni tiklash faqat SMS orqali,
                      hisobotlarni yuborish imkonsiz, muhim bildirishnomalar
                      yetib bormaydi. Tizim `...@phone.nmed.local` ko'rinishida
                      sun'iy manzil yaratadi (T-073) */}
                  <Form.Item
                    name='email'
                    label={t('email')}
                    rules={[{ type: 'email', message: t('email_invalid') }]}
                  >
                    <Input
                      type='email'
                      autoComplete='email'
                      className='login_input'
                      placeholder={t('enter_email')}
                    />
                  </Form.Item>
                </Col>
              </Row>

              {/* Tibbiy platforma uchun shaxsiy ma'lumotlarni qayta ishlashga
                  rozilik huquqiy jihatdan zarur (T-073) */}
              <Form.Item
                name='agreement'
                valuePropName='checked'
                rules={[{
                  validator: (_, value) => value
                    ? Promise.resolve()
                    : Promise.reject(new Error(t('agreement_required'))),
                }]}
              >
                <Checkbox>{t('agreement_text')}</Checkbox>
              </Form.Item>

              <Form.Item wrapperCol={{ span: 24 }}>
                <Button className='btn_form' loading={loading} htmlType='submit'>
                  {t('register')}
                </Button>
              </Form.Item>
            </Form>
          </div>
        </div>

        <div className='login_bottom'>
          <p dangerouslySetInnerHTML={{ __html: t('have_account') }} />
          <Link to={'/login'}>{t('login_a')}</Link>
        </div>
      </div>

      <div className='login_img'>
        <img src={register_img} alt='register decorative' />
      </div>

      <Modal
        open={open}
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

          <Form form={codeForm} onFinish={handleFinish} className='sms-verify-form'>
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

            <Button className='btn_form' loading={loading} htmlType='submit' block>
              {t('verify')}
            </Button>
            <button
              type='button'
              className='reset-modal-link reset-modal-back'
              onClick={closeModal}
            >
              {t('change_number', { defaultValue: 'Raqamni o‘zgartirish' })}
            </button>
          </Form>
        </div>
      </Modal>
    </div>
  );
}
