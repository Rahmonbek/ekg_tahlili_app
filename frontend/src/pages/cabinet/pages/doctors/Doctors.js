import { Table, Tooltip } from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IoAlertCircleSharp } from 'react-icons/io5'
import { MoonLoader } from 'react-spinners'
import { get_doctors_of_clinic } from '../../../../host/requests/DoctorRequest'
import { formatPhoneNumberForForm } from '../../../../tools/formatters'




export default function Doctors() {
    const {t}=useTranslation()
    const [doctors, setdoctors]=useState([])
    const [loading, setloading]=useState(true)
    const [page, setpage]=useState(1)

    const columns = [
  {
    title: '#',
    dataIndex: 'id',
    key: 'T/r',
    render:(item, data, key)=>(key+1)
  },
  {
    title: t("FIO"),
    dataIndex: '',
    key: 'fio',
    render:((item, key)=>(item.lastName+" "+item.firstName+" "+item.sureName))
  },
  {
    title: t("username"),
    dataIndex: 'username',
    key: 'username',
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
    render:((item, key)=>(formatPhoneNumberForForm(item)))
  }
];

    useEffect(()=>{
       getDoctors()
    }, [page])
    const getDoctors=async()=>{
          try{
             var res=await get_doctors_of_clinic({page:page})
             console.log(res)
             setdoctors(res.data.data)
          }catch(err){

          }
    }
  return (
    <div>

        <div className="main_card">
               <div className="main_card_content big_card_content">
                   <Table dataSource={doctors} columns={columns} />
               </div>
            </div>
    </div>
  )
}
