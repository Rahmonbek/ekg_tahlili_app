import axiosInstance from "./Api";

export const analyzeLabFile = async (formData) => {
  const res = await axiosInstance.post(`/lab-analyses/analyze`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 300000, // 5 daqiqa
  });
  return res.data;
};
