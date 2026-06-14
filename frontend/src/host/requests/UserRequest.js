import { httpGetRequest, httpPostRequest, httpPostFormRequest } from "../Host"


export const get_user_data=(data)=>{
    return httpGetRequest("/user/get-user-by-token/", data)
}

export const get_onboarding_status=()=>{
    return httpGetRequest("/user/onboarding-status")
}

export const send_doc_data=(data)=>{
    return httpPostFormRequest("/doctor/save-doctor-data", data)
}