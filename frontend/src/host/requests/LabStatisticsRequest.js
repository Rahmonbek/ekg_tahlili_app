import axiosInstance from "../Api";
import { httpGetRequest, httpPostRequest } from "../Host";

/**
 * Klinika laboratoriya statistikasi va xavf signallari (admin/direktor).
 * `filters`: { from, to, doctorId, gender, ageFrom, ageTo, category, indicator, onlyAbnormal }
 */
export const get_lab_stats_summary = (filters) =>
    httpGetRequest("/lab-statistics/summary", filters);

export const get_lab_stats_timeline = (filters, bucket = "month") =>
    httpGetRequest("/lab-statistics/timeline", { ...filters, bucket });

export const get_lab_stats_indicators = (filters) =>
    httpGetRequest("/lab-statistics/indicators", filters);

export const get_lab_stats_indicator = (column, filters) =>
    httpGetRequest(`/lab-statistics/indicator/${encodeURIComponent(column)}`, filters);

export const get_lab_stats_doctors = (filters) =>
    httpGetRequest("/lab-statistics/doctors", filters);

export const get_lab_stats_doctor_options = () =>
    httpGetRequest("/lab-statistics/doctor-options");

export const get_lab_signals_summary = () =>
    httpGetRequest("/lab-statistics/signals/summary");

/** `params`: { rule, status, severity, review, search, patientId, page, pageSize } */
export const get_lab_signals = (params) =>
    httpGetRequest("/lab-statistics/signals", params);

/** `decision`: confirmed | rejected | pending */
export const review_lab_signal = (id, decision, note) =>
    httpPostRequest(`/lab-statistics/signals/${id}/review`, { decision, note });

export const recompute_lab_signals = () =>
    httpPostRequest("/lab-statistics/signals/recompute", {});

/**
 * Bemor kartasidagi xavf signallari bloki (admin/direktor — klinikasi
 * bemorlari; shifokor — ro'yxatida ko'radigan bemorlari).
 * Javob: { canView, items }
 */
export const get_patient_lab_signals = (patientId) =>
    httpGetRequest(`/lab-signals/patient/${patientId}`);

/** Bemor kartasidan qaror. `decision`: confirmed | rejected | pending */
export const review_patient_lab_signal = (id, decision, note) =>
    httpPostRequest(`/lab-signals/${id}/review`, { decision, note });

/** Statistika PDF hisoboti — sahifadagi filtrlar bilan; brauzerda saqlanadi. */
export const download_lab_stats_pdf = async (filters, lang = "uz") => {
    const response = await axiosInstance.get("/lab-statistics/pdf", {
        params: { ...filters, lang },
        responseType: "blob",
    });
    const disposition = response.headers["content-disposition"] || "";
    const match = disposition.match(/filename="?([^";\n]+)"?/);
    const filename = match ? match[1] : `lab_statistika_${new Date().toISOString().slice(0, 10)}.pdf`;
    const url = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
};
