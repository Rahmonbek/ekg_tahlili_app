import { httpGetRequest } from "../Host"


export const get_clinic_by_id=(data)=>{
    return httpGetRequest("/clinic/get-clinic-by-id/", data)
}