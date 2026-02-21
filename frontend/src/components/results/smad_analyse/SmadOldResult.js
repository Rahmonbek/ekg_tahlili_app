import { Button, Image } from 'antd'
import { formatTimeStr } from 'antd/es/statistic/utils'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { calculateAge, formatDateTime } from '../../../tools/formatters'
import { IoIosArrowBack, IoIosArrowDown } from 'react-icons/io'
import { dangerAlert, warningAlert } from '../../../tools/Alerts'
import { analyzeEkgFileRetry } from '../../../host/EkgService'
import { useStore } from '../../../store/Store'
import { apiEcg } from '../../../host/Host'
import { FaDownload } from 'react-icons/fa6'

export default function SmadOldResult({data}) {
  const [result, setresult]=useState(null)
  const [image, setimage]=useState(null)
  const [open, setopen]=useState(false)
  const {t}=useTranslation()
  const {ecg_btn_loading, setecg_btn_loading}=useStore()
  useEffect(()=>{
    const parsedResult = safeJsonParse(data.aiAnswerData);
    setimage(data.analyseFileLink)
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
        
       {data.mainDoctor!=null?<div>
          <p className='ecg_label'>{t("smad_doctor")}</p>
          <div className="ekg-item-info-text">
          <b>{data.mainDoctor.role!=null?data.mainDoctor.role[`name${t("data_lang")}`]+":":''} </b>
          <p>{data.mainDoctor.lastName} {data.mainDoctor.firstName} </p>
        </div></div>:<></>} 

        {data.createdDoctor!=null?<div>
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
      {result!=null && (
        <div  className="ekg-result">
        <div className="ekg-item-text"><b>⭐ {t("smad_file")}: </b>  <a className='see_diagnoses' href={`${apiEcg}${image}`} target="_blank" rel="noreferrer">
                    <FaDownload />
                  </a></div> 
  
       


        
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
