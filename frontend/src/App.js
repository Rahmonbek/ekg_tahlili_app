import React, { useEffect, useState } from 'react'
import './App.css'
import './Ekg.css'
import Auth from './pages/auth/Auth'
import { useTranslation } from 'react-i18next';
import './locale/i18next'
import { useStore } from './store/Store'
import Main from './pages/cabinet/Main'

import { deleteTokenAccess } from './host/Host'
import {useNavigate} from 'react-router-dom'
import { get_user_data, send_doc_data } from './host/requests/UserRequest';
import { Button, Col, Form, Input, Modal, Row, Select } from 'antd';
import { IoPerson } from 'react-icons/io5';

import { FaFemale, FaMale } from 'react-icons/fa';
import Cleave from 'cleave.js/react';
export default function App() {
  const {t}=useTranslation()
  const {user_id, setuser_id, user, setuser}=useStore()
  const [first_load, setfirst_load]=useState(false)
  const navigate=useNavigate()
  const [form] = Form.useForm(); 
  const [gender, setGender] = useState(true);

  const showProfileModal =
  user_id != null && user?.doctor?.firstName === null;

  useEffect(()=>{

    const token=window.localStorage.getItem("NMED_token")
    if(token!=null){
      if(user==null){
getUserData()
      }
      
    

    }else{
      navigate("/")
       setfirst_load(true)
    }
   
    }, [user_id])

 
 const formatPhoneNumber = (phone) => {
  if (phone) {
    return phone
      .replaceAll("+", "")
      .replaceAll("(", "")
      .replaceAll(")", "")
      .replaceAll("-", "")
      .replaceAll(" ", "");
  } else {
    return null;
  }
};


const onFinishProfile = async (values) => {
  try {
    const userId = user?.id;
    const doctorId = user?.doctor?.id;
    const roleId = user?.roleId;

   
    const formattedPhone = formatPhoneNumber(values.phone);

    await send_doc_data({
      id:doctorId,
      userId,
      roleId,
      ...values,
      phone: formattedPhone, 
    });

    await getUserData();

    console.log("Profil muvaffaqiyatli yangilandi!");
  } catch (e) {
    console.log("Xatolik:", e);
  }
};

    
    


    const getUserData=async()=>{
      try{
         var res=await get_user_data()
         setuser(res.data)
         setuser_id(res.data.id)
         setfirst_load(true)
         console.log(res)
      }catch(err){
        console.log(err)
            deleteTokenAccess()
            navigate('/')
      }finally{

      }
    }
  return (
<>

{first_load && (
  <div className="main_app">
    {user_id == null ? <Auth /> : <Main />}

    {/* PROFILE TO‘LDIRISH MODALI */}
    <Modal
      open={showProfileModal}
      footer={null}
      closable={false}
      maskClosable={false}
     centered
    >
<div className='doctor_info_modal'>

      <Form
        form={form}
        name="completeProfile"
        layout="vertical"
        onFinish={onFinishProfile}
        
      >
        <Row gutter={16} className='ant_rows'>

<div className='modal-text'>
<h1>Shifoxona administratorining ma’lumotlarini kiriting.</h1>
<p>Tizimdan foydalanish uchun admin ma'lumotlarini kiritishingiz shart</p>
</div>


          <Col lg={8} md={24} >
            <Form.Item
            className='antd_modal_inputs'
              name="lastname"
              label={t('lastname')}
              normalize={(v) => v?.toUpperCase()}
              rules={[{ required: true }]}
            >
              <Input prefix={<IoPerson />} />
            </Form.Item>
          </Col>

          <Col lg={8} md={24} >
            <Form.Item
             className='antd_modal_inputs'
              name="firstname"
              label={t('firstname')}
              normalize={(v) => v?.toUpperCase()}
              rules={[{ required: true }]}
            >
              <Input prefix={<IoPerson />} />
            </Form.Item>
          </Col>

          <Col lg={8} md={24}>
            <Form.Item
             className='antd_modal_inputs'
              name="surename"
              label={t('surename')}
              normalize={(v) => v?.toUpperCase()}
              rules={[{ required: true }]}
            >
              <Input prefix={<IoPerson />} />
            </Form.Item>
          </Col>

          <Col lg={8} md={24}>
            <Form.Item
             className='antd_modal_inputs'
              label={t('phone_number')}
              name="phone"
              rules={[{ required: true }, { len: 19 }]}
            >
              <Cleave
                options={{
                  prefix: '+998',
                  delimiters: [' (', ') ', '-', '-'],
                  blocks: [4, 2, 3, 2, 2],
                  numericOnly: true,
                }}
                className="ant-input modal_number_input"
              />
            </Form.Item>
          </Col>


          <Col className="main_col" lg={8} md={24}>
                    <Form.Item
                     className='antd_modal_inputs'
                      name="gender"
                      label={t('gender')}
                      rules={[{ required: true, message: '' }]}
                    >
                      <Select
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
         

          <Col span={24}>
            <Button
            className='modal_button'
              type="primary"
              htmlType="submit"
              block
            >
              {t('saveData')}
            </Button>
          </Col>
        </Row>
      </Form>
      </div>
    </Modal>
  </div>
)}
    </>

  )
}
