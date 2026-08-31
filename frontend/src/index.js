import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './locale/i18next';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import { App as AntdApp, ConfigProvider } from 'antd';
import { useTranslation } from 'react-i18next';
import { getAntdLocale, applyDayjsLocale } from './locale/antdLocale';
import { theme as nmedTheme } from './theme';

// reCAPTCHA site key — muhitga qarab sozlanadi.
// Ilgari kodga qotirib yozilgan edi va dev/staging/prod uchun almashtirib
// bo'lmasdi. Kalit bo'lmasa provider umuman o'ralmaydi.
const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY || '';

/**
 * Ant Design ni joriy tilga moslaydi.
 * Til almashtirilganda antd ichki matnlari va dayjs formatlari ham yangilanadi.
 */
function LocalizedProviders({ children }) {
    const { i18n } = useTranslation();
    const [language, setLanguage] = useState(i18n.language);

    useEffect(() => {
        const onChange = (lng) => {
            setLanguage(lng);
            applyDayjsLocale(lng);
        };
        applyDayjsLocale(i18n.language);
        i18n.on('languageChanged', onChange);
        return () => i18n.off('languageChanged', onChange);
    }, [i18n]);

    return (
        <ConfigProvider locale={getAntdLocale(language)} theme={nmedTheme}>
            {/* antd `App` — `message`/`notification`/`modal` ni React konteksti
                bilan bog'laydi. Statik chaqiruvlar mavzuni va locale ni ko'rmasdi. */}
            <AntdApp>{children}</AntdApp>
        </ConfigProvider>
    );
}

/**
 * reCAPTCHA faqat kirish va ro'yxatdan o'tish sahifalarida kerak.
 * Ilgari u butun ilovani o'rab turardi va "himoyalangan" belgisi kabinet
 * ichida ham suzib turib kontentni to'sardi.
 */
function RecaptchaGate({ children }) {
    const location = useLocation();
    // `/` marshruti ikki xil sahifa: tizimga kirmagan foydalanuvchi uchun
    // landing, kirgan uchun esa kabinet paneli. Shuning uchun faqat yo'lga
    // qarab bo'lmaydi — token bor-yo'qligi ham tekshiriladi, aks holda
    // kabinetda ham reCAPTCHA belgisi osilib turardi.
    const isAuthenticated = typeof document !== 'undefined'
        && document.cookie.includes('NMED_token=');
    const needsRecaptcha =
        ['/login', '/register'].includes(location.pathname)
        || (location.pathname === '/' && !isAuthenticated);

    // reCAPTCHA skripti bir marta yuklangach o'z belgisini `body` ga
    // qo'shadi va u sahifadan sahifaga o'tganda ham qolib ketadi:
    // kabinetning o'ng pastki burchagida bo'sh oq to'rtburchak ko'rinardi.
    // Marshrutga qarab `body` ga klass qo'yamiz va CSS uni yashiradi.
    useEffect(() => {
        document.body.classList.toggle('hide_recaptcha_badge', !needsRecaptcha);
    }, [needsRecaptcha]);

    if (!needsRecaptcha || !RECAPTCHA_SITE_KEY) return children;

    return (
        <GoogleReCaptchaProvider reCaptchaKey={RECAPTCHA_SITE_KEY}>
            {children}
        </GoogleReCaptchaProvider>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
        <BrowserRouter>
            <LocalizedProviders>
                <RecaptchaGate>
                    <App />
                </RecaptchaGate>
            </LocalizedProviders>
        </BrowserRouter>
);

reportWebVitals();
