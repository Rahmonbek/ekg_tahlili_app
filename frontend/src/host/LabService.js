import axios from "axios";
import { apiEcg } from "./Host";

export const analyzeLabFile = async (formData) => {
  const res = await axios.post(`${apiEcg}/lab/analyze`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

