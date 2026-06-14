import axiosInstance from "./Api";
import Cookies from "js-cookie";

export const api = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
export const imgApi = process.env.REACT_APP_IMG_URL || "http://localhost:5000";
// Python API — faqat ichki (server tomonida .NET proxy orqali)
// export const apiEcg = process.env.REACT_APP_ECG_URL || "http://127.0.0.1:8000";
export const apiEcg = process.env.REACT_APP_MEDIA_URL || `${api}/files`;

export const getTokenAccess = () => {
    var token = Cookies.get("NMED_token")
    return (token)
}

export const deleteTokenAccess = () => {
    Cookies.remove("NMED_token")
}

export const httpPostRequest = async (url, data) => {
    return await axiosInstance.post(url, data);
};

export const httpPostFormRequest = async (url, data) => {
    // Content-Type qo'yilmaydi — Api.js interceptori FormData uchun
    // uni o'chirib, browser o'zi boundary bilan to'g'ri o'rnatadi
    return await axiosInstance.post(url, data);
};

export const httpPatchRequest = async (url, data) => {
    return await axiosInstance.patch(url, data);
};

export const httpPutRequest = async (url, data) => {
    return await axiosInstance.put(url, data);
};

export const httpGetRequest = async (url, params) => {
    return await axiosInstance.get(url, { params });
};

export const httpDeleteRequest = async (url, params) => {
    return await axiosInstance.delete(url, { params });
};
