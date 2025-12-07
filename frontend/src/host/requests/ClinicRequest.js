import { httpGetRequest } from "../Host"

export const get_clinic_data=(data)=>{
    return httpGetRequest("/clinic/get-clinic-by-token/", data)
}