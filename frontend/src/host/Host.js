import axiosInstance from "./Api";
import Cookies from "js-cookie";

export const api = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
export const imgApi = process.env.REACT_APP_IMG_URL || "http://localhost:5000";

/** Autentifikatsiya cookie'sining nomi — bitta joyda. */
export const TOKEN_COOKIE = "NMED_token"

/**
 * Cookie qancha yashaydi — soatlarda.
 *
 * Backenddagi `Jwt:ExpiresHours` (standart 3) bilan BIR XIL bo'lishi
 * SHART. Cookie uzoqroq yashasa, foydalanuvchi "kirgan" ko'rinadi-yu,
 * har bir so'rov 401 qaytaradi; qisqaroq yashasa, hali amal qiladigan
 * token sababsiz yo'qoladi.
 */
export const TOKEN_TTL_HOURS = 3

/** Tizimga kirish sahifasi — sessiya tugaganda shu yerga qaytariladi. */
export const LOGIN_PATH = "/login"

export const getTokenAccess = () => {
    var token = Cookies.get(TOKEN_COOKIE)
    return (token)
}

/**
 * Tokenni saqlaydi. Muddat `TOKEN_TTL_HOURS` — js-cookie `expires` ni
 * KUNLARDA oladi, shuning uchun soat 24 ga bo'linadi.
 */
export const setTokenAccess = (token) => {
    Cookies.set(TOKEN_COOKIE, token, {
        expires: TOKEN_TTL_HOURS / 24,
        path: "/",
        secure: window.location.protocol === "https:",
        sameSite: "strict",
    })
}

/**
 * Tahlil fayli (EKG rasmi, Holter/SMAD/Lab PDF) uchun to'liq manzil quradi.
 *
 * Fayllar .NET API orqali beriladi (`/api/files/...`), Python backendga
 * to'g'ridan-to'g'ri murojaat qilinmaydi.
 *
 * Token QO'SHILMAYDI: `/api/files` endpointi loyiha egasining qarori bo'yicha
 * autentifikatsiyasiz ochiq. Token URL da yurganda u brauzer tarixiga,
 * proksi va server loglariga tushardi — endpoint baribir tekshirmagach,
 * uni yuborishning ma'nosi yo'q, zarari bor.
 *
 * @param {string} link bazadagi havola, masalan `/uploads/ecg_analyse_files/x.jpg`
 * @returns {string} to'liq manzil yoki bo'sh satr
 */
export const buildFileUrl = (link) => {
    if (!link) return '';
    const path = String(link).startsWith('/') ? link : `/${link}`;
    return `${imgApi}/api/files${path}`;
}


export const deleteTokenAccess = () => {
    Cookies.remove(TOKEN_COOKIE, { path: "/" })
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
