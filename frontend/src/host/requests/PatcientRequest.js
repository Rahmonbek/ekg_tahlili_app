import { httpGetRequest } from "../Host"

export const get_patcient_by_passport=(data)=>{
    return httpGetRequest("/patcient/get-patient-by-passport/", data)
}