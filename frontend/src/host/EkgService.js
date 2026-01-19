import axios from "axios";
import { apiEcg } from "./Host";

export const analyzeEkgFile = async (formData) => {
  const res = await axios.post(`${apiEcg}/api/analyze`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const analyzeEkgFileRetry = async (formData) => {
  const res = await axios.post(`${apiEcg}/api/analyze-retry`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};
export const analyzeEkgFileSave = async (formData) => {
  const res = await axios.post(`${apiEcg}/api/analyze-save`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const diagnoseFileSave = async (formData) => {
  const res = await axios.post(`${apiEcg}/api/med-diagnoses-save`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};
