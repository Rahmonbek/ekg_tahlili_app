import i18n, { init } from "i18next";
import Uz from './TranslationUz/Uz.json'
import Ru from './TranslationRu/Ru.json'
import En from './TranslationEn/En.json'
import { initReactI18next } from "react-i18next";
import Cookies from 'js-cookie'

const resources = {
    "en": { translation: En },
    "uz": { translation: Uz },
    "ru": { translation: Ru },
}

export const SUPPORTED_LANGUAGES = ['uz', 'ru', 'en'];
export const DEFAULT_LANGUAGE = 'uz';

const savedLanguage = Cookies.get('tilYMed');
const initialLanguage = SUPPORTED_LANGUAGES.includes(savedLanguage)
    ? savedLanguage
    : DEFAULT_LANGUAGE;

i18n.use(initReactI18next)
init({
    resources,
    lng: initialLanguage,

    // Kalit tanlangan tilda topilmasa o'zbekchaga tushadi.
    // Ilgari bu sozlanmagan edi va i18next kalitning O'ZINI matn sifatida
    // qaytarardi — foydalanuvchi ekranda `no_ecg_analyses`, `delete` kabi
    // texnik yozuvlarni ko'rardi.
    fallbackLng: DEFAULT_LANGUAGE,

    // Kalit topilmaganda ishlab chiqish muhitida konsolda ogohlantirish
    debug: process.env.NODE_ENV === 'development',
    saveMissing: process.env.NODE_ENV === 'development',
    missingKeyHandler: (lngs, ns, key) => {
        if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.warn(`[i18n] Tarjima kaliti topilmadi: "${key}" (${lngs?.join(', ')})`);
        }
    },

    keySeparator: false,
    detection: {
        order: ['path', 'cookie', 'htmlTag', 'localStorage', 'subdomain'],
        caches: ['cookie']
    },

    interpolation: {
        escapeValue: false
    },
});

export default i18n;
