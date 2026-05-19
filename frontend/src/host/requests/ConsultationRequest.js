import { httpGetRequest, httpPostRequest, httpPutRequest } from "../Host";

// ─── ADMIN ─────────────────────────────────────────────────────────────────

export const searchDoctors = (params) =>
    httpGetRequest("/consultation/search-doctors", params);

export const getConsultationClinicOptions = (params) =>
    httpGetRequest("/consultation/clinic-options", params);

export const inviteDoctor = (data) =>
    httpPostRequest("/consultation/invite", data);

export const getMyConsultants = () =>
    httpGetRequest("/consultation/my-consultants");

export const getSentInvitations = () =>
    httpGetRequest("/consultation/my-sent-invitations");

export const getConsultationBadgeCounts = () =>
    httpGetRequest("/consultation/badge-counts");

export const updateConsultantPrice = (id, data) =>
    httpPutRequest(`/consultation/consultants/${id}/update-price`, data);

export const getConsultantHistory = (id, params) =>
    httpGetRequest(`/consultation/consultants/${id}/history`, params);

export const createConsultations = (data) =>
    httpPostRequest("/consultation/create", data);

export const findConsultationPatient = (params) =>
    httpGetRequest("/consultation/patient-lookup", params);

export const getConsultationList = (params) =>
    httpGetRequest("/consultation/list", params);

export const getConsultationDetailAdmin = (id) =>
    httpGetRequest(`/consultation/${id}/detail`);

export const getConsultationTokenAdmin = (id) =>
    httpGetRequest(`/consultation/${id}/livekit-token`);

// ─── DOCTOR ────────────────────────────────────────────────────────────────

export const getMyInvitations = () =>
    httpGetRequest("/consultation/invitations");

export const acceptInvitation = (id) =>
    httpPutRequest(`/consultation/invitations/${id}/accept`);

export const rejectInvitation = (id) =>
    httpPutRequest(`/consultation/invitations/${id}/reject`);

export const getMyClinics = () =>
    httpGetRequest("/consultation/my-clinics");

export const getClinicHistory = (id, params) =>
    httpGetRequest(`/consultation/my-clinics/${id}/history`, params);

export const getMyConsultations = (params) =>
    httpGetRequest("/consultation/my-consultations", params);

export const acceptConsultation = (id) =>
    httpPutRequest(`/consultation/${id}/accept`);

export const rejectConsultation = (id, data) =>
    httpPutRequest(`/consultation/${id}/reject`, data);

export const getConsultationDetailDoctor = (id) =>
    httpGetRequest(`/consultation/${id}/doctor-detail`);

export const concludeConsultation = (id, data) =>
    httpPostRequest(`/consultation/${id}/conclude`, data);

export const getConsultationTokenDoctor = (id) =>
    httpGetRequest(`/consultation/${id}/livekit-token-doctor`);
