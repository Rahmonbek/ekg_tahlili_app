import axiosInstance from "./Api";

export const analyzeParasitologyFile = async (formData) => {
  const res = await axiosInstance.post(`/parasitology-analyses/save-and-analyze`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 300000,
  });
  return res.data;
};

export const getParasitologyByPatientId = async ({ id, page = 1 }) => {
  const res = await axiosInstance.get(`/parasitology-analyses/get-by-patient-id`, {
    params: { id, page },
  });
  return res.data;
};
