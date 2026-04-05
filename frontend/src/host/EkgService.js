import axiosInstance from "./Api";

export const analyzeEkgFile = async (formData) => {
  const res = await axiosInstance.post(`/ecg-analyses/analyze`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 300000, // 5 daqiqa (AI tahlil uzoq davom etishi mumkin)
  });
  return res.data;
};

export const analyzeEkgFileRetry = async (formData) => {
  const res = await axiosInstance.post(`/ecg-analyses/send-to-ai`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 300000,
  });
  return res.data;
};

export const analyzeEkgFileSave = async (formData) => {
  const res = await axiosInstance.post(`/ecg-analyses/analyze-save`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 300000,
  });
  return res.data;
};

export const diagnoseFileSave = async (formData) => {
  const res = await axiosInstance.post(`/med-diagnose/save`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};
