import axios from "axios";
import Cookies from "js-cookie";

//export const api = "https://api.nmed.uz/api";

export const api = "http://10.35.198.154:5000/api";


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

// 🚨 RESPONSE INTERCEPTOR (401 error)
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            Cookies.remove("NMED_token");

            const publicPaths = ["/", "/register"];
            const currentPath = window.location.pathname;

            if (!publicPaths.includes(currentPath)) {
                window.location.href = "/";
            }
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;
