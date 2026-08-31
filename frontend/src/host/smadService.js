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
export const analyzeSmadFile = async (formData, options = {}) => {
  const res = await axiosInstance.post(`/smad-analyses/analyze`, formData, {
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

// Noto'g'ri yuklangan faylni almashtirib, tahlilni qayta ishga tushirish.
// Yangi tahlil yaratilmaydi — mavjud yozuvning fayli almashtiriladi.
export const replaceSmadFile = async (formData) => {
  const res = await axiosInstance.post(`/smad-analyses/replace-file`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 300000,
  });
  return res.data;
};
