import axiosInstance from "../Api"
import { httpDeleteRequest, httpGetRequest, httpPatchRequest, httpPostRequest, httpPutRequest } from "../Host"

// SuperAdmin kabineti — `api/superadmin/*` (backend `SuperAdminController`).
// Xatolik xabarlari `Api.js` interceptori orqali umumiy toast bilan chiqadi.

// ── Statistika ─────────────────────────────────────────────────────────────
export const sa_overview = (days = 30) => httpGetRequest("/superadmin/overview", { days })
export const sa_ai_usage = (days = 30) => httpGetRequest("/superadmin/ai-usage", { days })

// ── Klinikalar ─────────────────────────────────────────────────────────────
export const sa_clinics = (params) => httpGetRequest("/superadmin/clinics", params)
export const sa_clinic = (id) => httpGetRequest(`/superadmin/clinics/${id}`)
export const sa_create_clinic = (data) => httpPostRequest("/superadmin/clinics", data)
export const sa_update_clinic = (id, data) => httpPutRequest(`/superadmin/clinics/${id}`, data)
export const sa_set_clinic_active = (id, isActive) =>
    httpPatchRequest(`/superadmin/clinics/${id}/active?isActive=${isActive}`)
export const sa_delete_clinic = (id) => httpDeleteRequest(`/superadmin/clinics/${id}`)

// ── Xodimlar ───────────────────────────────────────────────────────────────
export const sa_users = (params) => httpGetRequest("/superadmin/users", params)
export const sa_create_user = (data) => httpPostRequest("/superadmin/users", data)
export const sa_update_user = (id, data) => httpPutRequest(`/superadmin/users/${id}`, data)
export const sa_set_password = (id, data) => httpPostRequest(`/superadmin/users/${id}/password`, data)
export const sa_set_user_status = (id, status) =>
    httpPatchRequest(`/superadmin/users/${id}/status?status=${status}`)
export const sa_delete_user = (id) => httpDeleteRequest(`/superadmin/users/${id}`)
export const sa_impersonate = (id) => httpPostRequest(`/superadmin/users/${id}/impersonate`)

// ── Bemorlar ───────────────────────────────────────────────────────────────
export const sa_patients = (params) => httpGetRequest("/superadmin/patients", params)
export const sa_update_patient = (id, data) => httpPutRequest(`/superadmin/patients/${id}`, data)
export const sa_delete_patient = (id) => httpDeleteRequest(`/superadmin/patients/${id}`)

// ── Tahlillar ──────────────────────────────────────────────────────────────
export const sa_analyses = (params) => httpGetRequest("/superadmin/analyses", params)
export const sa_analysis = (type, id) => httpGetRequest(`/superadmin/analyses/${type}/${id}`)
// DELETE tanasi bilan: `httpDeleteRequest` faqat query params uzatadi
export const sa_delete_analysis = (type, id, reason) =>
    axiosInstance.delete(`/superadmin/analyses/${type}/${id}`, { data: { reason } })
export const sa_restore_analysis = (type, id) => httpPostRequest(`/superadmin/analyses/${type}/${id}/restore`)

// ── Spravochniklar ─────────────────────────────────────────────────────────
export const sa_dictionary = (kind) => httpGetRequest(`/superadmin/dictionaries/${kind}`)
export const sa_create_dictionary = (kind, data) => httpPostRequest(`/superadmin/dictionaries/${kind}`, data)
export const sa_update_dictionary = (kind, id, data) => httpPutRequest(`/superadmin/dictionaries/${kind}/${id}`, data)
export const sa_delete_dictionary = (kind, id) => httpDeleteRequest(`/superadmin/dictionaries/${kind}/${id}`)

export const sa_lab_value_types = () => httpGetRequest("/superadmin/lab-value-types")
export const sa_create_lab_value_type = (data) => httpPostRequest("/superadmin/lab-value-types", data)
export const sa_update_lab_value_type = (id, data) => httpPutRequest(`/superadmin/lab-value-types/${id}`, data)
export const sa_delete_lab_value_type = (id) => httpDeleteRequest(`/superadmin/lab-value-types/${id}`)
