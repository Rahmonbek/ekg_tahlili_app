import axiosInstance from "../Api"

/**
 * Tahlilni yumshoq o'chirish. Sabab majburiy — audit jurnaliga yoziladi.
 *
 * `httpDeleteRequest` faqat `params` qabul qiladi, bu yerda esa tana kerak:
 * sabab erkin matn va u URL da ketmasligi kerak.
 *
 * @param {string} type   "ecg" | "lab" | "holter" | "smad" | "diagnose"
 * @param {number} id     tahlil id
 * @param {string} reason o'chirish sababi
 */
export const delete_analysis = (type, id, reason) => {
    return axiosInstance.delete(`/analyses/${type}/${id}`, { data: { reason } })
}

/** O'chirilgan tahlillar ro'yxati (Admin/Direktor). */
export const get_deleted_analyses = () => {
    return axiosInstance.get('/analyses/deleted')
}

/** O'chirilgan tahlilni tiklash (SuperAdmin). */
export const restore_analysis = (type, id) => {
    return axiosInstance.post(`/analyses/${type}/${id}/restore`)
}
