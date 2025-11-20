import React, { useState } from "react";
import { analyzeEkgFile } from "../host/EkgService";

const EkgAnalyzer = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [image, setimage] = useState(null);

  const [paperSpeed, setPaperSpeed] = useState(25); // mm/s
  const [amplitude, setAmplitude] = useState(10);   // mm/mV
  const [freqLow, setFreqLow] = useState(0.5);      // Hz
  const [freqHigh, setFreqHigh] = useState(35);     // Hz

  const handleChange = (e) => setFiles(Array.from(e.target.files));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) return alert("Iltimos, kamida bitta fayl tanlang!");

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("file", f));
      formData.append("paper_speed", paperSpeed);
      formData.append("amplitude", amplitude);
      formData.append("freq_low", freqLow);
      formData.append("freq_high", freqHigh);

      const res = await analyzeEkgFile(formData);
      let text = res.raw_result || JSON.stringify(res);
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
      setimage(res.ecg_png_base64)
      try {
        setResult(JSON.parse(text));
      } catch {
        setResult(text);
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

        

        <button type="submit" disabled={loading} className="ekg-button">
          {loading ? "Yuklanmoqda..." : "Tahlil qilish"}
        </button>
      </form>

      {files.length > 0 && (
        <ul className="file-list">
          {files.map((f, i) => (
            <li key={i}>{f.name}</li>
          ))}
        </ul>
      )}

      {error && <div className="ekg-error">❌ Xatolik: {error}</div>}
       <img style={{height:'2000px'}} src={`data:image/png;base64,${image}`}/>
      {result && (
        <pre className="ekg-result">
          {typeof result === "object"
            ? JSON.stringify(result, null, 2)
            : result}
        </pre>
      )}
    </div>
  );
};

export default EkgAnalyzer;
