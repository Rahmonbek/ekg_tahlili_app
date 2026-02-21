import axios from "axios";
import { apiEcg } from "./Host";

export const analyzeSmadFile = async (formData) => {
  const res = await axios.post(`${apiEcg}/smad/analyze`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

