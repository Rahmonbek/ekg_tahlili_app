import axios from "axios";
import { apiEcg } from "./Host";

export const analyzeHolterFile = async (formData) => {
  const res = await axios.post(`${apiEcg}/holter/analyze`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

