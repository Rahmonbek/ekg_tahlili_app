import { httpGetRequest, httpPostRequest } from "../Host"


export const get_ecg_analyses_by_patcient_id=(data)=>{
    return httpGetRequest("/ecg-analyses/get-ecg-analyses-by-patcient-id/", data)
}
