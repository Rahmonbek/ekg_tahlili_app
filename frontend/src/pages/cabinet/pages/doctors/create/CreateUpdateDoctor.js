import { Button, Col, Form, Input, message, Row, Tooltip } from 'antd';
import Cleave from 'cleave.js/react';
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next';
import { Select } from 'antd';
import { FaFemale, FaMale } from 'react-icons/fa';
import { IoAlertCircleSharp, IoPerson } from 'react-icons/io5';
import { useStore } from '../../../../../store/Store';
import { change_doctor_data, get_default_username, get_doctor_by_id, get_params_for_add_staff } from '../../../../../host/requests/DoctorRequest';
import { FaUserDoctor } from 'react-icons/fa6';
import { checkusername } from '../../../../../host/requests/AuthRequest';
import { IoMdLock } from 'react-icons/io';
import { formatPhoneNumber, formatPhoneNumberForForm } from '../../../../../tools/formatters';
import { useNavigate, useParams } from 'react-router-dom';

export default function CreateUpdateDoctor() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [gender, setGender] = useState(true);
    const [doctor, setdoctor] = useState(null);
    const [user_id, setuser_id] = useState(null);
    const [role_id, setrole_id] = useState(null);
    const [position_ids, setposition_ids] = useState([]);
    const [position_datas, setposition_datas] = useState([]);
    const [form] = Form.useForm();
    const {roles, positions, setroles, setpositions, setloader}=useStore()
    const {id}=useParams()
    const navigate=useNavigate()
      const [usernameError, setUsernameError] = useState(null);

    useEffect(()=>{
        setloader(true)
       if(roles.length==0 || positions.length==0){
           getParamsData()
       }
       if(id==null){
          getUsername()
       }else{
        if(doctor==null){
getDoctorData()
        }
         
       }
       if(role_id!=null){
        changeRole(role_id)
       }
    }, [id, positions])

    const getDoctorData=async()=>{

          try{
      
            var res=await get_doctor_by_id({id:id})
            
             setloader(false)
             var val=res.data
             setdoctor(val)
             var a=val.positions.map((item)=>(item.id))
             console.log(a)
             setuser_id(val.userId)
             form.setFieldsValue({
              "username": val.username,
  "password": val.password,
  "role": val.roleId,
  "firstname":  val.firstName,
  "lastname": val.lastName,
  "surename": val.sureName,
  "phone": formatPhoneNumberForForm(val.phone),
  "gender": val.gender,
  "positions": a
             })  
             
             setposition_ids([...a])
             changeRoleFirst(val.roleId)
             setrole_id(val.roleId)
             
        }catch(err){
         console.log(err)
        }
    }
    const getUsername=async()=>{
        try{
             var res=await get_default_username()
             console.log(res)
             form.setFieldValue('username', res.data.username)
             setloader(false)

        }catch(err){

        }
    }
    const getParamsData=async()=>{
        try{
           var res=await get_params_for_add_staff()
           setpositions([...res.data.positions])
           setroles(res.data.roles)
console.log(form.getFieldValue('role'))
           
           if(id!=null){
changeRole(form.getFieldValue('role'))
           }
           
        }catch(err){

        }
    }

    const changeRole=(val)=>{
      console.log(val, positions)
        setposition_ids([])
        form.setFieldValue('positions', [])
        let a=positions.filter((item)=>(item.roleId==val))
        if(a.length==1){
            setposition_ids([a[0].id])
            form.setFieldValue('positions', [a[0].id])
        }
        console.log(a)
        setposition_datas([...a])
    }

     const changeRoleFirst=(val)=>{
     
        let a=positions.filter((item)=>(item.roleId==val))
        if(a.length==1){
            setposition_ids([a[0].id])
            form.setFieldValue('positions', [a[0].id])
        }
        setposition_datas([...a])
    }

    const saveData=async(val)=>{
          try{
             setLoading(true)
             const checkRes = await checkusername({username:val.username, user_id:user_id});
             if(checkRes.data.exists === true){
                setUsernameError(t(checkRes.data.message))
                message.error(t(checkRes.data.message))
             }else{
                  var data={
                    'id':id,
  "username": val.username,
  "password": val.password,
  "roleId": val.role,
  "firstName":  val.firstname,
  "lastName": val.lastname,
  "sureName": val.surename,
  "phone": formatPhoneNumber(val.phone),
  "gender": val.gender,
  "positions": val.positions.map((item)=>({id:item}))}
   var res=await change_doctor_data(data)
   message.success(t("data_saved"))
   navigate("/doctor")
             console.log(res)
             }
            
          }catch(err){
 message.danger(t("server_error"))
          }finally{
            setLoading(false)
          }
    }
  return (
    <div>
         <div className="main_card">
        <h1>{t('add_new_staff')} <Tooltip placement="bottomRight" title={t("alert_staff_change")}>
                <span className='alert_icon'><IoAlertCircleSharp /></span>
            </Tooltip></h1>
        <div className="main_card_content  create_doctor_box">
            <Form
                form={form}
                name="basic1"
                labelCol={{ span: 24 }}
                wrapperCol={{ span: 24 }}
                initialValues={{ remember: true }}
                onFinish={saveData}
              >
                <Row>
                    <Col className="main_col" lg={8} xs={24} sm={24} md={24} >
                    <Form.Item
    name="username"
    label={t("username")}
    validateStatus={usernameError ? "error" : ""}
    help={usernameError || ""}
    rules={[
      {
        required: true,
        message: t("please_enter_username_staff"),
      },
    ]}
    normalize={(value) => {
      return value ? value.replace(/[.,!? ]/g, '') : '';
    }}
  >
    <Input
      prefix={<IoPerson />}
      autoComplete="new-password"
      placeholder={t("enter_username_staff")}
      onChange={() => setUsernameError("")} 
    />
  </Form.Item>
                    </Col>
                    <Col className="main_col" lg={8} xs={24} sm={24} md={24}>
                    <Form.Item
      name="password"
      label={t("new_password")}
      rules={[
        {
          required: true,
          message: "",
        },
      ]}
      normalize={(value) => {
        return value ? value.replace(/[.,!? ]/g, '') : '';
      }}
    >
      <Input prefix={<IoMdLock />} className='login_input'  placeholder={t("enter_new_password_staff")} autoComplete="new-password"/>
    </Form.Item>
                    </Col>
                    <Col className="main_col" lg={8} xs={24} sm={24} md={24}></Col>
                  <Col className="main_col" lg={8} xs={24} sm={24} md={24}>
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

                  <Col className="main_col" lg={8} xs={24} sm={24} md={24}>
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

                  <Col className="main_col" lg={8} xs={24} sm={24} md={24}>
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

                  <Col className="main_col" lg={8} xs={24} sm={24} md={24}>
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

                  <Col className="main_col" lg={8} xs={24} sm={24} md={24}>
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
                  <Col className="main_col" lg={8} xs={24} sm={24} md={24}></Col>
                     <Col className="main_col" lg={8} xs={24} sm={24} md={24}>
                     <Form.Item
                      name="role"
                      label={t('role')}
                      value={role_id}
                      rules={[{ required: true, message: '' }]}
                    >
                      <Select
                        style={{ width: '100%' }}
                         
                        prefix={<FaUserDoctor />}
                        onChange={(value) => {changeRole(value); setrole_id(value)}}
                        placeholder={t('enter_role_staff')}
                         options={roles.map(role => ({
    value: role.id,
    label: role.nameUz,
  }))}
                        
                      />
                    </Form.Item>
                     </Col>
                     <Col className="main_col" lg={16} xs={24} sm={24} md={24}>
                     <Form.Item
                      name="positions"
                      label={t('position')}
                      rules={[{ required: true, message: '' }]}
                    >
                     <Select
                   value={position_ids}
                        onChange={(val)=>{setposition_ids(val); console.log(val)}}
                        style={{ width: '100%' }}
                        mode="multiple"
                          showSearch
                        optionFilterProp="label"
                        prefix={<FaUserDoctor />}
                        placeholder={t('enter_position_staff')}
                       options={position_datas.map(role => ({
    value: role.id,
    label: role.nameUz,
  }))}
  filterOption={(input, option) =>
    option?.label?.toLowerCase().includes(input.toLowerCase())


}
                        
                      />

                    </Form.Item>
                    </Col>
                  <Col className="main_col" lg={8} xs={24} sm={24} md={24}></Col>
                  <Col className="main_col" lg={8} xs={24} sm={24} md={24}>
                    <div className="form_div">
                      <Button className="btn_form" loading={loading} htmlType="submit">
                        {t('saveDataStaff')}
                      </Button>
                    </div>
                  </Col>
                  <Col className="main_col" lg={8} xs={24} sm={24} md={24}></Col>
                </Row>
              </Form>
        </div>
        </div>
    </div>
  )
}
