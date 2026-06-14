import React, { useEffect, useState } from 'react'
import { Button, Col, Form, Input, message, Modal, Row, Select } from 'antd';
import { IoPerson } from 'react-icons/io5';

import { FaFemale, FaMale } from 'react-icons/fa';
import Cleave from 'cleave.js/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { send_doc_data } from '../host/requests/UserRequest';
import { formatPhoneNumber, formatPhoneNumberForForm, formatPhoneNumberForForm1 } from '../tools/formatters';
import { useStore } from '../store/Store';
export default function AdminModal() {
    const {t}=useTranslation()
  const {user_id, setuser_id, user, setuser, open_admin_modal, setopen_admin_modal}=useStore()
  const [first_load, setfirst_load]=useState(false)
  const navigate=useNavigate()
  const [phoneValue, setPhoneValue] = useState('');
  const [form] = Form.useForm(); 
  const [gender, setGender] = useState(true);
  const [number, setnumber] = useState(1);


  useEffect(()=>{
    if (open_admin_modal) {
    const formatted = formatPhoneNumberForForm(user.doctor.phone);
    setPhoneValue(formatted);
    form.setFieldsValue({
      gender: user?.doctor?.gender,
      surename: user?.doctor?.sureName,
      lastname: user?.doctor?.lastName,
      firstname: user?.doctor?.firstName,
      phone: formatted,
    });
  }
 
    
    
  }, [user, open_admin_modal])

  const onFinishProfile = async (values) => {
    try {
      const userId = user?.id;
      const doctorId = user?.doctor?.id;
      const roleId = user?.roleId;

      const formattedPhone = formatPhoneNumber(values.phone);

      // [FromForm] DTO PascalCase field nomlarini talab qiladi
      const formData = new FormData();
      if (doctorId) formData.append('Id', doctorId);
      formData.append('UserId', userId);
      formData.append('RoleId', roleId);
      formData.append('FirstName', values.firstname || '');
      formData.append('LastName', values.lastname || '');
      formData.append('SureName', values.surename || '');
      formData.append('Phone', formattedPhone || '');
      formData.append('Gender', values.gender ? 'true' : 'false');

      await send_doc_data(formData);

      setopen_admin_modal(false)
      message.success(t("data_saved"))
    } catch (e) {
      console.log("Xatolik:", e);
      message.error(t("server_error"))
    }
  };
  
  


  return (
    <Modal
    open={open_admin_modal}
    footer={null}
    onCancel={()=>{setopen_admin_modal(false)}}
    closable={user?.doctor!=null && user?.doctor?.firstName!=null}
    maskClosable={user?.doctor!=null && user?.doctor?.firstName!=null}
   centered
   width={{
    xs: '90%',
    sm: '90%',
    md: '70%',
    lg: '50%',
    xl: '40%',
    xxl: '30%',
  }}
  >
<div>

<div className='modal-text'>
<h1>{t("self_data_add")}</h1>
{!(user?.doctor!=null && user?.doctor?.firstName!=null)?<p>{t("required_self_data")}</p>:<></>}
</div>
    <Form
      form={form}
      name="completeProfile"
      layout="vertical"
      onFinish={onFinishProfile}
      labelCol={{ span: 24 }}
            wrapperCol={{ span: 24 }}
            initialValues={{ remember: true }}
    >


      <Row>



        <Col lg={24} xs={24} sm={24} md={24} >
          <Form.Item
          className=''
            name="lastname"
            label={t('lastname')}
            normalize={(v) => v?.toUpperCase()}
            rules={[{ required: true }]}
          >
            <Input prefix={<IoPerson />} 
            className="login_input"
            placeholder={t('enter_lastname_staff')}/>
          </Form.Item>
        </Col>

        <Col lg={24} xs={24} sm={24} md={24} >
          <Form.Item
           className=''
            name="firstname"
            label={t('firstname')}
            normalize={(v) => v?.toUpperCase()}
            rules={[{ required: true }]}
          >
            <Input prefix={<IoPerson />}   className="login_input"
                      placeholder={t('enter_firstname_staff')}/>
          </Form.Item>
        </Col>

        <Col lg={24} xs={24} sm={24} md={24}>
          <Form.Item
           className=''
            name="surename"
            label={t('surename')}
            normalize={(v) => v?.toUpperCase()}
            rules={[{ required: true }]}
          >
            <Input prefix={<IoPerson />} 
                className="login_input"
                placeholder={t('enter_surename_staff')}/>
          </Form.Item>
        </Col>
        <Col lg={24} xs={24} sm={24} md={24}>
                  <Form.Item
                   className=''
                    name="gender"
                    label={t('gender')}
                    rules={[{ required: true, message: '' }]}
                  >
                    <Select
                    placeholder={t('enter_gender_staff')}
                    className="modal_select"
                      style={{ width: '100%' }}
                      value={gender}
                      prefix={gender?<FaMale />:<FaFemale />}
                      onChange={(value) => setGender(value)}
                      options={[
                        { value: true, label: <> {t('male')}</> },
                        { value: false, label: <>{t('female')}</> },
                      ]}
                    />
                  </Form.Item>
                </Col>
         
         <Col lg={24} xs={24} sm={24} md={24}>
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
                        value={phoneValue}
    onChange={(e) => setPhoneValue(e.target.value)}
                        placeholder="+998 (__) ___-__-__"
                        className="ant-input claveInput"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>



       
                <Col lg={24} xs={24} sm={24} md={24}>
                <Form.Item
      wrapperCol={{
        span: 24,
      }}
    >
          <Button
          className='btn_form'
            htmlType="submit"
          >
            {t('saveDataStaff')}
          </Button>
        </Form.Item>
        </Col>
      </Row>
    </Form>
    </div>
  </Modal>

  )
}
