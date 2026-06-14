import { Button, Col, Form, Input, message, Row, Tooltip, Upload, Avatar } from 'antd';
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next';
import { Select } from 'antd';
import { FaFemale, FaMale } from 'react-icons/fa';
import { IoAlertCircleSharp, IoPerson } from 'react-icons/io5';
import { useStore } from '../../../../../store/Store';
import { change_doctor_data, get_doctor_by_id, get_params_for_add_staff } from '../../../../../host/requests/DoctorRequest';
import { FaUserDoctor } from 'react-icons/fa6';
import { checkphone } from '../../../../../host/requests/AuthRequest';
import { IoMdLock } from 'react-icons/io';
import { formatPhoneNumber, formatPhoneNumberForForm } from '../../../../../tools/formatters';
import { useNavigate, useParams } from 'react-router-dom';
import PhoneInput from '../../../../../components/shared/PhoneInput';
import { imgApi } from '../../../../../host/Host';
import maleAvatar from '../../../../../images/avatars/male.jpg';
import femaleAvatar from '../../../../../images/avatars/female.jpg';

export default function CreateUpdateDoctor() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [gender, setGender] = useState(true);
    const [position_ids, setposition_ids] = useState([]);
    const [position_datas, setposition_datas] = useState([]);
    const [form] = Form.useForm();
    const {roles, positions, setroles, setpositions, setloader}=useStore()
    const {id}=useParams()
    const navigate=useNavigate()
    const [phoneError, setPhoneError] = useState(null);
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);

    useEffect(()=>{
        let isMounted = true;

        const loadPageData = async () => {
            setloader(true);
            try {
                let availablePositions = positions;

                if (roles.length === 0 || positions.length === 0) {
                    const params = await getParamsData();
                    availablePositions = params ?? [];
                }

                if (id != null) {
                    const doctorData = await getDoctorData();
                    if (isMounted && doctorData?.roleId != null) {
                        bindRolePositions(doctorData.roleId, availablePositions, doctorData.positions?.map(item => item.id) ?? []);
                    }
                }
            } catch (err) {
                message.error(t(err?.response?.data?.message || 'server_error'));
            } finally {
                if (isMounted) {
                    setloader(false);
                }
            }
        };

        loadPageData();

        return () => {
            isMounted = false;
        };
    }, [id])

    const getDoctorData=async()=>{

          try{
      
            var res=await get_doctor_by_id({id:id})
             var val=res.data
             var a=val.positions.map((item)=>(item.id))
             form.setFieldsValue({
  "password": val.password || "",
  "role": val.roleId,
  "firstname":  val.firstName,
  "lastname": val.lastName,
  "surename": val.sureName,
  "phone": formatPhoneNumberForForm(val.phone),
  "gender": val.gender,
  "positions": a
             })  
             
             setposition_ids([...a])
             setGender(val.gender)
             setAvatarPreview(val.avatar ? `${imgApi}${val.avatar}` : null)
             return val;
        }catch(err){
         console.log(err)
         throw err
        }
    }
    const getParamsData=async()=>{
        try{
           var res=await get_params_for_add_staff()
           setpositions([...res.data.positions])
           setroles(res.data.roles)
           return res.data.positions
        }catch(err){
           throw err
        }
    }

    const bindRolePositions=(roleIdValue, availablePositions = positions, selectedPositionIds = [])=>{
        const filteredPositions = availablePositions.filter((item)=>(item.roleId === roleIdValue))
        const nextPositionIds = selectedPositionIds.length > 0
            ? selectedPositionIds
            : filteredPositions.length === 1
                ? [filteredPositions[0].id]
                : [];

        setposition_datas([...filteredPositions])
        setposition_ids(nextPositionIds)
        form.setFieldValue('positions', nextPositionIds)
    }

    const changeRole=(val)=>{
        bindRolePositions(val)
    }

    const getAvatarFallback = () => avatarPreview || (gender ? maleAvatar : femaleAvatar);

    const handleAvatarUpload = (file) => {
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
        return false;
    };

    const saveData=async(val)=>{
          try{
             setLoading(true)
             const normalizedPhone = formatPhoneNumber(val.phone);
             const checkRes = await checkphone({phone: normalizedPhone, doctorId: id});
             if(checkRes.data.exists === true){
                setPhoneError(t(checkRes.data.message))
                message.error(t(checkRes.data.message))
             }else{
                  const data = new FormData();
                  if (id != null) {
                    data.append('Id', id);
                  }
                  data.append('Password', val.password || '');
                  data.append('RoleId', String(val.role));
                  data.append('FirstName', val.firstname);
                  data.append('LastName', val.lastname);
                  data.append('SureName', val.surename);
                  data.append('Phone', normalizedPhone);
                  data.append('Gender', String(val.gender));

                  (val.positions || []).forEach((item, index) => {
                    data.append(`Positions[${index}].Id`, String(item));
                  });

                  if (avatarFile) {
                    data.append('AvatarFile', avatarFile);
                  }

   var res=await change_doctor_data(data)
   message.success(t("data_saved"))
   navigate("/doctor")
             console.log(res)
             }
            
          }catch(err){
 message.error(t(err?.response?.data?.message || "server_error"))
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
                    <Col className="main_col" span={24}>
                      <div className="doctor-avatar-upload">
                        <Avatar size={88} src={getAvatarFallback()} />
                        <div className="doctor-avatar-upload-info">
                          <Upload
                            accept="image/*"
                            maxCount={1}
                            showUploadList={false}
                            beforeUpload={handleAvatarUpload}
                          >
                            <Button>{t('add_image')}</Button>
                          </Upload>
                        </div>
                      </div>
                    </Col>
                    <Col className="main_col" lg={8} xs={24} sm={24} md={24} >
                    <Form.Item
    name="phone"
    label={t("phone_number")}
    validateStatus={phoneError ? "error" : ""}
    help={phoneError || ""}
    rules={[
      {
        required: true,
        message: t("phone_required"),
      },
      { len: 19, message: t("phone_number_invalid") }
    ]}
  >
    <PhoneInput autoComplete="tel" onChange={() => setPhoneError("")} />
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
                    
                  </Col>
                  <Col className="main_col" lg={8} xs={24} sm={24} md={24}></Col>
                     <Col className="main_col" lg={8} xs={24} sm={24} md={24}>
                     <Form.Item
                      name="role"
                      label={t('role')}
                      rules={[{ required: true, message: '' }]}
                    >
                      <Select
                        style={{ width: '100%' }}
                         
                        prefix={<FaUserDoctor />}
                        onChange={changeRole}
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
                        onChange={(val)=>{setposition_ids(val)}}
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
