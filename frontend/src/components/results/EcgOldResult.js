import { Button, Image } from 'antd'
import { formatTimeStr } from 'antd/es/statistic/utils'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { calculateAge, formatDateTime } from '../../tools/formatters'
import { IoIosArrowBack, IoIosArrowDown } from 'react-icons/io'
import { dangerAlert, warningAlert } from '../../tools/Alerts'
import { analyzeEkgFileRetry } from '../../host/EkgService'
import { useStore } from '../../store/Store'

export default function EcgOldResult({data}) {
  const [result, setresult]=useState(null)
  const [image, setimage]=useState(null)
  const [image_short, setimage_short]=useState(null)
  const [open, setopen]=useState(false)
  const {t}=useTranslation()
  const {ecg_btn_loading, setecg_btn_loading}=useStore()
  useEffect(()=>{
    const parsedResult = safeJsonParse(data.aiAnswerData);
    setimage(data.generatedFileLink)
    setimage_short(data.generatedShortFileLink)
    console.log(parsedResult)
setresult(parsedResult);
  }, [])

  function safeJsonParse(raw) {
  if (!raw) return null;
  if (typeof raw !== "string") return raw;

  try {
    // Agar boshida va oxirida bo‘sh joy bo‘lsa
    let cleaned = raw.trim();
 cleaned = cleaned
      .replace(/\r\n/g, "\\n")
      .replace(/\n/g, "\\n")
      .replace(/\t/g, "\\t");
      cleaned=cleaned.replaceAll("\\n", '')
    // Agar string ` bilan o‘ralgan bo‘lsa
    if (cleaned.startsWith("`") && cleaned.endsWith("`")) {
      cleaned = cleaned.slice(1, -1);
    }
    

     console.log(cleaned, 'AAAAAAAAAAAA')
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON parse error:", e);
    return raw;
  }
}

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
        console.log(res)
        let parsedResult;
       try {
    // agar string bo'lsa JSON.parse qilamiz
    parsedResult =res.ai_response.raw?  typeof res.ai_response.raw === "string" 
      ? JSON.parse(res.ai_response.raw) 
      : res.ai_response.raw: typeof res.ai_response === "string" 
      ? JSON.parse(res.ai_response) 
      : res.ai_response;
  } catch (e) {
         console.log(e)
   parsedResult = res.ai_response;
  }
  setimage(res.ecg_png_base64)
      setimage_short(res.ecg_png_base64_short)
  setresult(parsedResult);
        
      } catch (err) {
        dangerAlert(t("api_error"))
          console.log(err)
      } finally {
        setecg_btn_loading(false);
      }
    };
  return (
data!=null?<div className={`old_analyse main_card ${open?"opened_main_card":"closed_main_card"} ${result!=null?String(result.automatic_analysis_bool).indexOf('1')!=-1?"normal_analyse":String(result.automatic_analysis_bool).indexOf('2')!=-1?'avarage_analyse':String(result.automatic_analysis_bool).indexOf('3')!=-1?"danger_analyse":"unknown_analyse":"unknown_analyse"}`}>
        <h1  onClick={()=>{setopen(!open)}}><p>
          
          {formatDateTime(data.createdAt)}  </p>
          <p>
{result!=null?String(result.automatic_analysis_bool).indexOf('1')!=-1?t("normal"):String(result.automatic_analysis_bool).indexOf('2')!=-1?t("avarage"):String(result.automatic_analysis_bool).indexOf('3')!=-1?t("danger"):t('unknown'):t('not_analysed')}
 <span>{open?<IoIosArrowDown />:<IoIosArrowBack />}</span>
</p>
        </h1>
        {
          open?
        
        <div className="main_card_content">
        
       {data.createdDoctor!=null?<div>
          <p className='ecg_label'>{t("doctor_of_created")}</p>
          <div className="ekg-item-info-text">
          <b>{data.createdDoctor.role!=null?data.createdDoctor.role[`name${t("data_lang")}`]+":":''} </b>
          <p>{data.createdDoctor.lastName} {data.createdDoctor.firstName} </p>
        </div></div>:<></>} 

        {data.doctors!=null && data.doctors.length>0?<div>
          <p className='ecg_label'>{t("doctor_of_patcient")}</p>
          {data.doctors.map((item, index)=>(
            <div className="ekg-item-info-text">
          <b>{item.role!=null?item.role[`name${t("data_lang")}`]+":":''} </b>
          <p>{item.lastName} {item.firstName} </p>
        </div>
          ))}
          </div>:<></>} 


          {data.complaints!=null && data.complaints.length>0?<div>
          <p className='ecg_label'>{t("complaints")}</p>
          {data.complaints.map((item, index)=>(
            <div className="ekg-item-info-text complaint-item">
          <p>{item[`name${t("data_lang")}`]} </p>
        </div>
          ))}
          </div>:<></>} 
        
        
        {image!=null && image_short!=null?<>
        <p className='ecg_label'>{t("ecg-image")}</p>
        <div className="ekg-image"><Image style={{width:'100%'}}
        preview={{
         src:`http://127.0.0.1:8000${image}`
    }}
       src={`http://127.0.0.1:8000${image_short}`}/></div></>
       :<></>}

       {!(data.aiAnswerData!=null || result!=null)?
       <Button onClick={handleSubmit} loading={ecg_btn_loading} htmlType='button'  className="btn_form mini_btn_main">
          {t("check_by_ai")}
        </Button>
       :<></>}
      {result!=null && (
        <div  className="ekg-result">
        {result.digital_measurements ? (
  <>
  <div className="ekg-item-text"><b>⭐ Raqamli o‘lchovlar: </b></div>
    <ul>

      {result.digital_measurements.HR != null && (
        <li><b>Yurak urish ritmi (HR)</b><span> - {result.digital_measurements.HR}</span></li>
      )}

      {result.digital_measurements.PR_interval != null && (
        <li><b>PR interval</b><span> - {result.digital_measurements.PR_interval}</span></li>
      )}

      {result.digital_measurements.QRS_duration != null && (
        <li><b>QRS davomiyligi</b><span> - {result.digital_measurements.QRS_duration}</span></li>
      )}

      {result.digital_measurements.QT_interval != null && (
        <li><b>QT interval</b><span> - {result.digital_measurements.QT_interval}</span></li>
      )}

      {result.digital_measurements.QTc_Bazett != null && (
        <li><b>QTc (Bazett)</b><span> - {result.digital_measurements.QTc_Bazett}</span></li>
      )}

      {result.digital_measurements.QRS_axis != null && (
        <li><b>QRS elektr o‘qi</b><span> - {result.digital_measurements.QRS_axis}</span></li>
      )}

      {result.digital_measurements.P_wave_duration != null && (
        <li><b>P to‘lqini davomiyligi</b><span> - {result.digital_measurements.P_wave_duration}</span></li>
      )}

      {result.digital_measurements.P_wave_amplitude != null && (
        <li><b>P to‘lqini amplitudasi</b><span> - {result.digital_measurements.P_wave_amplitude}</span></li>
      )}

      {result.digital_measurements.R_wave_amplitude != null && (
        <li><b>R to‘lqini amplitudasi</b><span> - {result.digital_measurements.R_wave_amplitude}</span></li>
      )}

      {result.digital_measurements.S_wave_amplitude != null && (
        <li><b>S to‘lqini amplitudasi</b><span> - {result.digital_measurements.S_wave_amplitude}</span></li>
      )}

      {result.digital_measurements.T_wave_amplitude != null && (
        <li><b>T to‘lqini amplitudasi</b><span> - {result.digital_measurements.T_wave_amplitude}</span></li>
      )}

      {result.digital_measurements.PR_segment != null && (
        <li><b>PR segment</b><span> - {result.digital_measurements.PR_segment}</span></li>
      )}

      {result.digital_measurements.ST_segment_elevation != null && (
        <li><b>ST segment ko‘tarilishi/tushishi</b><span> - {result.digital_measurements.ST_segment_elevation}</span></li>
      )}

      {result.digital_measurements.RR_interval != null && (
        <li><b>RR interval</b><span> - {result.digital_measurements.RR_interval}</span></li>
      )}

      {result.digital_measurements.heart_rate_variability != null && (
        <li><b>Yurak ritmi variabelligi (HRV)</b><span> - {result.digital_measurements.heart_rate_variability}</span></li>
      )}

      {result.digital_measurements.P_QRS_T_morphology != null && (
        <li><b>P/QRS/T morfologiyasi</b><span> - {result.digital_measurements.P_QRS_T_morphology}</span></li>
      )}

    </ul>
  </>
) : null}
        
      {result.automatic_analysis ? (
  <> 
  <div className="ekg-item-text"><b>{String(result.automatic_analysis_bool).indexOf('1')!=-1?"✅":String(result.automatic_analysis_bool).indexOf('2')!=-1?'⚠️':String(result.automatic_analysis_bool).indexOf('3')!=-1?"❌":"⭐"} Avtomatik tahlil (AI xulosasi): </b><span>{result.automatic_analysis}</span></div>
  </>
) : null}
 {result.AI_recommendations ? (
  <> 
  <div className="ekg-item-text"><b>⭐ AI tavsiyasi: </b><span>{result.AI_recommendations}</span></div>
  </>
) : null}
 {result.final_summary ? (
  <> 
  <div className="ekg-item-text"><b>⭐ Xulosa: </b><span>{result.final_summary}</span></div>
  </>
) : null}
</div>
      )}
    </div>:<></>}</div>:<></>
  )
}
