import parseAiResult from '../../../tools/aiResult';
import AnalysisResultBody from '../AnalysisResultBody';
import { Button, Image } from 'antd'
import { formatTimeStr } from 'antd/es/statistic/utils'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { calculateAge, formatDateTime } from '../../../tools/formatters'
import { IoIosArrowUp, IoIosArrowDown } from 'react-icons/io'
import { dangerAlert, warningAlert } from '../../../tools/Alerts'
import { analyzeEkgFileRetry } from '../../../host/EkgService'
import { useStore } from '../../../store/Store'
import { buildFileUrl } from '../../../host/Host'
import { FaDownload } from 'react-icons/fa6'
import ClinicHeader from '../ClinicHeader'
import { severityClass, severityLabel, severityIcon } from '../../../tools/severity';
import MeasurementsList from '../MeasurementsList';

// `showMeta`: klinika va shifokor ma'lumotlari. Ko'rish sahifalarida
// ular sahifa sarlavhasida chiqadi, shuning uchun u yerda o'chiriladi.
export default function HolterOldResult({data, initialOpen = false, showMeta = true}) {
  const [result, setresult]=useState(null)
  const [image, setimage]=useState(null)
  const [open, setopen]=useState(initialOpen)
  const {t}=useTranslation()
  const {ecg_btn_loading, setecg_btn_loading}=useStore()
  useEffect(()=>{
    const parsedResult = parseAiResult(data.aiAnswerData);
    setimage(data.analyseFileLink)
setresult(parsedResult);
  }, [data.aiAnswerData])

  const handleSubmit = async () => {

      try {
      warningAlert(t("please_wait"))
        setecg_btn_loading(true);
        const formData = new FormData();
        if(data.complaints!=null){
        data.complaints.forEach((f) => formData.append("complaint", f.nameUz));
        }
        if(data.patcient!=null){
        formData.append('gender', data.patcient.gender?"erkak":'ayol')
        formData.append('age', calculateAge(data.patcient.birthDate))
        }
       
        formData.append('lang', 'uz')
        formData.append('id', data.id)
        
            var res = await analyzeEkgFileRetry(formData);
        let parsedResult;
       try {
    // agar string bo'lsa JSON.parse qilamiz
    parsedResult =res.ai_response.raw?  typeof res.ai_response.raw === "string" 
      ? JSON.parse(res.ai_response.raw) 
      : res.ai_response.raw: typeof res.ai_response === "string" 
      ? JSON.parse(res.ai_response) 
      : res.ai_response;
  } catch (e) {
   parsedResult = res.ai_response;
  }
  setimage(res.ecg_image_url ?? res.ecg_png_base64)
  
  setresult(parsedResult);
        
      } catch (err) {
        dangerAlert(t("api_error"))
      } finally {
        setecg_btn_loading(false);
      }
    };
  return (
data!=null?<div className={`old_analyse main_card ${open?"opened_main_card":"closed_main_card"} ${result != null ? severityClass(result.automatic_analysis_bool) : 'unknown_analyse'}`}>
        <h1  onClick={()=>{setopen(!open)}}><p>
          
          {data.analysisDate ? <span><b>{t('analysis_date')}:</b> {formatDateTime(data.analysisDate)}</span> : formatDateTime(data.createdAt)}  </p>
          <p>
{result != null ? severityLabel(result.automatic_analysis_bool, t) : t('not_analysed')}
 <span>{open ? <IoIosArrowUp /> : <IoIosArrowDown />}</span>
</p>
        </h1>
        {
          open?
        
        <div className="main_card_content">
          {showMeta && <ClinicHeader clinic={data.clinic} />}
        
       {data.mainDoctor!=null?<div>
          <p className='ecg_label'>{t("holter_doctor")}</p>
          <div className="ekg-item-info-text">
          <b>{data.mainDoctor.role!=null?data.mainDoctor.role[`name${t("data_lang")}`]+":":''} </b>
          <p>{data.mainDoctor.lastName} {data.mainDoctor.firstName} </p>
        </div></div>:<></>} 
           {showMeta && data.doctors!=null && data.doctors.length>0?<div>
          <p className='ecg_label'>{t("doctor_of_patcient")}</p>
          {data.doctors.map((item)=>(
            // `key` — shifokor id si (T-067)
            <div className="ekg-item-info-text" key={item.id}>
          <b>{item.role!=null?item.role[`name${t("data_lang")}`]+":":''} </b>
          <p>{item.lastName} {item.firstName} </p>
        </div>
          ))}
          </div>:<></>} 
        {showMeta && data.createdDoctor!=null?<div>
          <p className='ecg_label'>{t("doctor_of_created")}</p>
          <div className="ekg-item-info-text">
          <b>{data.createdDoctor.role!=null?data.createdDoctor.role[`name${t("data_lang")}`]+":":''} </b>
          <p>{data.createdDoctor.lastName} {data.createdDoctor.firstName} </p>
        </div></div>:<></>} 
          
         

       {!(data.aiAnswerData!=null || result!=null)?
       <Button onClick={handleSubmit} loading={ecg_btn_loading} htmlType='button'  className="btn_form mini_btn_main">
          {t("check_by_ai")}
        </Button>
       :<></>}
      {/* Natija tanasi barcha to'rt tur uchun bitta joyda (T-034) */}
<AnalysisResultBody
  kind="holter"
  result={result}
  image={image}
/>
    </div>:<></>}</div>:<></>
  )
}
