import { Avatar, Button, Table, Tooltip } from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { get_doctors_of_clinic } from '../../../../host/requests/DoctorRequest'
import { imgApi } from '../../../../host/Host'
import { formatPhoneNumberForForm } from '../../../../tools/formatters'
import male from '../../../../images/avatars/male.jpg'
import female from '../../../../images/avatars/female.jpg'
import { Link } from 'react-router-dom'
import { FaPencil } from 'react-icons/fa6'



export default function Doctors() {
    const {t}=useTranslation()
    const [doctors, setdoctors]=useState([])
    const [loading, setloading]=useState(true)
    const [page, setpage]=useState(1)
    const [total, settotal]=useState(0)

    const columns = [
  {
    title: '#',
    dataIndex: 'id',
    key: 'T/r',
    align:'center',
    render:(item, data, key)=>(key+1)
  },
//   {
//     title:'',
//     dataIndex: 'gender',
//     key: 'gender',
//     render:((item, key)=>( <Avatar size={50} src={item?male:female} />)),
//     width:60
//   },
  {
    title:'',
    dataIndex: 'avatar',
    key: 'avatar',
    align:'center',
    render:((item, record)=>(<Avatar size={50} src={item ? `${imgApi}${item}` : (record.gender ? male : female)} />)),
    width:80
  },
  {
    title: t("FIO"),
    dataIndex: '',
    key: 'fio',
    render:((item, key)=>(item.lastName+" "+item.firstName+" "+item.sureName))
  },
  
  {
    title: t("password"),
    dataIndex: 'password',
    key: 'password',
  },
  {
    title: t("phone_number"),
    dataIndex: 'phone',
    key: 'phone',
     align:'center',
    render:((item, key)=>(formatPhoneNumberForForm(item)))
  },
  {
    title: t("role"),
    dataIndex: 'role',
    key: 'role',
    render:((item, key)=>(item?item[`name${t("data_lang")}`]:''))
  },
  {
    title: "",
    dataIndex: 'id',
    key: 'edit',
    align:'center',
    render:((item, key)=>(<Tooltip title={t("edit")}>
            <Link to={'/doctor/create/'+item}><Button type="primary" style={{background:'#fbb510'}} shape="square" icon={<FaPencil />} /></Link>
          </Tooltip>))
  }
];

    useEffect(()=>{
       getDoctors()
    }, [page])
    const getDoctors=async()=>{
          try{
             var res=await get_doctors_of_clinic({page:page})
             setdoctors(res.data.data)
             settotal(res.data.totalCount)
          }catch(err){
 
          }finally{
            setloading(false)
          }
    }
  return (
    <div>
        
        <div className="main_card">
            
               <div className="main_card_content big_card_content">
                <div className='main_card_btn'>
            <Link to={"/doctor/create"} className='btn_form'>{t("add_new_staff")}</Link>
        </div>
        <div className='doctors_table'>
                   <Table
                   loading={loading}
                   pagination={{
                    current:page,
                    pageSize:10,
                    total:total,
                    onChange:setpage
                   }} dataSource={doctors} columns={columns} />
                   </div>
               </div>
            </div>
    </div>
  )
}
