import { httpDeleteRequest, httpGetRequest, httpPostRequest } from "../Host"

/**
 * Kompleks (ko'p tahlilli) AI xulosasi.
 *
 * Bemor kartasida belgilangan bir nechta tahlil AI ga birgalikda
 * yuboriladi va yagona yakuniy xulosa olinadi.
 *
 * Barcha so'rovlar .NET API orqali — Python API ga bevosita murojaat
 * qilinmaydi (loyiha arxitekturasi qoidasi).
 */

/**
 * @param {{patientId:number, items:{type:string,id:number}[], lang:string, mode:'summary'|'deep'}} data
 */
export const create_combined_analysis = (data) => {
    return httpPostRequest("/combined-analyses/create", data)
}

export const get_combined_analyses_by_patient = (patientId) => {
    return httpGetRequest(`/combined-analyses/by-patient/${patientId}`)
}

export const get_combined_analysis = (id) => {
    return httpGetRequest(`/combined-analyses/${id}`)
}

export const delete_combined_analysis = (id) => {
    return httpDeleteRequest(`/combined-analyses/${id}`)
}

/**
 * Kompleks xulosalarning umumiy ro'yxati (alohida sahifa uchun).
 *
 * Rol bo'yicha cheklangan: foydalanuvchi bemorlar ro'yxatida qaysi
 * bemorlarni ko'rsa, shu bemorlarning xulosalari chiqadi.
 *
 * @param {{page?:number, pageSize?:number, search?:string}} params
 */
export const get_combined_analyses_list = (params) => {
    return httpGetRequest("/combined-analyses/list", params)
}
