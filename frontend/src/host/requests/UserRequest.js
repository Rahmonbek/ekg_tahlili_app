import { httpGetRequest, httpPostRequest } from "../Host"


export const get_user_data=(data)=>{
    return httpGetRequest("/user/get-user-by-token/", data)
}


export const send_doc_data=(data)=>{
    return httpPostRequest("/doctor/save-doctor-data", data)
}