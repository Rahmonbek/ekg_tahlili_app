import { httpGetRequest, httpPostRequest } from "../Host"


export const get_smad_analyses_by_patcient_id=(data)=>{
    return httpGetRequest("/smad-analyses/get-smad-analyses-by-patcient-id/", data)
}

export const get_smad_analyses_by_clinic=(params)=>{
    return httpGetRequest("/smad-analyses/get-by-clinic", params)
}

export const get_smad_analyse_by_id=(id)=>{
    return httpGetRequest(`/smad-analyses/${id}`)
}
