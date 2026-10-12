import { Button, Form, Input, Select, Upload } from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaBuilding, FaLocationDot, FaPlus } from 'react-icons/fa6';
import { DeleteOutlined, PhoneOutlined, PlusOutlined, SafetyCertificateOutlined, UploadOutlined } from '@ant-design/icons';
import InputMask from 'react-input-mask';
import { AiOutlineFieldNumber } from 'react-icons/ai';
import { BsBank2 } from 'react-icons/bs';
import { LiaDownloadSolid } from 'react-icons/lia';
import i18n from '../../../locale/i18next';
import { useStore } from '../../../store/Store';
import { get_clinic_by_id, send_clinic_detail, send_clinic_info, send_clinic_phone } from '../../../host/requests/ClinicRequest';
import { get_districts_data, get_region_data } from '../../../host/requests/RegionRequest';
import { imgApi } from '../../../host/Host';
import { dangerAlert, successAlert } from '../../../tools/Alerts';
import { formatPhoneNumber, formatPhoneNumberForForm } from '../../../tools/formatters';
import { clinicInfoTour } from '../../../tools/tourSteps'
import { usePageTour } from '../../../components/shared/TourProvider';
import useDocumentTitle from '../../../tools/useDocumentTitle';
import './ClinicInfo.css';

const formatBankAccount = (value) => (value ? value.replace(/(.{4})/g, '$1 ').trim() : '');

/**
 * Tashkilot ma'lumotlari (`/settings`).
 *
 * Uch mustaqil forma (asosiy, telefonlar, rekvizitlar) — har biri o'z
 * endpointiga saqlanadi. Ko'rinish:
 *  * chapda JONLI ko'rinish kartochkasi — kiritilgan ma'lumot PDF hisobot
 *    sarlavhasida qanday chiqishini darhol ko'rsatadi;
 *  * o'ngda bo'limlar; har birida "Saqlanmagan" belgisi (T-077);
 *  * rekvizitlar mantiqiy guruhlarga bo'lingan: manzil, bank, litsenziya.
 *
 * Uslublar: `ClinicInfo.css` (`stg-*`).
 */
export default function ClinicInfo() {
    // Qo'llanma qadamlari ro'yxatdan o'tkaziladi; tugma header'da
    usePageTour(clinicInfoTour);
  const { t } = useTranslation()
  useDocumentTitle(t('main_info', { defaultValue: "Tashkilot ma'lumotlari" }));
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

  // ── Saqlanmagan o'zgarishlar (T-077) ─────────────────────────────────

  // Sahifada uchta mustaqil forma bor va har birining o'z saqlash tugmasi.

  // Foydalanuvchi uchalasini ham tahrirlab, faqat bittasini saqlashi va

  // qolgan o'zgarishlarni sezmasdan yo'qotishi juda oson edi.

  const [dirtyBlocks, setDirtyBlocks] = useState({ main: false, phones: false, detail: false });

  const hasUnsaved = dirtyBlocks.main || dirtyBlocks.phones || dirtyBlocks.detail;


  const markDirty = (block) => setDirtyBlocks((prev) => (prev[block] ? prev : { ...prev, [block]: true }));

  const markClean = (block) => setDirtyBlocks((prev) => ({ ...prev, [block]: false }));


  // Brauzer yorlig'ini yopishda / sahifani yangilashda ogohlantirish

  useEffect(() => {

      if (!hasUnsaved) return undefined;

      const handler = (event) => {

          event.preventDefault();

          event.returnValue = '';   // brauzer o'z standart matnini ko'rsatadi

      };

      window.addEventListener('beforeunload', handler);

      return () => window.removeEventListener('beforeunload', handler);

  }, [hasUnsaved]);


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
      successAlert(t('main_info_saved', { defaultValue: 'Asosiy ma\'lumotlar saqlandi' }));
      markClean('main');
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

      successAlert(t('phones_saved', { defaultValue: 'Telefon raqamlar saqlandi' }));
      markClean('phones');
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
      formData.append('INN', (values.inn || '').replace(/\D/g, ''));
      formData.append('BankAccaunt', (values.bankAccount || '').replace(/\s/g, ''));
      formData.append('MFO', (values.mfo || '').replace(/\D/g, ''));
      formData.append('BankName', values.bankName?.trim() || '');
      formData.append('DistrictId', values.districtId?.value ?? values.districtId ?? 0);
      formData.append('Address', values.address?.trim() || '');
      formData.append('License', values.license?.trim() || '');

      if (licenseFile) {
        formData.append('LicenseFile', licenseFile);
      }

      await send_clinic_detail(formData);
      successAlert(t('details_saved', { defaultValue: 'Tashkilot rekvizitlari saqlandi' }));
      markClean('detail');
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

    // Logo bilan bir xil manba (`imgApi`). Ilgari `api.replace('/api', '')`
    // ishlatilardi va `https://api.x.uz/api` kabi manzilda birinchi "/api"
    // (domen ichidagisi) o'chib, havola buzilardi.
    const fullUrl = `${imgApi}${licenseUrl}`;
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

  // ── Jonli ko'rinish (o'ng/chap panel): forma qiymatlari yozilishi bilan ──
  const watchName = Form.useWatch('clinicName', mainForm);
  const watchPhones = Form.useWatch('phone_numbers', phoneForm);
  const watchAddress = Form.useWatch('address', detailForm);
  const watchInn = Form.useWatch('inn', detailForm);
  const watchRegion = Form.useWatch('regionId', detailForm);
  const watchDistrict = Form.useWatch('districtId', detailForm);

  if (!clinic) {
    return null;
  }

  const logoSrc = logoPreview || (clinic?.clinicLogo ? imgApi + clinic.clinicLogo : null);
  const regionLabel = regionOptions.find((r) => r.value === watchRegion)?.label;
  const districtLabel = watchDistrict?.label
    ?? districtOptions.find((d) => d.value === (watchDistrict?.value ?? watchDistrict))?.label;
  const previewAddress = [regionLabel, districtLabel, watchAddress].filter(Boolean).join(', ');
  const previewPhones = (watchPhones || []).map((p) => p?.phoneNumber).filter((p) => p && p.length >= 10);
  const hasLicense = !!clinic?.clinicDetail?.license;

  /** Bo'lim sarlavhasi: ikonka, nom, izoh va "saqlanmagan" belgisi. */
  const SectionHead = ({ icon, title, hint, dirty }) => (
    <header className="stg-card-head">
      <span className="stg-card-icon" aria-hidden="true">{icon}</span>
      <div className="stg-card-titles">
        <h2 className="stg-card-title">
          {title}
          {dirty && <span className="stg-dirty">{t('unsaved', { defaultValue: 'Saqlanmagan' })}</span>}
        </h2>
        {hint && <p className="stg-card-hint">{hint}</p>}
      </div>
    </header>
  );

  return (
    <div className="stg">
      <div className="stg-header">
        <h1 className="stg-title">{t('main_info', { defaultValue: "Tashkilot ma'lumotlari" })}</h1>
        <p className="stg-subtitle">
          {t('clinic_settings_subtitle', {
            defaultValue: "Bu ma'lumotlar tahlil hisobotlari (PDF) sarlavhasida va bemorlarga ko'rinadigan joylarda chiqadi.",
          })}
        </p>
      </div>

      <div className="stg-layout">
        {/* ═══════ Jonli ko'rinish ═══════ */}
        <aside className="stg-preview">
          <div className="stg-preview-card">
            <p className="stg-preview-label">
              {t('clinic_preview', { defaultValue: 'Hisobotlarda shunday ko\'rinadi' })}
            </p>
            <div className="stg-preview-brand">
              <div className="stg-preview-logo">
                {logoSrc ? <img alt="" src={logoSrc} /> : <FaBuilding />}
              </div>
              <div className="stg-preview-name">
                {watchName || clinic.clinicName || t('clinic_name', { defaultValue: 'Klinika nomi' })}
              </div>
            </div>
            <ul className="stg-preview-facts">
              <li>
                <FaLocationDot />
                <span>{previewAddress || <em>{t('not_filled', { defaultValue: 'Kiritilmagan' })}</em>}</span>
              </li>
              <li>
                <PhoneOutlined />
                <span>{previewPhones.length ? previewPhones.join(' · ') : <em>{t('not_filled', { defaultValue: 'Kiritilmagan' })}</em>}</span>
              </li>
              <li>
                <AiOutlineFieldNumber />
                <span>
                  {t('inn', { defaultValue: 'STIR' })}: {watchInn || <em>{t('not_filled', { defaultValue: 'Kiritilmagan' })}</em>}
                </span>
              </li>
              <li>
                <SafetyCertificateOutlined />
                <span>
                  {t('license', { defaultValue: 'Litsenziya' })}:{' '}
                  {licenseFile || hasLicense
                    ? <b className="stg-ok">{t('uploaded', { defaultValue: 'Yuklangan' })}</b>
                    : <em>{t('not_uploaded', { defaultValue: 'Yuklanmagan' })}</em>}
                </span>
              </li>
            </ul>
          </div>
        </aside>

        <div className="stg-main">
          {/* ═══════ 1. Asosiy ma'lumotlar ═══════ */}
          <section className="stg-card" data-tour="clinic-main">
            <SectionHead
              icon={<FaBuilding />}
              title={t('main_info', { defaultValue: "Asosiy ma'lumotlar" })}
              dirty={dirtyBlocks.main}
            />
            <Form form={mainForm} layout="vertical" onFinish={handleMainSubmit} onValuesChange={() => markDirty('main')}>
              <Form.Item name="clinicLogo" label={t('clinic_logo')} data-tour="clinic-logo">
                <div className="stg-logo">
                  <label className="stg-logo-drop">
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
                        markDirty('main');
                      }}
                    />
                    {logoSrc
                      ? <img alt="clinic logo" src={logoSrc} />
                      : <span className="stg-logo-empty"><FaPlus /></span>}
                  </label>
                  <div className="stg-logo-text">
                    <b>{logoSrc
                      ? t('change_logo', { defaultValue: 'Logotipni almashtirish' })
                      : t('upload_logo', { defaultValue: 'Logotip yuklash' })}</b>
                    <span>{t('logo_hint', { defaultValue: 'PNG yoki JPG, kvadrat shaklda (masalan 512×512). Hisobot sarlavhasida chiqadi.' })}</span>
                  </div>
                </div>
              </Form.Item>

              <Form.Item
                name="clinicName"
                label={t('clinic_name')}
                rules={[{ required: true, message: t('not_empty') }]}
              >
                <Input prefix={<FaBuilding />} placeholder={t('enter_clinic_name')} />
              </Form.Item>

              <footer className="stg-card-foot">
                <Button type="primary" loading={loadingMain} htmlType="submit">
                  {t('save_data')}
                </Button>
              </footer>
            </Form>
          </section>

          {/* ═══════ 2. Telefon raqamlar ═══════ */}
          <section className="stg-card" data-tour="clinic-phones">
            <SectionHead
              icon={<PhoneOutlined />}
              title={t('phone_numbers')}
              hint={t('phones_hint', { defaultValue: 'Bemorlar va hamkorlar bog\'lanadigan raqamlar. Hisobotda hammasi ko\'rsatiladi.' })}
              dirty={dirtyBlocks.phones}
            />
            <Form form={phoneForm} layout="vertical" onFinish={handlePhonesSubmit} onValuesChange={() => markDirty('phones')}>
              <Form.List name="phone_numbers">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <div key={key} className="stg-phone-row">
                        <Form.Item {...restField} name={[name, 'id']} hidden>
                          <Input />
                        </Form.Item>

                        <Form.Item
                          {...restField}
                          name={[name, 'phoneNumber']}
                          rules={[{ required: true, message: t('field_required') }, { len: 19, message: t('phone_incomplete', { defaultValue: "Telefon raqamni to'liq kiriting" }) }]}
                          className="stg-phone-input"
                        >
                          <InputMask mask="+\9\9\8 (99) 999-99-99" maskChar={null}>
                            {(props) => (
                              <Input
                                {...props}
                                prefix={<PhoneOutlined />}
                                placeholder="+998 (__) ___-__-__"
                              />
                            )}
                          </InputMask>
                        </Form.Item>

                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          aria-label={t('delete', { defaultValue: "O'chirish" })}
                          disabled={fields.length === 1}
                          onClick={() => { remove(name); markDirty('phones'); }}
                        />
                      </div>
                    ))}

                    <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({ id: null, phoneNumber: '' })}>
                      {t('add_phone', { defaultValue: "Telefon qo'shish" })}
                    </Button>
                  </>
                )}
              </Form.List>

              <footer className="stg-card-foot">
                <Button type="primary" loading={loadingPhones} htmlType="submit">
                  {t('save_data')}
                </Button>
              </footer>
            </Form>
          </section>

          {/* ═══════ 3. Rekvizitlar: manzil, bank, litsenziya ═══════ */}
          <section className="stg-card">
            <SectionHead
              icon={<BsBank2 />}
              title={t('bank_info')}
              hint={t('details_hint', { defaultValue: 'Rasmiy rekvizitlar — hujjatlar va hisob-kitoblar uchun.' })}
              dirty={dirtyBlocks.detail}
            />
            <Form form={detailForm} layout="vertical" onFinish={handleDetailSubmit} onValuesChange={() => markDirty('detail')}>
              <h3 className="stg-group"><FaLocationDot /> {t('address', { defaultValue: 'Manzil' })}</h3>
              <div className="stg-grid">
                <Form.Item name="regionId" label={t('region')} rules={[{ required: true, message: t('field_required') }]}>
                  <Select
                    placeholder={t('enter_region_clinic')}
                    onChange={handleRegionChange}
                    options={regionOptions}
                  />
                </Form.Item>
                <Form.Item name="districtId" label={t('district')} rules={[{ required: true, message: t('field_required') }]}>
                  <Select
                    placeholder={t('enter_district_clinic')}
                    labelInValue
                    options={districtOptions}
                    disabled={districts.length === 0}
                  />
                </Form.Item>
                <Form.Item className="stg-span" name="address" label={t('address')} rules={[{ required: true, message: t('field_required') }]}>
                  <Input prefix={<FaLocationDot />} placeholder={t('enter_address')} />
                </Form.Item>
              </div>

              <h3 className="stg-group"><BsBank2 /> {t('bank_requisites', { defaultValue: 'Bank rekvizitlari' })}</h3>
              <div className="stg-grid">
                <Form.Item name="inn" label={t('inn')} rules={[{ required: true, message: t('field_required', { defaultValue: 'Maydonni to\'ldiring' }) }, { validator: (_, v) => (!v || String(v).replace(/\D/g, '').length === 9) ? Promise.resolve() : Promise.reject(new Error(t('digits_required', { defaultValue: '{{count}} ta raqam bo\'lishi kerak', count: 9 }))) }]}>
                  <InputMask mask="999999999" maskChar={null}>
                    {(props) => <Input {...props} prefix={<AiOutlineFieldNumber />} placeholder={t('enter_inn')} />}
                  </InputMask>
                </Form.Item>
                <Form.Item name="mfo" label={t('mfo')} rules={[{ required: true, message: t('field_required', { defaultValue: 'Maydonni to\'ldiring' }) }, { validator: (_, v) => (!v || String(v).replace(/\D/g, '').length === 5) ? Promise.resolve() : Promise.reject(new Error(t('digits_required', { defaultValue: '{{count}} ta raqam bo\'lishi kerak', count: 5 }))) }]}>
                  <InputMask mask="99999" maskChar={null}>
                    {(props) => <Input {...props} prefix={<AiOutlineFieldNumber />} placeholder={t('enter_mfo')} />}
                  </InputMask>
                </Form.Item>
                <Form.Item className="stg-span" name="bankAccount" label={t('bank_account')} rules={[{ required: true, message: t('field_required', { defaultValue: 'Maydonni to\'ldiring' }) }, { validator: (_, v) => (!v || String(v).replace(/\D/g, '').length === 20) ? Promise.resolve() : Promise.reject(new Error(t('digits_required', { defaultValue: '{{count}} ta raqam bo\'lishi kerak', count: 20 }))) }]}>
                  <InputMask mask="9999 9999 9999 9999 9999" maskChar={null}>
                    {(props) => <Input {...props} prefix={<AiOutlineFieldNumber />} placeholder={t('enter_bank_account')} />}
                  </InputMask>
                </Form.Item>
                <Form.Item className="stg-span" name="bankName" label={t('bankName')} rules={[{ required: true, message: t('field_required') }]}>
                  <Input prefix={<BsBank2 />} placeholder={t('enter_bankName')} />
                </Form.Item>
              </div>

              <h3 className="stg-group"><SafetyCertificateOutlined /> {t('license')}</h3>
              <Form.Item name="license" rules={[{ required: true, message: t('field_required') }]}>
                {/* Tug'ma `<input type="file">` brauzer tiliga bo'ysunardi:
                    o'zbek interfeysda "Выберите файл / Файл не выбран" chiqardi
                    va dizayn tizimiga mos kelmasdi. */}
                <div className="stg-license">
                  <div className="stg-license-info">
                    <SafetyCertificateOutlined className={hasLicense || licenseFile ? 'stg-ok' : ''} />
                    <span>
                      {licenseFile
                        ? licenseFile.name
                        : hasLicense
                          ? t('license_uploaded', { defaultValue: 'Litsenziya nusxasi yuklangan' })
                          : t('license_missing', { defaultValue: 'Litsenziya nusxasi hali yuklanmagan' })}
                      <small>{t('license_hint', { defaultValue: 'PDF yoki rasm, 10 MB gacha' })}</small>
                    </span>
                  </div>
                  <div className="stg-license-actions">
                    {hasLicense && !licenseFile && (
                      <Button icon={<LiaDownloadSolid />} onClick={downloadLicense}>
                        {t('download', { defaultValue: 'Yuklab olish' })}
                      </Button>
                    )}
                    <Upload
                      accept=".pdf,.jpg,.jpeg,.png"
                      maxCount={1}
                      showUploadList={false}
                      beforeUpload={(file) => {
                        // 10 MB dan katta guvohnoma nusxasi bo'lishi shart emas
                        if (file.size > 10 * 1024 * 1024) {
                          dangerAlert(t('file_too_large', { defaultValue: 'Fayl hajmi 10 MB dan oshmasligi kerak' }));
                          return Upload.LIST_IGNORE;
                        }
                        setLicenseFile(file);
                        detailForm.setFieldValue('license', file.name);
                        markDirty('detail');
                        return false;   // avtomatik yuborishni to'xtatamiz
                      }}
                    >
                      <Button icon={<UploadOutlined />}>
                        {hasLicense || licenseFile
                          ? t('replace_file', { defaultValue: 'Faylni almashtirish' })
                          : t('select_file', { defaultValue: 'Faylni tanlash' })}
                      </Button>
                    </Upload>
                    {licenseFile && (
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => {
                          setLicenseFile(null);
                          detailForm.setFieldValue('license', clinic?.clinicDetail?.license || undefined);
                        }}
                      />
                    )}
                  </div>
                </div>
              </Form.Item>

              <footer className="stg-card-foot">
                <Button type="primary" loading={loadingDetail} htmlType="submit">
                  {t('save_data')}
                </Button>
              </footer>
            </Form>
          </section>
        </div>
      </div>

      {/* Saqlanmagan o'zgarishlar indikatori — sahifa pastida yopishib turadi.
          Ilgari foydalanuvchi uchta blokni tahrirlab, faqat bittasini saqlashi
          va qolganini sezmasdan yo'qotishi mumkin edi. */}
      {hasUnsaved ? (
        <div className="unsaved_bar">
          <span className="unsaved_bar_text">
            ⚠ {t('unsaved_changes', { defaultValue: "Saqlanmagan o'zgarishlar bor" })}
            {': '}
            {[
              dirtyBlocks.main && t('main_info'),
              dirtyBlocks.phones && t('phone_numbers'),
              dirtyBlocks.detail && t('bank_info'),
            ].filter(Boolean).join(', ')}
          </span>
          <Button
            type="primary"
            loading={loadingMain || loadingPhones || loadingDetail}
            onClick={() => {
              // Har bir "iflos" blokni o'z formasi orqali yuboramiz —
              // validatsiya ham shu formaning qoidalari bo'yicha ishlaydi
              if (dirtyBlocks.main) mainForm.submit();
              if (dirtyBlocks.phones) phoneForm.submit();
              if (dirtyBlocks.detail) detailForm.submit();
            }}
          >
            {t('save_all', { defaultValue: 'Barchasini saqlash' })}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
