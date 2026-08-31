import React from 'react';
import { Button, Col, Form, Input, Row } from 'antd';
import { useTranslation } from 'react-i18next';
import { FaAddressCard } from 'react-icons/fa6';
import DateField from './DateField';

/**
 * Bemor qidirish formasi — passport + tug'ilgan sana.
 * EcgAnalyzer, LabAnalyzer, HolterAnalyzer, SmadAnalyzer larda ishlatiladi.
 * 
 * Props:
 *   form       — Ant Design Form instance
 *   onFinish   — form submit handler (searchPatcient)
 *   onReset    — form qiymatlar o'zgarganda reset
 *   loading    — submit loading holati
 */
export default function PatientSearchSection({ form, onFinish, onReset, loading }) {
    const { t } = useTranslation();

    return (
        <Form
            form={form}
            data-tour="analyzer-patient"
            onValuesChange={onReset}
            name="patientSearch"
            labelCol={{ span: 24 }}
            wrapperCol={{ span: 24 }}
            initialValues={{ remember: true }}
            onFinish={onFinish}
        >
            <Row>
                <Col className="main_col" lg={8} xs={24} sm={24} md={12}>
                    <Form.Item
                        name="passport"
                        label={t('passport_seria')}
                        rules={[
                            { required: true, message: t('field_required') },
                            {
                                validator: (_, value) => {
                                    const normalized = (value || '').replace(/[^0-9A-Za-zА-Яа-яЁё]/g, '');
                                    if (normalized.length < 3) {
                                        return Promise.reject(new Error(''));
                                    }
                                    return Promise.resolve();
                                }
                            }
                        ]}
                        getValueFromEvent={(event) => {
                            const rawValue = event?.target?.value || '';
                            return rawValue
                                .replace(/[^0-9A-Za-zА-Яа-яЁё/\-\s]/g, '')
                                .replace(/\s{2,}/g, ' ')
                                .toUpperCase();
                        }}
                    >
                        <Input
                            prefix={<FaAddressCard />}
                            className="login_input"
                            placeholder={t('enter_passport_seria')}
                            maxLength={24}
                        />
                    </Form.Item>
                </Col>

                <Col className="main_col" lg={8} xs={24} sm={24} md={12}>
                    <Form.Item
                        name="birthdate"
                        label={t('birthdate')}
                        rules={[{ required: true, message: t('field_required') }]}
                    >
                        {/* Tug'ma `<input type="date">` brauzer tiliga bo'ysunardi:
                            interfeys o'zbekcha bo'lsa ham ruscha `дд.мм.гггг` chiqardi.
                            DateField forma qiymatini `YYYY-MM-DD` satr holida saqlaydi,
                            shuning uchun yuborish mantig'i o'zgarmaydi. */}
                        <DateField />
                    </Form.Item>
                </Col>

                <Col className="main_col" lg={6} xs={24} sm={24} md={12}>
                    <div className="form_div">
                        <Button className="btn_form" loading={loading} htmlType="submit">
                            {t('search_patcient')}
                        </Button>
                    </div>
                </Col>
            </Row>
        </Form>
    );
}
