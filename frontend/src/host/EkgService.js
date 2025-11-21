import axios from "axios";

export const analyzeEkgFile = async (formData) => {
  const res = await axios.post("http://localhost:8000/api/analyze", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};
