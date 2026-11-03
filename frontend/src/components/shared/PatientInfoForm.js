import React from 'react';
import { Button, Col, Form, Input, Row, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import i18n from '../../locale/i18next';
import DateField from './DateField';
import PhoneInput from './PhoneInput';
import { latinNameRule, latinTextRule, normalizeLatinName, normalizeLatinText } from '../../tools/latinInput';

/**
 * Bemor shaxsiy ma'lumotlari formasi.
 *
 * Faqat familiya va ism MAJBURIY — qolganlari ixtiyoriy (loyiha egasining
 * qarori). Barcha matnlar faqat lotin harflarida (`tools/latinInput.js`).
 *
 * Props:
 *   form           — Ant Design Form instance
 *   patcient       — hozirgi bemor ma'lumotlari (null bo'lsa yashirin)
 *   visible        — ko'rinishni majburan belgilash (berilmasa `!!patcient`)
 *   showIdentity   — tug'ilgan sana va passport maydonlarini ham ko'rsatish
 *                    (ism bo'yicha qidiruv oqimi; eski oqimda ular qidiruv
 *                    formasidan olinardi)
 *   alwaysShowSave — "Saqlash" tugmasi doim ko'rinadi (yangi bemor);
 *                    aks holda faqat forma o'zgarganda
 *   onFinish       — form submit handler (savePatcient)
 *   loading        — submit loading holati
 *   phoneValue     — telefon qiymati
 *   setPhoneValue  — telefon setter
 *   gender         — hozirgi jins
 *   setGender      — jins setter
 *   regions        — viloyatlar ro'yxati
 *   districts      — tumanlar ro'yxati
 *   fetchDistricts — tuman yuklash funksiyasi
 */
export default function PatientInfoForm({
    form,
    patcient,
    visible,
    showIdentity = false,
    alwaysShowSave = false,
    onFinish,
    loading,
    phoneValue,
    setPhoneValue,
    gender,
    setGender,
    regions,
    districts,
    fetchDistricts,
}) {
    const { t } = useTranslation();
    const [isDirty, setIsDirty] = React.useState(false);
    const shown = visible ?? !!patcient;

    React.useEffect(() => {
        setIsDirty(false);
    }, [patcient]);

    return (
        <div
            className={`hidden_box ${shown ? 'showed_box' : ''}`}
            // Sana maydonida Enter faqat sanani tasdiqlaydi — aks holda u
            // butun formani yuborib, bemor qolgan maydonlarsiz saqlanardi
            onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.closest?.('.ant-picker')) e.preventDefault();
            }}
        >
            <Form
                form={form}
                name="patientInfo"
                labelCol={{ span: 24 }}
                wrapperCol={{ span: 24 }}
                onFinish={(vals) => {
                    onFinish(vals);
                    setIsDirty(false);
                }}
                onValuesChange={() => setIsDirty(true)}
            >
                <Row>
                    <Col className="main_col" lg={8} xs={24} sm={24} md={24}>
                        <Form.Item
                            name="lastname"
                            label={t('lastname')}
                            normalize={normalizeLatinName}
                            rules={[{ required: true, whitespace: true, message: t('field_required') }, latinNameRule(t)]}
                        >
                            <Input
                                className="login_input"
                                placeholder={t('enter_lastname')}
                                maxLength={60}
                            />
                        </Form.Item>
                    </Col>

                    <Col className="main_col" lg={8} xs={24} sm={24} md={24}>
                        <Form.Item
                            name="firstname"
                            label={t('firstname')}
                            normalize={normalizeLatinName}
                            rules={[{ required: true, whitespace: true, message: t('field_required') }, latinNameRule(t)]}
                        >
                            <Input
                                className="login_input"
                                placeholder={t('enter_firstname')}
                                maxLength={60}
                            />
                        </Form.Item>
                    </Col>

                    <Col className="main_col" lg={8} xs={24} sm={24} md={24}>
                        <Form.Item
                            name="surename"
                            label={t('surename')}
                            normalize={normalizeLatinName}
                            rules={[latinNameRule(t)]}
                        >
                            <Input
                                className="login_input"
                                placeholder={t('enter_surename')}
                                maxLength={60}
                            />
                        </Form.Item>
                    </Col>

                    {showIdentity && (
                        <Col className="main_col" lg={8} xs={24} sm={24} md={24}>
                            <Form.Item name="birthdate" label={t('birthdate')}>
                                <DateField />
                            </Form.Item>
                        </Col>
                    )}

                    <Col className="main_col" lg={8} xs={24} sm={24} md={24}>
                        <Form.Item name="gender" label={t('gender')}>
                            <Select
                                style={{ width: '100%' }}
                                value={gender}
                                placeholder={t('enter_gender')}
                                allowClear
                                onChange={(value) => setGender?.(value)}
                                options={[
                                    { value: true, label: t('male') },
                                    { value: false, label: t('female') },
                                ]}
                            />
                        </Form.Item>
                    </Col>

                    {showIdentity && (
                        <Col className="main_col" lg={8} xs={24} sm={24} md={24}>
                            <Form.Item
                                name="passport"
                                label={t('passport_seria')}
                                normalize={normalizeLatinText}
                                rules={[latinTextRule(t)]}
                            >
                                <Input
                                    className="login_input"
                                    placeholder={t('enter_passport_seria')}
                                    maxLength={24}
                                />
                            </Form.Item>
                        </Col>
                    )}

                    <Col className="main_col" lg={8} xs={24} sm={24} md={24}>
                        <Form.Item
                            label={t('phone_number')}
                            name="phone"
                            wrapperCol={{ span: 24 }}
                            rules={[{
                                // Ixtiyoriy: kiritilsa — to'liq bo'lsin ("+998" ning o'zi = kiritilmagan)
                                validator: (_, value) => {
                                    const digits = (value || '').replace(/\D/g, '');
                                    return digits.length <= 3 || digits.length === 12
                                        ? Promise.resolve()
                                        : Promise.reject(new Error(t('phone_incomplete', { defaultValue: "Telefon raqamni to'liq kiriting" })));
                                },
                            }]}
                        >
                            {/* Umumiy telefon maydoni: bo'sh holatda "+998 (" ko'rinmaydi
                                (ajratgichlar yozilgan sari chiqadi) */}
                            <PhoneInput
                                value={phoneValue}
                                onChange={(e) => setPhoneValue(e.target.value)}
                            />
                        </Form.Item>
                    </Col>

                    <Col className="main_col" lg={8} xs={24} sm={24} md={24}>
                        <Form.Item name="regioname" label={t('region')}>
                            <Select
                                style={{ width: '100%' }}
                                placeholder={t('enter_region')}
                                allowClear
                                onChange={(value) => {
                                    form.setFieldsValue({ districtname: undefined });
                                    if (value != null) fetchDistricts(Number(value));
                                }}
                                options={regions?.map((item) => {
                                    const currentLang = i18n.language;
                                    let labelText = item.nameUz;
                                    if (currentLang === 'ru') labelText = item.nameRu;
                                    if (currentLang === 'en') labelText = item.nameEn;
                                    return { value: item.id, label: labelText };
                                })}
                            />
                        </Form.Item>
                    </Col>

                    <Col className="main_col" lg={8} xs={24} sm={24} md={24}>
                        <Form.Item name="districtname" label={t('district')}>
                            <Select
                                style={{ width: '100%' }}
                                placeholder={t('enter_district')}
                                labelInValue
                                allowClear
                                options={districts?.map((item) => ({
                                    value: item.id,
                                    label: i18n.language === 'ru'
                                        ? item.nameRu
                                        : (i18n.language === 'en' ? item.nameEn : item.nameUz),
                                }))}
                            />
                        </Form.Item>
                    </Col>

                    <Col className="main_col" lg={showIdentity ? 24 : 16} xs={24} sm={24} md={24}>
                        <Form.Item
                            name="address"
                            label={t('addres')}
                            normalize={normalizeLatinText}
                            rules={[latinTextRule(t)]}
                        >
                            <Input
                                className="login_input"
                                placeholder={t('enter_addres')}
                                maxLength={250}
                            />
                        </Form.Item>
                    </Col>

                    {(alwaysShowSave || isDirty) && (
                        <div className="save-pat-data">
                            <Col className="main_col" lg={8} xs={24} sm={24} md={24}>
                                <div className="form_div">
                                    <Button className="btn_form" loading={loading} htmlType="submit">
                                        {t('saveData')}
                                    </Button>
                                </div>
                            </Col>
                        </div>
                    )}
                </Row>
            </Form>
        </div>
    );
}
