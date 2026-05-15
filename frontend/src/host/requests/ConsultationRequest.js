import { httpGetRequest, httpPostRequest, httpPutRequest } from "../Host";

// ─── ADMIN ─────────────────────────────────────────────────────────────────

export const getDoctorsCatalog = (params) =>
    httpGetRequest("/online-consultation/doctors-catalog", params);

export const getMyConsultants = () =>
    httpGetRequest("/online-consultation/my-consultants");

export const getConsultantHistory = (clinicConsultantId) =>
    httpGetRequest(`/online-consultation/my-consultants/${clinicConsultantId}/history`);

export const createConsultation = (data) =>
    httpPostRequest("/online-consultation/create", data);

export const getConsultationList = (params) =>
    httpGetRequest("/online-consultation/list", params);

export const getConsultationById = (id) =>
    httpGetRequest(`/online-consultation/${id}`);

export const cancelConsultation = (id) =>
    httpPutRequest(`/online-consultation/${id}/cancel`);

export const rateConsultation = (id, data) =>
    httpPostRequest(`/online-consultation/${id}/rate`, data);

// ─── DOCTOR ────────────────────────────────────────────────────────────────

export const getIncomingConsultations = (params) =>
    httpGetRequest("/online-consultation/incoming", params);

export const getMyLinkedClinics = () =>
    httpGetRequest("/online-consultation/my-linked-clinics");

export const acceptConsultation = (id) =>
    httpPutRequest(`/online-consultation/${id}/accept`);

export const rejectConsultation = (id, data) =>
    httpPutRequest(`/online-consultation/${id}/reject`, data);

export const scheduleConsultation = (id, data) =>
    httpPutRequest(`/online-consultation/${id}/schedule`, data);

export const concludeConsultation = (id, data) =>
    httpPostRequest(`/online-consultation/${id}/conclude`, data);

export const getConsultationAnalyses = (id) =>
    httpGetRequest(`/online-consultation/${id}/analyses`);

// ─── VIDEO ─────────────────────────────────────────────────────────────────

export const getConsultationLiveKitToken = (id) =>
    httpGetRequest(`/online-consultation/${id}/livekit-token`);
