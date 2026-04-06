import { httpGetRequest, httpPostRequest, httpPutRequest } from "../Host"


export const get_ecg_analyses_by_patcient_id=(data)=>{
    return httpGetRequest("/ecg-analyses/get-ecg-analyses-by-patcient-id/", data)
}

export const get_ecg_analyses_by_clinic=(params)=>{
    return httpGetRequest("/ecg-analyses/get-by-clinic", params)
}

export const get_ecg_analyses_by_doctor=(params)=>{
    return httpGetRequest("/ecg-analyses/get-by-doctor", params)
}

export const get_ecg_unviewed_count=()=>{
    return httpGetRequest("/ecg-analyses/unviewed-count")
}

export const mark_ecg_viewed=()=>{
    return httpPutRequest("/ecg-analyses/mark-viewed")
}

export const get_ecg_analyse_by_id=(id)=>{
    return httpGetRequest(`/ecg-analyses/${id}`)
}
