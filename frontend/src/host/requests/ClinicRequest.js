import { httpGetRequest, httpPatchRequest, httpPostRequest } from "../Host"


export const get_clinic_by_id=(data)=>{
    return httpGetRequest("/clinic/get-clinic-by-id/", data)
}


export const send_clinic_info=(data)=>{
    return httpPostRequest("/clinic/update-clinic-data", data)
}

export const send_clinic_phone=(data)=>{
    return httpPostRequest("/clinic/update-clinic-phone", data)
}


export const send_clinic_detail=(data)=>{
    return httpPostRequest("/clinic/create-update-clinic-detail", data)
}

// SuperAdmin: klinikani faollashtirish / o'chirish
export const set_clinic_active=(clinicId, isActive)=>{
    return httpPatchRequest(`/clinic/${clinicId}/set-active?isActive=${isActive}`)
}