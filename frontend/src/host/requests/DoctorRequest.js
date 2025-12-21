import { httpGetRequest, httpPostRequest } from "../Host"

export const get_doctors_of_clinic=(data)=>{
    return httpGetRequest("/doctor/get-doctors-of-clinic/", data)
}

export const get_params_for_add_staff=(data)=>{
    return httpGetRequest("/doctor/get-params-for-add-staff/", data)
}

export const get_default_username=(data)=>{
    return httpGetRequest("/doctor/get-default-username/", data)
}
export const get_doctor_by_id=(data)=>{
    return httpGetRequest("/doctor/get-doctors-by-id/", data)
}
export const get_doctor_by_clinic_id=(data)=>{
    return httpGetRequest("/doctor/get-doctors-by-clinic-id/", data)
}

export const change_doctor_data=(data)=>{
    return httpPostRequest("/doctor/save-doctor-data/", data)
}