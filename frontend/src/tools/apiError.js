/**
 * Axios xatolikdan foydalanuvchiga ko'rsatiladigan ENG aniq xabarni ajratadi.
 *
 * Backend ikki xil shaklda xato qaytaradi:
 *   • .NET API      →  { message: "..." }
 *   • Python (FastAPI HTTPException)  →  { detail: "..." }  yoki
 *                     { detail: { code, message } }  (masalan DUPLICATE_FILE)
 *
 * Ilgari faqat `data.message` o'qilardi — shu tufayli Python 400 (fayl
 * sifati rad etilishi: "Rasm o'lchami juda kichik...") umumiy
 * "Request failed with status code 400" ga aylanib, foydalanuvchi aniq
 * sababni ko'rmasdi. Bu yordamchi `detail` ni ham hisobga oladi.
 *
 * @param {any} err  axios xatolik obyekti
 * @param {string} [fallback]  hech narsa topilmasa ishlatiladigan matn
 * @returns {string}
 */
export function extractApiError(err, fallback = 'Xatolik yuz berdi') {
    const data = err?.response?.data;

    if (data) {
        const { detail, message } = data;
        if (typeof detail === 'string' && detail.trim()) return detail;
        if (detail && typeof detail === 'object') {
            if (typeof detail.message === 'string' && detail.message.trim()) return detail.message;
        }
        if (typeof message === 'string' && message.trim()) return message;
        // Ba'zan xato oddiy matn (JSON emas) sifatida keladi
        if (typeof data === 'string' && data.trim()) return data;
    }

    if (typeof err?.message === 'string' && err.message.trim()) return err.message;
    return fallback;
}

export default extractApiError;
