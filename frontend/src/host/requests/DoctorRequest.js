import { httpGetRequest } from "../Host"

export const get_doctors_of_clinic=(data)=>{
    return httpGetRequest("/doctor/get-doctors-of-clinic/", data)
}