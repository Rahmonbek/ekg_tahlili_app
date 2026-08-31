import { Avatar, Button, Table, Tooltip } from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { get_doctors_of_clinic } from '../../../../host/requests/DoctorRequest'
import { imgApi } from '../../../../host/Host'
import { formatPhoneNumberForForm , rowNumber } from '../../../../tools/formatters'
import male from '../../../../images/avatars/male.jpg'
import female from '../../../../images/avatars/female.jpg'
import { Link } from 'react-router-dom'
import { FaPencil } from 'react-icons/fa6'
import { doctorsTour } from '../../../../tools/tourSteps'
import { usePageTour } from '../../../../components/shared/TourProvider';
import useDocumentTitle from '../../../../tools/useDocumentTitle';



export default function Doctors() {
    // Qo'llanma qadamlari ro'yxatdan o'tkaziladi; tugma header'da
    usePageTour(doctorsTour);
    const {t}=useTranslation()
    useDocumentTitle(t('staffs', { defaultValue: "Xodimlar" }))
    const [doctors, setdoctors]=useState([])
    const [loading, setloading]=useState(true)
    const PAGE_SIZE = 10
    const [page, setpage]=useState(1)
    const [total, settotal]=useState(0)

    const columns = [
  {
    // `key+1` sahifa siljishini hisobga olmasdi: 2-sahifada raqamlar
    // yana 1 dan boshlanardi.
    title: '#',
    key: 'index',
    align: 'center',
    width: 60,
    render: rowNumber(page, PAGE_SIZE)
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
    // 50 px avatar qatorlarni keraksiz balandlashtirardi
    render:((item, record)=>(<Avatar size={34} src={item ? `${imgApi}${item}` : (record.gender ? male : female)} />)),
    width:56
  },
  {
    title: t("FIO"),
    dataIndex: '',
    key: 'fio',
    // Jadvalda faqat familiya va ism (otasining ismisiz).
    // Ismi hali to'ldirilmagan xodim qatori butunlay bo'sh ko'rinardi —
    // foydalanuvchi buni "buzilgan qator" deb o'ylardi.
    render:((item, key)=>{
      const name = [item.lastName, item.firstName].filter(Boolean).join(" ")
      return name || <span style={{ color: '#cbd5e1' }}>{t('user_no_name', { defaultValue: "Ismni to'ldiring" })}</span>
    })
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
    render:((item, key)=>(item ? item[`name${t("data_lang")}`] : <span style={{ color: '#cbd5e1' }}>—</span>))
  },
  {
    // Ilgari jadvalda faqat tizim roli ko'rinardi va xodimning tibbiy
    // mutaxassisligi umuman chiqmasdi — holbuki "kim kardiolog?" degan
    // savol kundalik ish uchun rolga qaraganda muhimroq (T-021)
    title: t("specialization"),
    dataIndex: 'positions',
    key: 'positions',
    render:((items)=>{
      if (!Array.isArray(items) || items.length === 0) {
        return <span style={{ color: '#cbd5e1' }}>—</span>
      }
      return items.map((p)=>p[`name${t("data_lang")}`]).filter(Boolean).join(', ')
    })
  },
  {
    title: "",
    dataIndex: 'id',
    key: 'edit',
    align:'center',
    width: 60,
    // Ilgari to'q sariq (#fbb510) to'ldirilgan tugma edi — u dizayn
    // tizimiga ham, boshqa ro'yxatlardagi ikonka tugmalarga ham mos kelmasdi
    render:((item, key)=>(<Tooltip title={t("edit")}>
            <Link to={'/doctor/create/'+item}>
              <Button type="text" size="small" icon={<FaPencil />} aria-label={t("edit")} />
            </Link>
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
            {/* Tugma sarlavha qatorida — boshqa ro'yxat sahifalari bilan
                bir xil joylashuv. Ilgari u pastda alohida qatorda turardi
                va sarlavha bilan orasida katta bo'sh joy qolardi. */}
            <h1>
                <span>{t("staffs")}</span>
                <Link
                  to={"/doctor/create"}
                  className='btn_form'
                  data-tour="doctors-add"
                  style={{ width: 'auto', padding: '0 24px', marginTop: 0 }}
                >
                  {t("add_new_staff")}
                </Link>
            </h1>
               <div className="main_card_content big_card_content">
        <div className='doctors_table' data-tour="doctors-table">
                   <Table
      scroll={{ x: "max-content" }}
                   // Busiz antd qatorlarga indeks bo'yicha kalit beradi va
                   // konsolda "unique key" ogohlantirishi chiqadi. Sahifa
                   // almashganda React eski qatorni qayta ishlatib, xodim
                   // ma'lumotlari aralashib ketishi mumkin (T-067)
                   rowKey={(record) => record.id}
                   loading={loading}
                   pagination={{
                    current:page,
                    pageSize:PAGE_SIZE,
                    total:total,
                    onChange:setpage
                   }} dataSource={doctors} columns={columns} />
                   </div>
               </div>
            </div>
    </div>
  )
}
