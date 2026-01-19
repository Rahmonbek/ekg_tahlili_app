import React, { useState } from 'react'
import { IoIosArrowBack, IoIosArrowDown } from 'react-icons/io'
import { formatDateTime } from '../../tools/formatters'
import { useTranslation } from 'react-i18next'
import { Button } from 'antd'
import { apiEcg } from '../../host/Host'

export default function DiagnosesResult({ data }) {
    const [open, setopen]=useState(false)
    const {t}=useTranslation()

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = data.diagnoseFileLink; // Backdan kelgan manzilingiz
        link.setAttribute('download', 'diagnose_file.jpg'); // Yuklanadigan fayl nomi
        document.body.appendChild(link);
        link.click();
        link.remove();
      };
  return (
    <div>
        <div className={`old_analyse main_card ${open?"opened_main_card":"closed_main_card"} `}>
        <h1  onClick={()=>{setopen(!open)}}><p>
          
        {formatDateTime(data.createdAt)} </p>
          <p>
          <p className='diagnos_doctor_role'>
        {data?.mainDoctor?.role[`name${t("data_lang")}`]}
  </p>
 <span>{open?<IoIosArrowDown />:<IoIosArrowBack />}</span>
</p>
        </h1>
     
        {open && (
  <div className="main_card_content">
    {data?.createdDoctor && (
     <div>
     <div className='doctor_of_created_diagnoses'>
        <p className="ecg_label">{t("doctor_of_created_diagnoses")}</p>
        <p className="ecg_label ecg_label2">
            {data.createdDoctor.lastName} {data.createdDoctor.firstName}
          </p>
      </div>
        <div className='see_diagnos_file'> 
   
  <a target='blank' href={`${apiEcg}`+data.diagnoseFileLink} className="btn_form mini_btn_main" >Tashxis faylini ko'rish</a>

      </div>
      </div>
    )}
  </div>
)}


        </div>
        
    </div>
  )
}
