import axios from "axios";
import Cookies from "js-cookie";
import { handleApiError } from "../tools/notify";

export const api = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const axiosInstance = axios.create({
    baseURL: api,
});

const isPublicRoute = (path) => {
    const publicPaths = ["/", "/login", "/register"];
    return publicPaths.includes(path)
        || path.startsWith("/consultation/verify/")
        || path.startsWith("/analysis/verify/");
};

// 🔐 REQUEST INTERCEPTOR (token tekshirish)
axiosInstance.interceptors.request.use(
    (config) => {
        const token = Cookies.get("NMED_token");

        const currentPath = window.location.pathname;

        if (!token && !isPublicRoute(currentPath)) {
            window.location.href = "/";
            return Promise.reject("No token");
        }

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // FormData uchun Content-Type'ni o'chirish:
        // Browser o'zi 'multipart/form-data; boundary=...' bilan to'g'ri o'rnatadi.
        // Agar Axios Content-Type: application/json qoldirilsa — server parse qila olmaydi.
        if (config.data instanceof FormData) {
            // Axios v1.x AxiosHeaders → .delete() metodi ishlatiladi
            if (typeof config.headers?.delete === "function") {
                config.headers.delete("Content-Type");
            } else {
                delete config.headers["Content-Type"];
            }
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

            const currentPath = window.location.pathname;

            if (!isPublicRoute(currentPath)) {
                window.location.href = "/";
            }
        }

        // Foydalanuvchiga xatolik xabari ko'rsatish
        handleApiError(error);

        return Promise.reject(error);
    }
);

export default axiosInstance;
