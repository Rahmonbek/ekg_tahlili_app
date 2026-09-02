import { message, Upload } from 'antd';
import { dangerAlert } from './Alerts';
import { validateAnalysisFile } from './fileQualityValidator';

/**
 * `Upload.Dragger` ning `beforeUpload` uchun umumiy handler:
 * fayl tanlangan zahoti loader ko'rsatib, sifatini tekshiradi va
 * kamchilik bo'lsa ANIQ xabar beradi. Yaroqli bo'lsagina `onValid`
 * chaqiriladi (fayl formaga qo'shiladi).
 *
 * Barcha tahlil turlarida (EKG, Holter, SMAD, Lab, Parazitologiya)
 * bir xil ishlashi uchun bitta joyda.
 *
 * @param {File} file
 * @param {object} opts
 * @param {(k:string,o?:object)=>string} opts.t         i18n
 * @param {string[]} opts.extensions                    ruxsat etilgan kengaytmalar (".jpg" ...)
 * @param {() => void} opts.onValid                      fayl yaroqli bo'lsa chaqiriladi
 * @returns {Promise<false|typeof Upload.LIST_IGNORE>}
 */
export async function validatedBeforeUpload(file, { t, extensions, onValid }) {
    const hide = message.loading(
        t('fv_checking', { defaultValue: 'Fayl tekshirilmoqda...' }),
        0,
    );
    try {
        const exts = (extensions || []).map((e) => e.replace('.', ''));
        const res = await validateAnalysisFile(file, t, exts);
        hide();
        if (!res.ok) {
            // Aniq kamchilik foydalanuvchiga aytiladi
            dangerAlert(res.message);
            // Yaroqsiz fayl ro'yxatga QO'SHILMAYDI
            return Upload.LIST_IGNORE;
        }
        if (typeof onValid === 'function') onValid();
        // Fayl qo'lda boshqariladi — avto-yuklash bo'lmaydi
        return false;
    } catch (e) {
        hide();
        // Kutilmagan xato — faylni bloklamaymiz, server baribir tekshiradi
        if (typeof onValid === 'function') onValid();
        return false;
    }
}

export default validatedBeforeUpload;
