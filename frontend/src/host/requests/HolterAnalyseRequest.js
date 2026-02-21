import { httpGetRequest, httpPostRequest } from "../Host"


export const get_holter_analyses_by_patcient_id=(data)=>{
    return httpGetRequest("/holter-analyses/get-holter-analyses-by-patcient-id/", data)
}
