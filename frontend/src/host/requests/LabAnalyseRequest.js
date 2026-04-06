import { httpGetRequest, httpPostRequest } from "../Host"


export const get_lab_analyses_by_patcient_id=(data)=>{
    return httpGetRequest("/lab-analyses/get-lab-analyses-by-patcient-id/", data)
}

export const get_lab_analyses_by_clinic=(params)=>{
    return httpGetRequest("/lab-analyses/get-by-clinic", params)
}

export const get_lab_analyse_by_id=(id)=>{
    return httpGetRequest(`/lab-analyses/${id}`)
}
