import { httpGetRequest, httpPostRequest } from "../Host"


export const get_smad_analyses_by_patcient_id=(data)=>{
    return httpGetRequest("/smad-analyses/get-smad-analyses-by-patcient-id/", data)
}
