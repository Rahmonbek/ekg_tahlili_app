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
    if (!file) return;

    setLoading(true);
    setResult(null);
    setChartData(null);

    try {
      const data = await analyzeEkgFile(file);

      setResult(data.result || data); // backend JSON natija

      // Agar EKG numeric ma’lumot CSV bo‘lsa, chartga o‘tkazish
      if (file.name.endsWith(".csv") && data.csv_data) {
        const lines = data.csv_data.split("\n").map(l => l.split(",").map(Number));
        const labels = lines.map((_, i) => i + 1);
        const values = lines.map(row => row[1]); // masalan ikkinchi ustun
        setChartData({
          labels,
          datasets: [
            {
              label: "EKG Signal",
              data: values,
              borderColor: "rgb(75, 192, 192)",
              tension: 0.3,
            }
          ]
        });
      }

    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "700px", margin: "auto", padding: "20px" }}>
      <h2>EKG Analyzer</h2>
      <form onSubmit={handleSubmit}>
        <input type="file" onChange={handleFileChange} />
        <button type="submit" disabled={loading}>
          {loading ? "Tahlil qilinmoqda..." : "Tahlil qilish"}
        </button>
      </form>

      {chartData && (
        <div style={{ marginTop: "30px" }}>
          <Line data={chartData} />
        </div>
      )}

      {result && (
        <div style={{ marginTop: "30px" }}>
          <h3>Natija:</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default EkgAnalyzer;
