import { httpGetRequest } from "../Host"

export const get_complaints_data=(data)=>{
    return httpGetRequest("/complaints/get-complaints/", data)
}