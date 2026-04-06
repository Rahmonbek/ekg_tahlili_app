import { httpGetRequest, httpPostRequest, httpPutRequest } from "../Host"


export const get_holter_analyses_by_patcient_id=(data)=>{
    return httpGetRequest("/holter-analyses/get-holter-analyses-by-patcient-id/", data)
}

export const get_holter_analyses_by_clinic=(params)=>{
    return httpGetRequest("/holter-analyses/get-by-clinic", params)
}

export const get_holter_analyses_by_doctor=(params)=>{
    return httpGetRequest("/holter-analyses/get-by-doctor", params)
}

export const get_holter_analyses_by_nurse=(params)=>{
    return httpGetRequest("/holter-analyses/get-by-nurse", params)
}

export const get_holter_unviewed_count=()=>{
    return httpGetRequest("/holter-analyses/unviewed-count")
}

export const mark_holter_viewed=()=>{
    return httpPutRequest("/holter-analyses/mark-viewed")
}

export const get_holter_analyse_by_id=(id)=>{
    return httpGetRequest(`/holter-analyses/${id}`)
}
