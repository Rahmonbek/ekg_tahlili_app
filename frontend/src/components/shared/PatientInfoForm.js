import React from 'react';
import { Button, Col, Form, Input, Row, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { FaFemale, FaMale } from 'react-icons/fa';
import { IoPerson } from 'react-icons/io5';
import { AiFillHome } from 'react-icons/ai';
import Cleave from 'cleave.js/react';
import i18n from '../../locale/i18next';

/**
 * Bemor shaxsiy ma'lumotlari formasi — ism, familiya, telefon, manzil va h.k.
 * 
 * Props:
 *   form           — Ant Design Form instance
 *   patcient       — hozirgi bemor ma'lumotlari (null bo'lsa yashirin)
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

    return (
        <div className={`hidden_box ${patcient ? 'showed_box' : ''}`}>
            <Form
                form={form}
                name="patientInfo"
                labelCol={{ span: 24 }}
                wrapperCol={{ span: 24 }}
                initialValues={{ remember: true }}
                onFinish={onFinish}
            >
                <Row>
                    <Col className="main_col" lg={8} md={24}>
                        <Form.Item
                            name="lastname"
                            label={t('lastname')}
                            normalize={(value) => value?.toUpperCase()}
                            rules={[{ required: true, message: '' }]}
                        >
                            <Input
                                prefix={<IoPerson />}
                                className="login_input"
                                placeholder={t('enter_lastname')}
                            />
                        </Form.Item>
                    </Col>

                    <Col className="main_col" lg={8} md={24}>
                        <Form.Item
                            name="firstname"
                            label={t('firstname')}
                            normalize={(value) => value?.toUpperCase()}
                            rules={[{ required: true, message: '' }]}
                        >
                            <Input
                                prefix={<IoPerson />}
                                className="login_input"
                                placeholder={t('enter_firstname')}
                            />
                        </Form.Item>
                    </Col>

                    <Col className="main_col" lg={8} md={24}>
                        <Form.Item
                            name="surename"
                            label={t('surename')}
                            normalize={(value) => value?.toUpperCase()}
                            rules={[{ required: true, message: '' }]}
                        >
                            <Input
                                prefix={<IoPerson />}
                                className="login_input"
                                placeholder={t('enter_surename')}
                            />
                        </Form.Item>
                    </Col>

                    <Col className="main_col" lg={8} md={24}>
                        <Form.Item
                            name="gender"
                            label={t('gender')}
                            rules={[{ required: true, message: '' }]}
                        >
                            <Select
                                style={{ width: '100%' }}
                                value={gender}
                                placeholder={t('enter_gender')}
                                prefix={gender ? <FaMale /> : <FaFemale />}
                                onChange={(value) => setGender(value)}
                                options={[
                                    { value: true, label: <> {t('male')}</> },
                                    { value: false, label: <>{t('female')}</> },
                                ]}
                            />
                        </Form.Item>
                    </Col>

                    <Col className="main_col" lg={8} md={24}>
                        <Form.Item
                            label={t('phone_number')}
                            name="phone"
                            wrapperCol={{ span: 24 }}
                            rules={[{ required: true, message: '' }, { len: 19, message: '' }]}
                        >
                            <Cleave
                                value={phoneValue}
                                onChange={(e) => setPhoneValue(e.target.value)}
                                options={{
                                    prefix: '+998',
                                    delimiters: [' (', ') ', '-', '-'],
                                    blocks: [4, 2, 3, 2, 2],
                                    numericOnly: true,
                                }}
                                placeholder="+998 (__) ___-__-__"
                                className="ant-input claveInput"
                                style={{ width: '100%' }}
                            />
                        </Form.Item>
                    </Col>

                    <Col className="main_col" lg={8} md={24}>
                        <Form.Item
                            name="regioname"
                            label={t('region')}
                            rules={[{ required: true, message: '' }]}
                        >
                            <Select
                                style={{ width: '100%' }}
                                placeholder={t('enter_region')}
                                onChange={(value) => {
                                    form.setFieldsValue({ districtname: undefined });
                                    fetchDistricts(Number(value));
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

                    <Col className="main_col" lg={8} md={24}>
                        <Form.Item
                            name="districtname"
                            label={t('district')}
                            rules={[{ required: true, message: '' }]}
                        >
                            <Select
                                style={{ width: '100%' }}
                                placeholder={t('enter_district')}
                                labelInValue
                                options={districts?.map((item) => ({
                                    value: item.id,
                                    label: i18n.language === 'ru'
                                        ? item.nameRu
                                        : (i18n.language === 'en' ? item.nameEn : item.nameUz),
                                }))}
                            />
                        </Form.Item>
                    </Col>

                    <Col className="main_col" lg={16} md={24}>
                        <Form.Item
                            name="address"
                            label={t('addres')}
                            normalize={(value) => value?.toUpperCase()}
                            rules={[{ required: true, message: '' }]}
                        >
                            <Input
                                prefix={<AiFillHome />}
                                className="login_input"
                                placeholder={t('enter_addres')}
                            />
                        </Form.Item>
                    </Col>

                    <div className="save-pat-data">
                        <Col className="main_col" lg={8} md={24}>
                            <div className="form_div">
                                <Button className="btn_form" loading={loading} htmlType="submit">
                                    {t('saveData')}
                                </Button>
                            </div>
                        </Col>
                    </div>
                </Row>
            </Form>
        </div>
    );
}
