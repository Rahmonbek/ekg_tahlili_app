import { httpGetRequest } from "../Host"

export const get_lab_values_data=(data)=>{
    return httpGetRequest("/lab-values/get-lab-values/", data)
}