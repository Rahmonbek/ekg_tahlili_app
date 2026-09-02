/**
 * Fayl sifatini FAYL TANLANGAN ZAHOTI (submitdan oldin) tekshiradi.
 *
 * Nima uchun kerak: ilgari rasm sifati faqat "Yuborish" bosilganda, ya'ni
 * foydalanuvchi butun formani to'ldirgandan keyin server tomonida tekshirilardi.
 * Yaroqsiz rasm bo'lsa foydalanuvchi barcha mehnatidan keyin xato olardi.
 * Endi tekshiruv brauzerda, fayl tanlangan zahoti bajariladi va aniq
 * kamchilik darhol aytiladi.
 *
 * Qoidalar `python_back/file_validator.py` bilan bir xil (server ham
 * baribir tekshiradi — bu faqat tez, oldindan ogohlantirish).
 */

const MIN_FILE_SIZE = 100;                 // bo'sh/buzilgan fayl
const MAX_FILE_SIZE = 25 * 1024 * 1024;    // 25 MB
const MIN_IMAGE_WIDTH = 800;
const MIN_IMAGE_HEIGHT = 600;
const MIN_CONTRAST_STD = 6.0;              // deyarli bir tekis (bo'sh) rasm

const IMAGE_EXTS = ['png', 'jpg', 'jpeg'];

/** Fayl kengaytmasini oladi. */
function getExt(name) {
    const m = /\.([a-z0-9]+)$/i.exec(name || '');
    return m ? m[1].toLowerCase() : '';
}

/**
 * Rasmni yuklaydi va o'lcham + kontrastni tekshiradi.
 * @returns {Promise<{width:number,height:number,std:number}|null>}
 */
function inspectImage(file) {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            const { naturalWidth: width, naturalHeight: height } = img;
            // Kontrast uchun kichraytirilgan nusxada standart chetlanish
            let std = null;
            try {
                const scale = Math.min(1, 200 / Math.max(width, height));
                const w = Math.max(1, Math.round(width * scale));
                const h = Math.max(1, Math.round(height * scale));
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                const data = ctx.getImageData(0, 0, w, h).data;
                let sum = 0, sumSq = 0, n = w * h;
                for (let i = 0; i < data.length; i += 4) {
                    // Kulrang (luminance)
                    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                    sum += g; sumSq += g * g;
                }
                const mean = sum / n;
                std = Math.sqrt(Math.max(0, sumSq / n - mean * mean));
            } catch (e) {
                std = null; // canvas tainted yoki xato — kontrast tekshiruvi o'tkazib yuboriladi
            }
            URL.revokeObjectURL(url);
            resolve({ width, height, std });
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
        img.src = url;
    });
}

/**
 * Faylni tekshiradi. Yaroqli bo'lsa `{ ok: true }`, aks holda
 * `{ ok: false, message }` (foydalanuvchi tilida) qaytaradi.
 *
 * @param {File} file
 * @param {(k:string,o?:object)=>string} t  i18n tarjimon
 * @param {string[]} [allowedExts]  ruxsat etilgan kengaytmalar (ixtiyoriy)
 */
export async function validateAnalysisFile(file, t, allowedExts) {
    if (!file) return { ok: false, message: t('fv_empty', { defaultValue: 'Fayl tanlanmadi.' }) };

    // 1. Hajm
    if (file.size < MIN_FILE_SIZE) {
        return { ok: false, message: t('fv_empty_file', { defaultValue: "Yuklangan fayl bo'sh yoki buzilgan. Boshqa fayl tanlang." }) };
    }
    if (file.size > MAX_FILE_SIZE) {
        return { ok: false, message: t('fv_too_large', { defaultValue: 'Fayl hajmi juda katta. Maksimal ruxsat etilgan hajm — 25 MB.' }) };
    }

    // 2. Kengaytma
    const ext = getExt(file.name);
    if (allowedExts && allowedExts.length && !allowedExts.includes(ext)) {
        const pretty = allowedExts.map((e) => e.toUpperCase()).join(', ');
        return { ok: false, message: t('fv_unsupported_type', { defaultValue: `Bu fayl turi qabul qilinmaydi. Ruxsat etilgan formatlar: ${pretty}.`, formats: pretty }) };
    }

    // 3. Rasm bo'lsa — o'lcham va kontrast
    if (IMAGE_EXTS.includes(ext) || (file.type || '').startsWith('image/')) {
        const info = await inspectImage(file);
        if (!info) {
            return { ok: false, message: t('fv_broken_image', { defaultValue: "Rasmni ochib bo'lmadi. Fayl buzilgan bo'lishi mumkin." }) };
        }
        if (info.width < MIN_IMAGE_WIDTH || info.height < MIN_IMAGE_HEIGHT) {
            return {
                ok: false,
                message: t('fv_image_too_small', {
                    defaultValue: `Rasm o'lchami juda kichik (${info.width}×${info.height}). Kamida ${MIN_IMAGE_WIDTH}×${MIN_IMAGE_HEIGHT} piksel bo'lishi kerak. Tahlilni yaxshi yorug'likda, to'g'ridan-to'g'ri tepadan suratga oling.`,
                    width: info.width, height: info.height, minW: MIN_IMAGE_WIDTH, minH: MIN_IMAGE_HEIGHT,
                }),
            };
        }
        if (info.std != null && info.std < MIN_CONTRAST_STD) {
            return { ok: false, message: t('fv_image_no_content', { defaultValue: "Rasmda tahlil qilinadigan mazmun topilmadi (bo'sh yoki juda past kontrastli). Yaxshiroq sifatli surat yuklang." }) };
        }
    }

    return { ok: true };
}

export default validateAnalysisFile;
