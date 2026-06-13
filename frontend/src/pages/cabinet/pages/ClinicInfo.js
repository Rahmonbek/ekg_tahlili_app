import { Button, Col, Form, Input, Row, Select } from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaBuilding, FaLocationDot, FaPlus } from 'react-icons/fa6';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import InputMask from 'react-input-mask';
import { AiOutlineFieldNumber } from 'react-icons/ai';
import { BsBank2 } from 'react-icons/bs';
import Cleave from 'cleave.js/react';
import { LiaDownloadSolid } from 'react-icons/lia';
import i18n from '../../../locale/i18next';
import { useStore } from '../../../store/Store';
import { get_clinic_by_id, send_clinic_detail, send_clinic_info, send_clinic_phone } from '../../../host/requests/ClinicRequest';
import { get_districts_data, get_region_data } from '../../../host/requests/RegionRequest';
import { api, imgApi } from '../../../host/Host';
import { dangerAlert, successAlert } from '../../../tools/Alerts';
import { formatPhoneNumber, formatPhoneNumberForForm } from '../../../tools/formatters';

const phoneOptions = {
  prefix: '+998',
  delimiters: [' (', ') ', '-', '-'],
  blocks: [4, 2, 3, 2, 2],
  numericOnly: true,
};

const formatBankAccount = (value) => (value ? value.replace(/(.{4})/g, '$1 ').trim() : '');

export default function ClinicInfo() {
  const { t } = useTranslation();
  const { user, setloader } = useStore();
  const [mainForm] = Form.useForm();
  const [phoneForm] = Form.useForm();
  const [detailForm] = Form.useForm();

  const [clinic, setClinic] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [clinicLogoFile, setClinicLogoFile] = useState(null);
  const [licenseFile, setLicenseFile] = useState(null);
  const [regions, setRegions] = useState([]);
  const [districts, setDistricts] = useState([]);

  const [loadingMain, setLoadingMain] = useState(false);
  const [loadingPhones, setLoadingPhones] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const districtOptions = useMemo(
    () =>
      districts.map((item) => ({
        value: item.id,
        label: i18n.language === 'ru' ? item.nameRu : i18n.language === 'en' ? item.nameEn : item.nameUz,
      })),
    [districts]
  );

  const regionOptions = useMemo(
    () =>
      regions.map((item) => ({
        value: item.id,
        label: i18n.language === 'ru' ? item.nameRu : i18n.language === 'en' ? item.nameEn : item.nameUz,
      })),
    [regions]
  );

  const loadInitialData = useCallback(async () => {
    try {
      setloader(true);
      const [regionsRes, clinicRes] = await Promise.all([
        get_region_data(),
        get_clinic_by_id({ id: user.clinic.id }),
      ]);

      const regionList = Array.isArray(regionsRes.data) ? regionsRes.data : [];
      const clinicData = clinicRes.data;
      const detail = clinicData?.clinicDetail ?? null;

      setRegions(regionList);
      setClinic(clinicData);
      setLogoPreview(null);
      setClinicLogoFile(null);
      setLicenseFile(null);

      mainForm.setFieldsValue({
        clinicLogo: clinicData?.clinicLogo || null,
        clinicName: clinicData?.clinicName || '',
      });

      const phones = Array.isArray(clinicData?.clinicPhoneNumber) && clinicData.clinicPhoneNumber.length > 0
        ? clinicData.clinicPhoneNumber.map((item) => ({
            id: item.id,
            phoneNumber: formatPhoneNumberForForm(item.phoneNumber),
          }))
        : [{ id: null, phoneNumber: '' }];

      phoneForm.setFieldsValue({ phone_numbers: phones });

      let districtValue;
      if (detail?.district?.region?.id) {
        const districtRes = await get_districts_data({ region_id: detail.district.region.id });
        setDistricts(Array.isArray(districtRes.data) ? districtRes.data : []);
        districtValue = {
          value: detail.district.id,
          label: i18n.language === 'ru' ? detail.district.nameRu : i18n.language === 'en' ? detail.district.nameEn : detail.district.nameUz,
        };
      } else {
        setDistricts([]);
      }

      detailForm.setFieldsValue({
        inn: detail?.inn || '',
        license: detail?.license || '',
        regionId: detail?.district?.region?.id,
        districtId: districtValue,
        address: detail?.address || '',
        bankAccount: formatBankAccount(detail?.bankAccaunt),
        mfo: detail?.mfo || '',
        bankName: detail?.bankName || '',
      });
    } catch (error) {
      dangerAlert(t(error?.response?.data?.message || 'server_error'));
    } finally {
      setloader(false);
      setLoadingMain(false);
      setLoadingPhones(false);
      setLoadingDetail(false);
    }
  }, [detailForm, mainForm, phoneForm, setloader, t, user?.clinic?.id]);

  useEffect(() => {
    if (!user?.clinic?.id) {
      return;
    }

    loadInitialData();
  }, [loadInitialData, user?.clinic?.id]);

  const handleRegionChange = async (value) => {
    detailForm.setFieldValue('districtId', undefined);
    setDistricts([]);

    if (!value) {
      return;
    }

    try {
      const res = await get_districts_data({ region_id: value });
      setDistricts(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      dangerAlert(t(error?.response?.data?.message || 'server_error'));
    }
  };

  const handleMainSubmit = async (values) => {
    if (!clinic?.id) {
      dangerAlert(t('server_error'));
      return;
    }

    try {
      setLoadingMain(true);
      const formData = new FormData();
      formData.append('Id', clinic.id);
      formData.append('ClinicName', values.clinicName?.trim() || '');

      if (clinicLogoFile) {
        formData.append('ClinicLogo', clinicLogoFile);
      }

      await send_clinic_info(formData);
      successAlert(t('data_saved'));
      await loadInitialData();
    } catch (error) {
      dangerAlert(t(error?.response?.data?.message || 'server_error'));
    } finally {
      setLoadingMain(false);
    }
  };

  const handlePhonesSubmit = async (values) => {
    if (!clinic?.id) {
      dangerAlert(t('server_error'));
      return;
    }

    try {
      setLoadingPhones(true);
      const phoneNumbers = (values.phone_numbers || [])
        .filter((item) => item?.phoneNumber?.trim())
        .map((item) => ({
          id: item.id,
          phoneNumber: formatPhoneNumber(item.phoneNumber),
        }));

      await send_clinic_phone({
        ClinicId: clinic.id,
        PhoneNumbers: phoneNumbers,
      });

      successAlert(t('data_saved'));
      await loadInitialData();
    } catch (error) {
      dangerAlert(t(error?.response?.data?.message || 'server_error'));
    } finally {
      setLoadingPhones(false);
    }
  };

  const handleDetailSubmit = async (values) => {
    if (!clinic?.id) {
      dangerAlert(t('server_error'));
      return;
    }

    try {
      setLoadingDetail(true);
      const formData = new FormData();
      formData.append('Id', clinic?.clinicDetail?.id || 0);
      formData.append('ClinicId', clinic.id);
      formData.append('Inn', (values.inn || '').replace(/\D/g, ''));
      formData.append('BankAccaunt', (values.bankAccount || '').replace(/\s/g, ''));
      formData.append('Mfo', (values.mfo || '').replace(/\D/g, ''));
      formData.append('BankName', values.bankName?.trim() || '');
      formData.append('DistrictId', values.districtId?.value || values.districtId);
      formData.append('Address', values.address?.trim() || '');
      formData.append('License', values.license?.trim() || '');

      if (licenseFile) {
        formData.append('LicenseFile', licenseFile);
      }

      await send_clinic_detail(formData);
      successAlert(t('data_saved'));
      await loadInitialData();
    } catch (error) {
      dangerAlert(t(error?.response?.data?.message || 'server_error'));
    } finally {
      setLoadingDetail(false);
    }
  };

  const downloadLicense = async () => {
    const licenseUrl = clinic?.clinicDetail?.license;
    if (!licenseUrl) {
      return;
    }

    const fullUrl = `${api.replace('/api', '')}${licenseUrl}`;
    try {
      const response = await fetch(fullUrl);
      if (!response.ok) {
        throw new Error('download_failed');
      }
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = licenseUrl.split('/').pop() || 'license';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      window.open(fullUrl, '_blank');
    }
  };

  if (!clinic) {
    return null;
  }

  return (
    <div>
      <Row>
        <Col className="main_col" lg={8} xs={24} sm={24} md={12}>
          <div className="main_card">
            <h1>{t('main_info')}</h1>

            <div className="main_card_content">
              <Form form={mainForm} layout="vertical" onFinish={handleMainSubmit}>
                <Form.Item name="clinicLogo" label={t('clinic_logo')}>
                  <div className="input_img_box">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) {
                          return;
                        }
                        setClinicLogoFile(file);
                        setLogoPreview(URL.createObjectURL(file));
                      }}
                    />

                    {logoPreview ? (
                      <img alt="clinic logo preview" src={logoPreview} />
                    ) : clinic?.clinicLogo ? (
                      <img alt="clinic logo" src={imgApi + clinic.clinicLogo} />
                    ) : (
                      <div className="input_img_icon">
                        <FaPlus />
                      </div>
                    )}
                  </div>
                </Form.Item>

                <Form.Item
                  name="clinicName"
                  label={t('clinic_name')}
                  rules={[{ required: true, message: t('not_empty') }]}
                >
                  <Input prefix={<FaBuilding />} className="login_input" placeholder={t('enter_clinic_name')} />
                </Form.Item>

                <Form.Item style={{ marginBottom: '10px' }}>
                  <Button className="btn_form" loading={loadingMain} htmlType="submit">
                    {t('save_data')}
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </div>

          <div className="main_card">
            <h1>{t('phone_numbers')}</h1>

            <div className="main_card_content">
              <Form form={phoneForm} layout="vertical" onFinish={handlePhonesSubmit}>
                <Form.List name="phone_numbers">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...restField }) => (
                        <div key={key} style={{ display: 'flex', width: '100%', alignItems: 'flex-start' }}>
                          <Form.Item {...restField} name={[name, 'id']} hidden>
                            <Input />
                          </Form.Item>

                          <Form.Item
                            {...restField}
                            name={[name, 'phoneNumber']}
                            rules={[{ required: true, message: '' }, { len: 19, message: '' }]}
                            style={{ width: '95%' }}
                          >
                            <Cleave
                              options={phoneOptions}
                              className="ant-input claveInput"
                              style={{ width: '100%' }}
                              placeholder="+998 (__) ___-__-__"
                            />
                          </Form.Item>

                          <MinusCircleOutlined
                            style={{ marginTop: 10, fontSize: '20px', marginLeft: '5px' }}
                            onClick={() => remove(name)}
                          />
                        </div>
                      ))}

                      <Form.Item>
                        <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({ id: null, phoneNumber: '' })}>
                          Telefon qo'shish
                        </Button>
                      </Form.Item>
                    </>
                  )}
                </Form.List>

                <Form.Item style={{ marginBottom: '10px' }}>
                  <Button className="btn_form" loading={loadingPhones} htmlType="submit">
                    {t('save_data')}
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </div>
        </Col>

        <Col className="main_col" lg={16} xs={24} sm={24} md={12}>
          <div className="main_card">
            <h1>{t('bank_info')}</h1>

            <div className="main_card_content">
              <Form form={detailForm} layout="vertical" onFinish={handleDetailSubmit}>
                <Row>
                  <Col className="main_col" lg={12} xs={24} sm={24} md={24}>
                    <Form.Item name="inn" label={t('inn')} rules={[{ required: true, message: '' }]}>
                      <InputMask mask="999999999" maskChar={null}>
                        {(props) => (
                          <Input
                            {...props}
                            prefix={<AiOutlineFieldNumber />}
                            className="login_input"
                            placeholder={t('enter_inn')}
                          />
                        )}
                      </InputMask>
                    </Form.Item>
                  </Col>

                  <Col className="main_col" lg={12} xs={24} sm={24} md={24}>
                    <Form.Item name="license" label={t('license')} rules={[{ required: true, message: '' }]}>
                      <div className="file-input-wrapper">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.png"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              setLicenseFile(file);
                              detailForm.setFieldValue('license', file.name);
                            }
                          }}
                        />

                        <div className="download_button">
                          <button type="button" disabled={!clinic?.clinicDetail?.license} onClick={downloadLicense}>
                            <LiaDownloadSolid />
                          </button>
                        </div>
                      </div>
                    </Form.Item>
                  </Col>

                  <Col className="main_col" lg={12} xs={24} sm={24} md={24}>
                    <Form.Item name="regionId" label={t('region')} rules={[{ required: true, message: '' }]}>
                      <Select
                        style={{ width: '100%' }}
                        placeholder={t('enter_region_clinic')}
                        onChange={handleRegionChange}
                        options={regionOptions}
                      />
                    </Form.Item>
                  </Col>

                  <Col className="main_col" lg={12} xs={24} sm={24} md={24}>
                    <Form.Item name="districtId" label={t('district')} rules={[{ required: true, message: '' }]}>
                      <Select
                        style={{ width: '100%' }}
                        placeholder={t('enter_district_clinic')}
                        labelInValue
                        options={districtOptions}
                        disabled={districts.length === 0}
                      />
                    </Form.Item>
                  </Col>

                  <Col className="main_col" lg={24} xs={24} sm={24} md={24}>
                    <Form.Item name="address" label={t('address')} rules={[{ required: true, message: '' }]}>
                      <Input prefix={<FaLocationDot />} className="login_input" placeholder={t('enter_address')} />
                    </Form.Item>
                  </Col>

                  <Col className="main_col" lg={12} xs={24} sm={24} md={24}>
                    <Form.Item name="bankAccount" label={t('bank_account')} rules={[{ required: true, message: '' }]}>
                      <InputMask mask="9999 9999 9999 9999" maskChar={null}>
                        {(props) => (
                          <Input
                            {...props}
                            prefix={<AiOutlineFieldNumber />}
                            className="login_input"
                            placeholder={t('enter_bank_account')}
                          />
                        )}
                      </InputMask>
                    </Form.Item>
                  </Col>

                  <Col className="main_col" lg={12} xs={24} sm={24} md={24}>
                    <Form.Item name="mfo" label={t('mfo')} rules={[{ required: true, message: '' }]}>
                      <InputMask mask="9999" maskChar={null}>
                        {(props) => (
                          <Input
                            {...props}
                            prefix={<AiOutlineFieldNumber />}
                            className="login_input"
                            placeholder={t('enter_mfo')}
                          />
                        )}
                      </InputMask>
                    </Form.Item>
                  </Col>

                  <Col className="main_col" lg={24} xs={24} sm={24} md={24}>
                    <Form.Item name="bankName" label={t('bankName')} rules={[{ required: true, message: '' }]}>
                      <Input prefix={<BsBank2 />} className="login_input" placeholder={t('enter_bankName')} />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item style={{ marginBottom: '10px' }}>
                  <Button className="btn_form" loading={loadingDetail} htmlType="submit">
                    {t('save_data')}
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
}
