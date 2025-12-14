import { httpGetRequest, httpPostRequest } from "../Host"

export const get_patcient_by_passport=(data)=>{
    return httpGetRequest("/patcient/get-patient-by-passport/", data)
}

export const save_patcient_data=(data)=>{
    return httpPostRequest("/patcient/save-patient-data/", data)
}