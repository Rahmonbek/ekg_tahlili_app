import { httpGetRequest } from "../Host"

export const get_doctors_of_clinic=(data)=>{
    return httpGetRequest("/doctor/get-doctors-of-clinic/", data)
}

export const get_params_for_add_staff=(data)=>{
    return httpGetRequest("/doctor/get-params-for-add-staff/", data)
}