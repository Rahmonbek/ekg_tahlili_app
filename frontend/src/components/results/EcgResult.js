import { Image } from 'antd'
import React from 'react'

export default function EcgResult({error, image, result}) {
  return (
    <div>

        {error && <div className="ekg-error">❌ Xatolik: {error}</div>}
      
       {image!=null?<div className="ekg-image"><Image style={{width:'100%'}} src={`http://127.0.0.1:8000${image}`}/></div>:<></>}
      {result && (
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
    </div>
  )
}
