import axiosInstance from "./Api";

export const analyzeHolterFile = async (formData) => {
  const res = await axiosInstance.post(`/holter-analyses/analyze`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 300000, // 5 daqiqa
  });
  return res.data;
};
