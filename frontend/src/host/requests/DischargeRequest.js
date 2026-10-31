import { httpDeleteRequest, httpGetRequest, httpPostRequest, httpPutRequest } from "../Host"

/**
 * Vipiska (statsionardan chiqarish epikrizi).
 *
 * Faqat shifokor yaratadi va faqat o'ziga yo'naltirilgan bemorga.
 * PDF — `downloadReport('discharge', id, lang)` (ReportRequest.js).
 */

/** Bemorning vipiskalari + `canCreate` (joriy foydalanuvchi yangisini chiqara oladimi). */
export const get_discharges_by_patient = (patientId) => {
    return httpGetRequest(`/discharge-summaries/by-patient/${patientId}`)
}

/**
 * Vipiskaga tanlash mumkin bo'lgan tahlillar va konsultatsiya xulosalari.
 * @param {{patientId:number, admissionDate:string, dischargeDate:string}} params  sanalar `YYYY-MM-DD`
 */
export const get_discharge_candidates = (params) => {
    return httpGetRequest("/discharge-summaries/candidates", params)
}

export const get_discharge = (id) => {
    return httpGetRequest(`/discharge-summaries/${id}`)
}

export const create_discharge = (data) => {
    return httpPostRequest("/discharge-summaries", data)
}

export const update_discharge = (id, data) => {
    return httpPutRequest(`/discharge-summaries/${id}`, data)
}

export const delete_discharge = (id) => {
    return httpDeleteRequest(`/discharge-summaries/${id}`)
}
