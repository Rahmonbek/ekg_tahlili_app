/**
 * NMED — Markaziy xabar ko'rsatish moduli.
 * Antd message API yordamida foydalanuvchiga xatolik, muvaffaqiyat va ogohlantirish xabarlarini ko'rsatadi.
 * 
 * Foydalanish:
 *   import { showSuccess, showError, showWarning, handleApiError } from '../tools/notify';
 *   
 *   showSuccess("Muvaffaqiyatli saqlandi!");
 *   showError("Xatolik yuz berdi!");
 *   handleApiError(error); // API xatolikni avtomatik parse qiladi
 */
import { message } from 'antd';

/**
 * Muvaffaqiyat xabarini ko'rsatish
 * @param {string} msg - Ko'rsatiladigan xabar
 * @param {number} duration - Ko'rsatish vaqti (soniya)
 */
export const showSuccess = (msg, duration = 3) => {
    message.success(msg, duration);
};

/**
 * Xatolik xabarini ko'rsatish
 * @param {string} msg - Ko'rsatiladigan xabar
 * @param {number} duration - Ko'rsatish vaqti (soniya)
 */
export const showError = (msg, duration = 4) => {
    message.error(msg, duration);
};

/**
 * Ogohlantirish xabarini ko'rsatish
 * @param {string} msg - Ko'rsatiladigan xabar
 * @param {number} duration - Ko'rsatish vaqti (soniya)
 */
export const showWarning = (msg, duration = 3) => {
    message.warning(msg, duration);
};

/**
 * Ma'lumot xabarini ko'rsatish
 * @param {string} msg - Ko'rsatiladigan xabar
 * @param {number} duration - Ko'rsatish vaqti (soniya)
 */
export const showInfo = (msg, duration = 3) => {
    message.info(msg, duration);
};

/**
 * Loading xabarini ko'rsatish
 * @param {string} msg - Ko'rsatiladigan xabar
 * @returns {Function} - Loading ni yopish funksiyasi
 */
export const showLoading = (msg = "Yuklanmoqda...") => {
    return message.loading(msg, 0); // 0 = avtomatik yopilmaydi
};

/**
 * API xatolikni avtomatik parse qilib, foydalanuvchiga ko'rsatish.
 * Axios error formatini tushunadi.
 * @param {Error|object} error - Axios yoki oddiy xatolik
 * @param {string} fallbackMsg - Agar xatolik matni topilmasa, shu ko'rsatiladi
 */
export const handleApiError = (error, fallbackMsg = "Xatolik yuz berdi. Qaytadan urinib ko'ring.") => {
    let msg = fallbackMsg;

    if (error?.response?.data?.message) {
        // .NET API format: { message: "error_text" }
        msg = translateApiError(error.response.data.message);
    } else if (error?.response?.data?.detail) {
        // Python FastAPI format: { detail: "error_text" }
        msg = translateApiError(error.response.data.detail);
    } else if (error?.message) {
        msg = error.message;
    }

    // HTTP status bo'yicha qo'shimcha kontekst
    const status = error?.response?.status;
    if (status === 401) {
        msg = "Sessiya muddati tugadi. Qayta kiring.";
    } else if (status === 403) {
        msg = "Sizda bu amal uchun ruxsat yo'q.";
    } else if (status === 404) {
        msg = "Ma'lumot topilmadi.";
    } else if (status === 429) {
        msg = "Juda ko'p so'rov. Biroz kutib, qaytadan urinib ko'ring.";
    } else if (status >= 500) {
        msg = "Server xatoligi. Keyinroq urinib ko'ring.";
    }

    showError(msg);
    return msg;
};

/**
 * Backend xatolik kodlarini o'zbek tiliga tarjima qiladi
 */
const translateApiError = (errorCode) => {
    if (!errorCode || typeof errorCode !== 'string') return errorCode;

    const translations = {
        'user_not_found': "Foydalanuvchi topilmadi",
        'email_already_exists': "Bu email allaqachon ro'yxatdan o'tgan",
        'username_already_exists': "Bu username band",
        'email_not_verified': "Email tasdiqlanmagan",
        'invalid_password': "Parol noto'g'ri",
        'code_invalid': "Tasdiqlash kodi noto'g'ri yoki muddati o'tgan",
        'retry_register': "Qayta ro'yxatdan o'ting",
        'code_sended': "Tasdiqlash kodi emailga yuborildi",
        'password_changed_successfully': "Parol muvaffaqiyatli o'zgartirildi",
        'username_required': "Username kiritish shart",
        'doctor_not_found': "Shifokor topilmadi",
        'user_has_not_permission': "Sizda ruxsat yo'q",
        'doctor_saved_success': "Shifokor ma'lumotlari saqlandi",
        
        // Hozirgi / Yangi (.NET)
        'Invalid birthdate format': "Tug'ilgan sana formati noto'g'ri",
        'Hech qanday fayl yuborilmadi.': "Hech qanday fayl tanlanmadi",
        'Fayl yuklashda xato': "Faylni yuklashda xatolik yuz berdi",
        'OpenAI API xatosi': "AI serveri bilan bog'lanishda xatolik yuz berdi",
        'error': "Xatolik yuz berdi",

        // Hozirgi / Yangi (Python)
        'OPENAI_API_KEY mavjud emas': "Tizim sozlamalarida OpenAI API kaliti kiritilmagan",
        "Provide OpenAI API key in environment variable 'OPENAI_API_KEY'": "Tizimda OpenAI API kaliti topilmadi",
        'pdf2image not installed or poppler missing': "Serverda PDF ni o'qish uchun dastur (poppler) o'rnatilmagan",
        'ECG Analyse not found': "EKG tahlili topilmadi",
        'Analyse file topilmadi': "Tahlil qilinuvchi fayl topilmadi",
        'Analyse file link mavjud emas': "Tahlil fayliga havola biriktirilmagan",
        'Generate file topilmadi': "Yaratilgan fayl topilmadi",
        'Generate file link mavjud emas': "Yaratilgan fayl havolasi mavjud emas",
        'Token muddati o\'tgan.': "Sessiya muddati tugadi. Iltimos, profilga qayta kiring",
    };

    if (translations[errorCode]) {
        return translations[errorCode];
    }

    // O'zgaruvchi bilan keladigan xatoliklarni qisman tekshirish (includes)
    const lowerError = errorCode.toLowerCase();
    
    if (lowerError.includes('could not parse file')) {
        return "Faylni o'qib bo'lmadi. Iltimos, to'g'ri formatdagi yoki buzilmagan fayl ekanligiga ishonch hosil qiling.";
    }
    if (lowerError.includes('ruxsat etilmagan fayl turi') || lowerError.includes('yaroqsiz fayl turi')) {
        return "Bu fayl formatiga ruxsat berilmagan. (Faqat ruхsat etilgan: pdf, png, jpg, xml, csv)";
    }
    if (lowerError.includes('token noto\'g\'ri')) {
        return "Token haqiqiy emas yoki yaroqsiz. Qaytadan avtorizatsiya qiling.";
    }
    if (lowerError.includes('recaptcha tekshiruvidan o\'tmadi')) {
        return "reCAPTCHA tekshiruvidan o'tmadi (Bot ehtimoli). Iltimos sahifani yangilab qayta urinib ko'ring.";
    }
    if (lowerError.includes('incorrect api key provided') || lowerError.includes('invalid_api_key')) {
        return "Tizimga kiritilgan OpenAI API kaliti yaroqsiz (xato yoki muddati tugagan). Iltimos, sozlamalardan haqiqiy kalit kiriting.";
    }
    if (lowerError.includes('openai upload failed')) {
        return "OpenAI tarmog'iga EKG faylini yuklab bo'lmadi. API kalitingiz faolligini tekshiring.";
    }

    return errorCode;
};
