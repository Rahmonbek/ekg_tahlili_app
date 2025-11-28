import React, { useState } from "react";
import { analyzeEkgFile } from "../host/EkgService";

const EkgAnalyzer = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [show_btn, setshow_btn] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [image, setimage] = useState(null)

  const [paperSpeed, setPaperSpeed] = useState(25); // mm/s
  const [amplitude, setAmplitude] = useState(10);   // mm/mV
  const [freqLow, setFreqLow] = useState(0.5);      // Hz
  const [freqHigh, setFreqHigh] = useState(35);     // Hz

  const handleChange = (e) => {
    setshow_btn(true)
    setFiles(Array.from(e.target.files))};

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) return alert("Iltimos, kamida bitta fayl tanlang!");

    setLoading(true);
    setResult(null);
    setError(null);
    setimage(null)

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("file", f));
      formData.append("paper_speed", paperSpeed);
      formData.append("amplitude", amplitude);
      formData.append("freq_low", freqLow);
      formData.append("freq_high", freqHigh);

      const res = await analyzeEkgFile(formData);
      console.log(res)
      setshow_btn(false)
      setimage(res.ecg_png_base64)
      try {
        setResult(JSON.parse(res.ai_response));
      } catch {
        setResult(res.ai_response);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ekg-container">
      <h2 className="ekg-title">🫀 EKG Tahlil Platformasi</h2>

      <form className="ekg-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>EKG fayl tanlang:</label>
          <input
            type="file"
            multiple
            onChange={handleChange}
            accept=".dat,.hea,.csv,.xml,.jpg,.png,.pdf,.edf,.mat,.zip"
          />
        </div>
          
        <div className="form-group">
          <label>Qog‘oz tezligi (mm/s):</label>
          <input
            type="number"
            value={paperSpeed}
            onChange={(e) => setPaperSpeed(parseFloat(e.target.value))}
            step="1"
          />
        </div>

        <div className="form-group">
          <label>Signal kattaligi (mm/mV):</label>
          <input
            type="number"
            value={amplitude}
            onChange={(e) => setAmplitude(parseFloat(e.target.value))}
            step="0.1"
          />
        </div>

        

        {show_btn?<button type="submit" disabled={loading} className="ekg-button">
          {loading ? "Tahlil qilinmoqda..." : "Tahlil qilish"}
        </button>:<></>}
      </form>

      {error && <div className="ekg-error">❌ Xatolik: {error}</div>}
      
       {image!=null?<div className="ekg-image"><img style={{width:'100%'}} src={`data:image/png;base64,${image}`}/></div>:<></>}
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
  <div className="ekg-item-text"><b>{result.automatic_analysis_bool==1?"✅":result.automatic_analysis_bool==2?'⚠️':result.automatic_analysis_bool==3?"❌":"⭐"} Avtomatik tahlil (AI xulosasi): </b><span>{result.automatic_analysis}</span></div>
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
      {/* {result && (
        <pre className="ekg-result">
          {typeof result === "object"
            ? JSON.stringify(result, null, 2)
            : result}
        </pre>
      )} */}
    </div>
  );
};

export default EkgAnalyzer;
