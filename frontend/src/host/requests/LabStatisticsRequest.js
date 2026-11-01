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
