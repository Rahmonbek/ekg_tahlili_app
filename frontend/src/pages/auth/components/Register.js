import { Button, Col, Form, Input, Modal, Row, Select } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import register_img from '../../../images/register1.png';
import { IoMdLock } from 'react-icons/io';
import { Link, useNavigate } from 'react-router-dom';
import { registration, verify_code } from '../../../host/requests/AuthRequest';
import { dangerAlert, successAlert } from '../../../tools/Alerts';
import { useStore } from '../../../store/Store';
import Cookies from "js-cookie";
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import PhoneInput from '../../../components/shared/PhoneInput';
import { formatPhoneNumber } from '../../../tools/formatters';
import { get_districts_data, get_region_data } from '../../../host/requests/RegionRequest';

export default function Register() {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [open, setopen] = useState(false);
  const [loading, setloading] = useState(false);
  const [phone, setPhone] = useState(null);
  const [regions, setRegions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const watchedRegionId = Form.useWatch('regionId', form);
  const { setuser_id } = useStore();
  const [codeForm] = Form.useForm();
  const { t } = useTranslation();
  const langField = `name${t("data_lang")}`;

  useEffect(() => {
    const loadRegions = async () => {
      try {
        setRegionsLoading(true);
        const res = await get_region_data();
        setRegions(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        dangerAlert(t(err?.response?.data?.message || "server_error"));
      } finally {
        setRegionsLoading(false);
      }
    };

    loadRegions();
  }, [t]);

  const regionOptions = useMemo(
    () =>
      regions.map((item) => ({
        value: item.id,
        label: item[langField] || item.nameUz || item.nameRu || item.nameEn,
      })),
    [langField, regions]
  );

  const districtOptions = useMemo(
    () =>
      districts.map((item) => ({
        value: item.id,
        label: item[langField] || item.nameUz || item.nameRu || item.nameEn,
      })),
    [districts, langField]
  );

  const handleRegionChange = async (value) => {
    form.setFieldValue("districtId", undefined);
    setDistricts([]);

    if (!value) {
      return;
    }

    try {
      setDistrictsLoading(true);
      const res = await get_districts_data({ region_id: value });
      setDistricts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      dangerAlert(t(err?.response?.data?.message || "server_error"));
    } finally {
      setDistrictsLoading(false);
    }
  };

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

      const gToken = await executeRecaptcha('registration');
      const res = await registration({
        clinicName: val.clinicName?.trim(),
        phoneNumber: normalizedPhone,
        clinicInn: normalizedInn,
        districtId: val.districtId,
        bankAccaunt: val.bankAccaunt?.replace(/\s/g, ''),
        mfo: val.mfo?.trim(),
        bankName: val.bankName?.trim(),
        license: val.license?.trim(),
        address: val.address?.trim(),
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
    <div className='login_box register_page'>
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
              <div className='register_section_title'>{t("clinic_name_label")}</div>
              <Row gutter={12}>
                <Col span={24}>
                  <Form.Item
                    name="clinicName"
                    label={t("clinic_name")}
                    rules={[{ required: true, message: t("clinic_name_required") }]}
                  >
                    <Input className='login_input' placeholder={t("enter_clinic_name")} maxLength={200} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
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
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="license"
                    label={t("license")}
                    rules={[{ required: true, message: t("not_empty") }]}
                  >
                    <Input className='login_input' placeholder={t("license")} maxLength={100} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="regionId"
                    label={t("region")}
                    rules={[{ required: true, message: t("select_region") }]}
                  >
                    <Select
                      showSearch
                      loading={regionsLoading}
                      placeholder={t("select_region")}
                      options={regionOptions}
                      onChange={handleRegionChange}
                      filterOption={(input, option) =>
                        (option?.label || '').toLowerCase().includes(input.toLowerCase())
                      }
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="districtId"
                    label={t("district")}
                    rules={[{ required: true, message: t("select_district") }]}
                  >
                    <Select
                      showSearch
                      loading={districtsLoading}
                      placeholder={t("select_district")}
                      options={districtOptions}
                      disabled={!watchedRegionId}
                      filterOption={(input, option) =>
                        (option?.label || '').toLowerCase().includes(input.toLowerCase())
                      }
                    />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item
                    name="address"
                    label={t("address")}
                    rules={[{ required: true, message: t("address_required") }]}
                  >
                    <Input className='login_input' placeholder={t("enter_address")} maxLength={255} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="bankAccaunt"
                    label={t("bank_account")}
                    normalize={(value) => value ? value.replace(/[^\d\s]/g, '') : ''}
                  >
                    <Input
                      inputMode="numeric"
                      className='login_input'
                      placeholder={t("enter_bank_account")}
                      maxLength={24}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="mfo"
                    label={t("mfo")}
                    normalize={(value) => value ? value.replace(/\D/g, '') : ''}
                  >
                    <Input
                      inputMode="numeric"
                      className='login_input'
                      placeholder={t("enter_mfo")}
                      maxLength={9}
                    />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name="bankName" label={t("bankName")}>
                    <Input className='login_input' placeholder={t("enter_bankName")} maxLength={200} />
                  </Form.Item>
                </Col>
              </Row>

              <div className='register_section_title'>{t("phone_number")}</div>
              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="phone"
                    label={t("phone_number")}
                    rules={[{ required: true, message: t("phone_required") }, { len: 19, message: t("phone_number_invalid") }]}
                  >
                    <PhoneInput autoComplete="tel" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name="password"
                    label={t("new_password")}
                    rules={[
                      { required: true, message: t("please_enter_password") },
                      {
                        min: 8,
                        pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/,
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
                </Col>
              </Row>

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
