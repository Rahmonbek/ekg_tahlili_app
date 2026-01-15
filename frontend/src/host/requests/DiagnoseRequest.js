import { httpGetRequest } from "../Host"

export const get_med_diagnoses_by_patcient_id=(data)=>{
    return httpGetRequest("/med-diagnose/get-diognose-by-patcient-id/", data)
}