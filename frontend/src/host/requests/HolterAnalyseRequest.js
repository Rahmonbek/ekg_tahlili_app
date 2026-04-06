import { httpGetRequest, httpPostRequest } from "../Host"


export const get_holter_analyses_by_patcient_id=(data)=>{
    return httpGetRequest("/holter-analyses/get-holter-analyses-by-patcient-id/", data)
}

export const get_holter_analyses_by_clinic=(params)=>{
    return httpGetRequest("/holter-analyses/get-by-clinic", params)
}

export const get_holter_analyse_by_id=(id)=>{
    return httpGetRequest(`/holter-analyses/${id}`)
}
