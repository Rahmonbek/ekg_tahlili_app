import { httpGetRequest, httpPostRequest } from "../Host"

export const get_patcient_by_passport=(data)=>{
    return httpGetRequest("/patcient/get-patient-by-passport/", data)
}

export const save_patcient_data=(data)=>{
    return httpPostRequest("/patcient/save-patient-data/", data)
}

export const get_patcients_of_clinic=(data)=>{
    return httpGetRequest("/patcient/get-patcients-of-clinic/", data)
}

export const get_patient_card=(id, data)=>{
    return httpGetRequest("/patcient/get-patient-card/"+id, data)
}

/**
 * Passport seriyasi + tug'ilgan sana bo'yicha bemor QIDIRUVI.
 *
 * `get_patcient_by_passport` dan farqi: u tahlil yuklash sahifasi uchun
 * bitta bemor obyektini qaytaradi va o'zgartirilmagan. Bu esa alohida
 * "Passport ma'lumotlari bilan qidirish" sahifasi uchun — ro'yxat,
 * tahlillar soni va oxirgi tahlil sanasi bilan.
 *
 * @param {{passport:string, birthdate:string, lang?:string}} data
 */
export const search_patcients_by_passport=(data)=>{
    return httpGetRequest("/patcient/search-by-passport", data)
}
