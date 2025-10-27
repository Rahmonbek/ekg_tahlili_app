import React, { useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import { analyzeEkgFile } from "../host/EkgService";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Rasmdan signalni chiqarish funksiyasi


const EkgAnalyzer = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [chartData, setChartData] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return alert("Iltimos, EKG faylni yuklang!");

    setLoading(true);
    setResult(null);
    setChartData(null);

    try {
      const data = await analyzeEkgFile(file);

      // JSON tozalash
      let cleanText = (data.result || JSON.stringify(data))
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      let parsed;
      try {
        parsed = JSON.parse(cleanText);
        setResult(parsed);
      } catch {
        setResult(cleanText);
      }

      // CSV bo'lsa signalni olish
      if (file.name.endsWith(".csv") && parsed?.chart_data) {
        const lines = parsed.chart_data.split("\n").map((l) => l.split(",").map(Number));
        const labels = lines.map((_, i) => i + 1);
        const values = lines.map((row) => row[1]);
        setChartData({
          labels,
          datasets: [
            {
              label: "EKG Signal (CSV)",
              data: values,
              borderColor: "rgb(75, 192, 192)",
              tension: 0.3
            }
          ]
        });
      }

      
     
    } catch (err) {
      alert("Xatolik: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "900px", margin: "auto", padding: "25px", fontFamily: "Segoe UI, sans-serif" }}>
      <h2 style={{ textAlign: "center", color: "#007bff" }}>🫀 EKG Analyzer</h2>

      <form onSubmit={handleSubmit} style={{ marginBottom: "20px" }}>
        <input
          type="file"
          onChange={handleFileChange}
          accept=".jpg,.jpeg,.png,.bmp,.pdf,.csv"
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            marginLeft: "10px",
            padding: "8px 16px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer"
          }}
        >
          {loading ? "Tahlil qilinmoqda..." : "Tahlil qilish"}
        </button>
      </form>

      {/* EKG chizig‘i */}
      {chartData && (
        <div style={{ marginTop: "30px" }}>
          <Line data={chartData} />
        </div>
      )}

      {/* JSON natijani chiqarish */}
      {result && typeof result === "object" && (
        <div style={{ marginTop: "30px", background: "#f8f9fa", borderRadius: "8px", padding: "15px", boxShadow: "0 0 6px rgba(0,0,0,0.1)" }}>
          <h3 style={{ borderBottom: "2px solid #007bff", paddingBottom: "5px" }}>🧠 EKG Tahlil Natijasi</h3>

          {result.digital_measurements && (
            <div style={{ marginTop: "15px" }}>
              <h4 style={{ color: "#007bff" }}>📊 Raqamli o‘lchovlar:</h4>
              <ul>
                {Object.entries(result.digital_measurements).map(([k, v]) => (
                  <li key={k}>
                    <strong>{k.replaceAll("_", " ")}:</strong> {v}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.automatic_analysis && (
            <div style={{ marginTop: "15px" }}>
              <h4 style={{ color: "#007bff" }}>🩺 Avtomatik tahlil:</h4>
              <p>{result.automatic_analysis}</p>
            </div>
          )}

          {result.AI_recommendations && (
            <div style={{ marginTop: "15px" }}>
              <h4 style={{ color: "#007bff" }}>💡 AI tavsiyasi:</h4>
              <p>{result.AI_recommendations}</p>
            </div>
          )}

          {result.final_summary && (
            <div style={{ marginTop: "15px" }}>
              <h4 style={{ color: "#007bff" }}>🧾 Yakuniy xulosa:</h4>
              <p>{result.final_summary}</p>
            </div>
          )}
        </div>
      )}

      {result && typeof result !== "object" && (
        <pre style={{ marginTop: "30px", background: "#f1f3f4", padding: "15px", borderRadius: "8px" }}>
          {result}
        </pre>
      )}
    </div>
  );
};

export default EkgAnalyzer;
