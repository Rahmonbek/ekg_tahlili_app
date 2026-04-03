import React from 'react';
import { Button, Col, Form, Input, Row } from 'antd';
import { useTranslation } from 'react-i18next';
import { FaAddressCard } from 'react-icons/fa6';
import InputMask from 'react-input-mask';

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
            onValuesChange={onReset}
            name="patientSearch"
            labelCol={{ span: 24 }}
            wrapperCol={{ span: 24 }}
            initialValues={{ remember: true }}
            onFinish={onFinish}
        >
            <Row>
                <Col className="main_col" lg={8} md={12}>
                    <Form.Item
                        name="passport"
                        label={t('passport_seria')}
                        rules={[{ required: true, message: '' }]}
                    >
                        <InputMask
                            mask="** 9999999"
                            maskChar={null}
                            alwaysShowMask={true}
                            beforeMaskedValueChange={(newState, oldState, userInput) => {
                                let { value } = newState;
                                if (userInput === '') {
                                    if (oldState.value && oldState.value.length > value.length) {
                                        return oldState;
                                    }
                                }
                                return { ...newState, value: value.toUpperCase() };
                            }}
                        >
                            {(props) => (
                                <Input
                                    {...props}
                                    prefix={<FaAddressCard />}
                                    className="login_input"
                                    placeholder={t('enter_passport_seria')}
                                />
                            )}
                        </InputMask>
                    </Form.Item>
                </Col>

                <Col className="main_col" lg={8} md={12}>
                    <Form.Item
                        name="birthdate"
                        label={t('birthdate')}
                        rules={[{ required: true, message: '' }]}
                    >
                        <input className="input_date" type="date" />
                    </Form.Item>
                </Col>

                <Col className="main_col" lg={6} md={12}>
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
