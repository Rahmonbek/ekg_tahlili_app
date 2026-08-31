import { httpGetRequest } from "../Host"

export const get_lab_values_data=(data)=>{
    return httpGetRequest("/lab-values/get-lab-values/", data)
}

/**
 * Bemorning laboratoriya ko'rsatkichlari vaqt bo'yicha (T-035).
 * Faqat kamida ikkita o'lchovi bor ko'rsatkichlar qaytariladi.
 */
export const get_lab_patient_dynamics=(patcientId)=>{
    return httpGetRequest(`/lab-values/patient-dynamics/${patcientId}`)
}
