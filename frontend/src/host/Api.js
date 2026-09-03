import axios from "axios";
import Cookies from "js-cookie";
import { handleApiError } from "../tools/notify";
import { LOGIN_PATH, TOKEN_COOKIE } from "./Host";

export const api = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const axiosInstance = axios.create({
    baseURL: api,
});

const isPublicRoute = (path) => {
    const publicPaths = ["/", LOGIN_PATH, "/register", "/reset-password"];
    return publicPaths.includes(path)
        || path.startsWith("/verify/");
};

/**
 * Sessiya tugadi: tokenni o'chirib, KIRISH sahifasiga qaytaradi.
 *
 * Ilgari bosh sahifaga (`/`) yuborilardi — u tizimga kirmagan
 * foydalanuvchi uchun landing sahifa bo'lgani uchun, seansi tugagan
 * shifokor nima bo'lganini tushunmasdi va kirish tugmasini o'zi
 * qidirishga majbur edi. Endi to'g'ridan-to'g'ri `/login` ochiladi va
 * `?session=expired` orqali sahifa sababini ko'rsatadi.
 *
 * `window.location.href` (React `navigate` emas) ATAYLAB: interceptor
 * React daraxtidan tashqarida ishlaydi va bu yerda to'liq qayta yuklash
 * kerak — eski foydalanuvchining xotiradagi holati (store, keshlar)
 * butunlay tozalansin.
 */
const redirectToLogin = (reason) => {
    Cookies.remove(TOKEN_COOKIE, { path: "/" });

    // Ochiq sahifalarda (login, register, parolni tiklash) yo'naltirish
    // shart emas — u yerdagi 401 "parol noto'g'ri" degani, sessiya
    // tugagani emas. Bunda `false` qaytariladi va xatolik odatdagidek
    // chaqiruvchi komponentga boradi.
    if (isPublicRoute(window.location.pathname)) return false;

    const suffix = reason ? `?session=${reason}` : "";
    window.location.href = `${LOGIN_PATH}${suffix}`;
    return true;
};

// 🔐 REQUEST INTERCEPTOR (token tekshirish)
axiosInstance.interceptors.request.use(
    (config) => {
        const token = Cookies.get(TOKEN_COOKIE);

        const currentPath = window.location.pathname;

        if (!token && !isPublicRoute(currentPath)) {
            // Cookie muddati tugagan (3 soat) — server javobini kutmasdan
            // darhol kirish sahifasiga qaytaramiz
            redirectToLogin("expired");
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
        // ISTALGAN so'rov 401 qaytarsa — token o'lgan yoki bekor qilingan.
        // Boshqa hech qanday xabar ko'rsatmasdan kirish sahifasiga o'tamiz:
        // sahifa qayta yuklanadi, shuning uchun global toast baribir
        // ko'rinmasdi va faqat miltillashga sabab bo'lardi.
        if (error.response && error.response.status === 401) {
            // Yo'naltirildi — sahifa qayta yuklanmoqda, toast ko'rsatishning
            // ma'nosi yo'q (u ekranga chiqib ulgurmaydi, faqat miltillaydi)
            if (redirectToLogin("expired")) return Promise.reject(error);
        }

        // Takroriy fayl — bu xatolik emas, savol. Uni chaqiruvchi kod
        // alohida oyna bilan ko'rsatadi (T-096), shuning uchun bu yerda
        // umumiy qizil xabar chiqarilmaydi.
        const isDuplicate =
            error.response?.status === 409 &&
            error.response?.data?.detail?.code === 'DUPLICATE_FILE';

        // Autentifikatsiya so'rovlari (login/register/verify/reset) o'z
        // xatoliklarini i18n bilan (`t(...)`) ko'rsatadi. Global handler esa
        // xom inglizcha kalitni ko'rsatib, IKKITA xabar chiqarardi. Shu bois
        // /auth/* uchun global toast o'tkazib yuboriladi — faqat komponentning
        // tarjima qilingan xabari qoladi.
        const isAuthRequest = (error.config?.url || '').includes('/auth/');

        if (!isDuplicate && !isAuthRequest) {
            // Foydalanuvchiga xatolik xabari ko'rsatish
            handleApiError(error);
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;
