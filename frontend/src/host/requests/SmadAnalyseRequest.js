import { httpGetRequest, httpPostRequest, httpPutRequest } from "../Host"


export const get_smad_analyses_by_patcient_id=(data)=>{
    return httpGetRequest("/smad-analyses/get-smad-analyses-by-patcient-id/", data)
}

export const get_smad_analyses_by_clinic=(params)=>{
    return httpGetRequest("/smad-analyses/get-by-clinic", params)
}

export const get_smad_analyses_by_doctor=(params)=>{
    return httpGetRequest("/smad-analyses/get-by-doctor", params)
}

export const get_smad_analyses_by_nurse=(params)=>{
    return httpGetRequest("/smad-analyses/get-by-nurse", params)
}

export const get_smad_unviewed_count=()=>{
    return httpGetRequest("/smad-analyses/unviewed-count")
}

export const mark_smad_viewed=()=>{
    return httpPutRequest("/smad-analyses/mark-viewed")
}

export const get_smad_analyse_by_id=(id)=>{
    return httpGetRequest(`/smad-analyses/${id}`)
}
