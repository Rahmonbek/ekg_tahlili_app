import { httpGetRequest, httpPostRequest } from "../Host"


export const get_lab_analyses_by_patcient_id=(data)=>{
    return httpGetRequest("/lab-analyses/get-lab-analyses-by-patcient-id/", data)
}
