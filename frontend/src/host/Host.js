import axiosInstance from "./Api";
import Cookies from "js-cookie";

export const api = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
export const imgApi = process.env.REACT_APP_IMG_URL || "http://localhost:5000";

export const getTokenAccess = () => {
    var token = Cookies.get("NMED_token")
    return (token)
}

/**
 * Tahlil fayli (EKG rasmi, Holter/SMAD/Lab PDF) uchun to'liq manzil quradi.
 *
 * Ilgari bu fayllar Python backenddan to'g'ridan-to'g'ri olinardi
 * (`https://analyse.nmed.uz/uploads/...`) va u yerda hech qanday himoya yo'q edi —
 * URL ni bilgan har kim bemorning EKG rasmini yuklab olardi.
 *
 * Endi fayllar .NET API orqali beriladi va u foydalanuvchi shifoxonasiga
 * tegishliligini tekshiradi. `<img>` va `<a>` teglari Authorization sarlavhasini
 * yubora olmagani uchun token query parametrida uzatiladi (loyihada SignalR
 * uchun allaqachon ishlatilayotgan naqsh).
 *
 * @param {string} link bazadagi havola, masalan `/uploads/ecg_analyse_files/x.jpg`
 * @returns {string} to'liq manzil yoki bo'sh satr
 */
export const buildFileUrl = (link) => {
    if (!link) return '';
    const token = getTokenAccess();
    const path = String(link).startsWith('/') ? link : `/${link}`;
    const url = `${imgApi}/api/files${path}`;
    return token ? `${url}?access_token=${encodeURIComponent(token)}` : url;
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
