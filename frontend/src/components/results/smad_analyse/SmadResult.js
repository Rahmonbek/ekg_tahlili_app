import { Image } from 'antd'
import React from 'react'
import { apiEcg } from '../../../host/Host'
import { useStore } from '../../../store/Store'
import { useTranslation } from 'react-i18next'
import { LiaDownloadSolid } from 'react-icons/lia';
import { FaDownload } from 'react-icons/fa6'
import ClinicHeader from '../ClinicHeader'

export default function SMADResult({error,  result, image, clinic}) {

  const {t}=useTranslation()
  return (
    <div>
        <ClinicHeader clinic={clinic} />

        {error && <div className="ekg-error">❌ Xatolik: {error}</div>}
      
       
      {result && (
        <div  className="ekg-result">
          <div className="ekg-item-text"><b>⭐ {t("smad_file")}: </b>  <a className='see_diagnoses' href={`${apiEcg}${image}`} target="_blank" rel="noreferrer">
                    <FaDownload />
                  </a></div> 

       
        
      {result.automatic_analysis ? (
  <> 
  <div className="ekg-item-text"><b>{String(result.automatic_analysis_bool).indexOf('1')!=-1?"✅":String(result.automatic_analysis_bool).indexOf('2')!=-1?'⚠️':String(result.automatic_analysis_bool).indexOf('3')!=-1?"❌":"⭐"} Avtomatik tahlil (AI xulosasi): </b><span>{result.automatic_analysis}</span></div>
  </>
) : null}

 {result.final_summary ? (
  <> 
  <div className="ekg-item-text"><b>⭐ Xulosa: </b><span>{result.final_summary}</span></div>
  </>
) : null}
</div>
      )}
    </div>
  )
}
