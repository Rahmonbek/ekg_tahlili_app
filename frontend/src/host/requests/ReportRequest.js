import axiosInstance from "../Api";
import { httpGetRequest } from "../Host";

/**
 * PDF hisobotni serverdan blob sifatida yuklab, brauzerda avtomatik saqlaydigan funksiya.
 *
 * @param {"ecg"|"smad"|"holter"|"lab"|"parasitology"|"combined"|"combined-ai"|"consultation"} type  - tahlil turi
 * @param {number} id         - analysisId; `combined` uchun patientId,
 *                              `combined-ai` uchun kompleks xulosa id si
 * @param {"uz"|"ru"|"en"} lang - PDF tili
 * @returns {Promise<void>}
 */
export const downloadReport = async (type, id, lang = "uz") => {
    const response = await axiosInstance.get(`/report/${type}/${id}`, {
        params: { lang },
        responseType: "blob",
    });

    // Serverdan Content-Disposition headerini o'qib, fayl nomini olishga urinish
    const disposition = response.headers["content-disposition"] || "";
    const filenameMatch = disposition.match(/filename="?([^";\n]+)"?/);
    const filename = filenameMatch
        ? filenameMatch[1]
        : `nmed_${type}_${id}_${new Date().toLocaleDateString("ru").replace(/\./g, "")}.pdf`;

    // Blob → URL → avtomatik bosish
    const url = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Xotira tozalash
    setTimeout(() => URL.revokeObjectURL(url), 5000);
};

// Hujjat haqiqiyligini QR token orqali tekshirish (autentifikatsiyasiz).
// Ilgari (type, id) juftligi ishlatilardi — ketma-ket ID sanab chiqish mumkin edi.
export const getDocumentVerification = (token) =>
    httpGetRequest(`/report/verify/${token}`);
