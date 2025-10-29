import React, { useState } from "react";
import { analyzeEkgFile } from "../host/EkgService";

const EkgAnalyzer = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) return alert("Iltimos, kamida bitta fayl tanlang!");

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));

      const res = await analyzeEkgFile(formData);
      let text = res.result || JSON.stringify(res);
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();

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
    <div style={{ maxWidth: 900, margin: "auto", padding: 20 }}>
      <h2>🫀 EKG Tahlil Platformasi</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="file"
          multiple
          onChange={handleChange}
          accept=".dat,.hea,.csv,.xml,.jpg,.png,.pdf,.edf,.mat,.zip"
        />
        <button
          type="submit"
          disabled={loading}
          style={{ marginLeft: 10, padding: "6px 14px" }}
        >
          {loading ? "Yuklanmoqda..." : "Tahlil qilish"}
        </button>
      </form>

      {files.length > 0 && (
        <ul>
          {files.map((f, i) => (
            <li key={i}>{f.name}</li>
          ))}
        </ul>
      )}

      {error && (
        <div style={{ color: "red", marginTop: 20 }}>
          ❌ Xatolik: {error}
        </div>
      )}

      {result && (
        <pre
          style={{
            marginTop: 20,
            background: "#f8f9fa",
            padding: 15,
            borderRadius: 8,
            whiteSpace: "pre-wrap",
          }}
        >
          {typeof result === "object"
            ? JSON.stringify(result, null, 2)
            : result}
        </pre>
      )}
    </div>
  );
};

export default EkgAnalyzer;
