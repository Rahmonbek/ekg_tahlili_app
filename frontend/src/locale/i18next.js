import i18n, { init } from "i18next";
// import { initReactI18next } from 'react-i18next';
import Uz from './TranslationUz/Uz.json'
import Ru from './TranslationRu/Ru.json'
import En from './TranslationEn/En.json'
import { initReactI18next } from "react-i18next";
import cookie from 'react-cookies'
const resources = {
    "en": {
        translation: En
    },
    "uz": {
        translation: Uz
    },
    "ru": {
        translation: Ru
    }
   

}

i18n.use(initReactI18next)
init({
    resources,
    lng: cookie.load('tilYMed')?cookie.load('tilYMed'):"uz",
    keySeparator: false,
    detection: {
        order: ['path', 'cookie', 'htmlTag', 'localStorage', 'subdomain'],
        caches: ['cookie']
    },

    interpolation: {
        escapeValue: false
    }
});

export default i18n;