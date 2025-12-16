import { Button, Col, Form, Input, Row, Tooltip } from 'antd';
import Cleave from 'cleave.js/react';
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next';
import { Select } from 'antd';
import { FaFemale, FaMale } from 'react-icons/fa';
import { IoAlertCircleSharp, IoPerson } from 'react-icons/io5';
import { useStore } from '../../../../../store/Store';
import { get_params_for_add_staff } from '../../../../../host/requests/DoctorRequest';

export default function CreateUpdateDoctor() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [gender, setGender] = useState(true);
    const [form] = Form.useForm();
    const {roles, positions, setroles, setpositions}=useStore()


    useEffect(()=>{
       if(roles.length==0 || positions.length==0){
           getParamsData()
       }
    }, [])

    const getParamsData=async()=>{
        try{
           var res=await get_params_for_add_staff()
           setpositions(res.data.positions)
           setroles(res.data.roles)
        }catch(err){

        }
    }


    const saveData=async(val)=>{

    }
  return (
    <div>
         <div className="main_card">
        <h1>{t('add_new_staff')} <Tooltip placement="bottomRight" title={t("alert_staff_change")}>
                <span className='alert_icon'><IoAlertCircleSharp /></span>
            </Tooltip></h1>
        <div className="main_card_content">
            <Form
                form={form}
                name="basic1"
                labelCol={{ span: 24 }}
                wrapperCol={{ span: 24 }}
                initialValues={{ remember: true }}
                onFinish={saveData}
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
                        placeholder={t('enter_lastname_staff')}
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
                        placeholder={t('enter_firstname_staff')}
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
                        placeholder={t('enter_surename_staff')}
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
                        prefix={gender?<FaMale />:<FaFemale />}
                        onChange={(value) => setGender(value)}
                        placeholder={t('enter_gender_staff')}
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
                     <Col className="main_col" lg={8} md={24}></Col>
                     <Col className="main_col" lg={8} md={24}>
                     <Form.Item
                      name="gender"
                      label={t('gender')}
                      rules={[{ required: true, message: '' }]}
                    >
                      <Select
                        style={{ width: '100%' }}
                        value={gender}
                        prefix={gender?<FaMale />:<FaFemale />}
                        onChange={(value) => setGender(value)}
                        placeholder={t('enter_gender_staff')}
                        options={[
                          { value: true, label: <> {t('male')}</> },
                          { value: false, label: <>{t('female')}</> },
                        ]}
                      />
                    </Form.Item>
                     </Col>
                  <Col className="main_col" lg={8} md={24}>
                    <div className="form_div">
                      <Button className="btn_form" loading={loading} htmlType="submit">
                        {t('saveData')}
                      </Button>
                    </div>
                  </Col>
                </Row>
              </Form>
        </div>
        </div>
    </div>
  )
}
