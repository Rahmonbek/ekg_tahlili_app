import axios from "axios";
import Cookies from "js-cookie";
import { handleApiError } from "../tools/notify";

export const api = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const axiosInstance = axios.create({
    baseURL: api,
});

// 🔐 REQUEST INTERCEPTOR (token tekshirish)
axiosInstance.interceptors.request.use(
    (config) => {
        const token = Cookies.get("NMED_token");

        // Login va register sahifalarini tekshirish
        const publicPaths = ["/", "/register"];
        const currentPath = window.location.pathname;

        if (!token && !publicPaths.includes(currentPath)) {
            window.location.href = "/";
            return Promise.reject("No token");
        }

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// 🚨 RESPONSE INTERCEPTOR (401 error + global notification)
axiosInstance.interceptors.response.use(
    (response) => {
        // AI yoxud Python xatoligida HTTP 200 OK kelsa ham "error" obyektini tutib olish (OpenAI kalit xatolarini)
        if (response.data && response.data.error) {
            handleApiError({ response: { data: { detail: response.data.error } } });
        }
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            Cookies.remove("NMED_token");

            const publicPaths = ["/", "/register"];
            const currentPath = window.location.pathname;

            if (!publicPaths.includes(currentPath)) {
                window.location.href = "/";
            }
        }

        // Foydalanuvchiga xatolik xabari ko'rsatish
        handleApiError(error);

        return Promise.reject(error);
    }
);

export default axiosInstance;
