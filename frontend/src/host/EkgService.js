import axios from "axios";

export const analyzeEkgFile = async (formData) => {
  const res = await axios.post("http://127.0.0.1:8000/api/analyze", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};
export const analyzeEkgFileSave = async (formData) => {
  const res = await axios.post("http://127.0.0.1:8000/api/analyze-save", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};
