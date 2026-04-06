import { httpGetRequest, httpPutRequest } from "../Host"

export const get_med_diagnoses_by_patcient_id=(data)=>{
    return httpGetRequest("/medical-diagnose/get-medical-diagnose-by-patcient-id/", data)
}

export const get_diagnose_by_clinic=(params)=>{
    return httpGetRequest("/medical-diagnose/get-by-clinic", params)
}

export const get_diagnose_by_doctor=(params)=>{
    return httpGetRequest("/medical-diagnose/get-by-doctor", params)
}

export const get_diagnose_unviewed_count=()=>{
    return httpGetRequest("/medical-diagnose/unviewed-count")
}

export const mark_diagnose_viewed=()=>{
    return httpPutRequest("/medical-diagnose/mark-viewed")
}

export const get_diagnose_by_id=(id)=>{
    return httpGetRequest(`/medical-diagnose/${id}`)
}