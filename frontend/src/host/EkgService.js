import axiosInstance from "./Api";

/**
 * Faylni yuklaydi va tahlilni boshlaydi.
 *
 * @param {FormData} formData
 * @param {object} [options]
 * @param {function} [options.onProgress] yuklash foizi (0..100) — T-054.
 *        Katta fayl yuklanayotganda foydalanuvchi hech qanday belgi
 *        ko'rmasdi va tugmani qayta bosardi.
 * @param {AbortSignal} [options.signal] bekor qilish uchun
 */
export const analyzeEkgFile = async (formData, options = {}) => {
  const res = await axiosInstance.post(`/ecg-analyses/analyze`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 300000,
    signal: options.signal,
    onUploadProgress: options.onProgress
      ? (e) => {
          // `e.total` proksi orqali kelmasligi mumkin — bunday holatda
          // foizni ko'rsatmaymiz, faqat "yuklanmoqda" holati qoladi
          if (!e.total) return;
          options.onProgress(Math.round((e.loaded * 100) / e.total));
        }
      : undefined,
  });
  return res.data;
};

export const analyzeEkgFileRetry = async (formData) => {
  const res = await axiosInstance.post(`/ecg-analyses/send-to-ai`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 300000,
  });
  return res.data;
};

/**
 * Faylni yuklaydi va tahlilni boshlaydi.
 *
 * @param {FormData} formData
 * @param {object} [options]
 * @param {function} [options.onProgress] yuklash foizi (0..100) — T-054.
 *        Katta fayl yuklanayotganda foydalanuvchi hech qanday belgi
 *        ko'rmasdi va tugmani qayta bosardi.
 * @param {AbortSignal} [options.signal] bekor qilish uchun
 */
export const analyzeEkgFileSave = async (formData, options = {}) => {
  const res = await axiosInstance.post(`/ecg-analyses/analyze-save`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 300000,
    signal: options.signal,
    onUploadProgress: options.onProgress
      ? (e) => {
          // `e.total` proksi orqali kelmasligi mumkin — bunday holatda
          // foizni ko'rsatmaymiz, faqat "yuklanmoqda" holati qoladi
          if (!e.total) return;
          options.onProgress(Math.round((e.loaded * 100) / e.total));
        }
      : undefined,
  });
  return res.data;
};

export const diagnoseFileSave = async (formData) => {
  const res = await axiosInstance.post(`/med-diagnose/save`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

// Noto'g'ri yuklangan faylni almashtirib, tahlilni qayta ishga tushirish.
// Yangi tahlil yaratilmaydi — mavjud yozuvning fayli almashtiriladi.
export const replaceEkgFile = async (formData) => {
  const res = await axiosInstance.post(`/ecg-analyses/replace-file`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 300000,
  });
  return res.data;
};

/**
 * Xatolik bilan tugagan tahlilni MAVJUD fayl bilan qayta ishga tushirish (T-044).
 * Holter / SMAD / Laboratoriya uchun — EKG da `analyzeEkgFileRetry` ishlatiladi.
 */
export const retryAnalysis = (type) => async (formData) => {
  const res = await axiosInstance.post(`/${type}-analyses/retry`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

/**
 * AI xulosasini boshqa tilga tarjima qiladi (T-059).
 *
 * Natija serverda keshlanadi: matn o'zgarmaydi, shuning uchun ikkinchi
 * so'rovda sun'iy intellekt umuman chaqirilmaydi.
 *
 * @param {string} kind "ecg" | "holter" | "smad" | "lab"
 * @param {number} analysisId
 * @param {string} targetLang "uz" | "ru" | "en"
 */
export const translateAnalysis = async (kind, analysisId, targetLang) => {
  const formData = new FormData();
  formData.append("kind", kind);
  formData.append("analysis_id", analysisId);
  formData.append("target_lang", targetLang);

  const res = await axiosInstance.post(`/analyses/translate`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 180000,
  });
  return res.data;
};
