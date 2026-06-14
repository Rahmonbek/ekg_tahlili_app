import { httpGetRequest, httpPatchRequest, httpPostRequest, httpPostFormRequest } from "../Host"


export const get_clinic_by_id=(data)=>{
    return httpGetRequest("/clinic/get-clinic-by-id/", data)
}

// [FromForm] + IFormFile bor → multipart/form-data shart
export const send_clinic_info=(data)=>{
    return httpPostFormRequest("/clinic/update-clinic-data", data)
}

// [FromBody] JSON → oddiy POST
export const send_clinic_phone=(data)=>{
    return httpPostRequest("/clinic/update-clinic-phone", data)
}

// [FromForm] + IFormFile bor → multipart/form-data shart
export const send_clinic_detail=(data)=>{
    return httpPostFormRequest("/clinic/create-update-clinic-detail", data)
}

// SuperAdmin: klinikani faollashtirish / o'chirish
export const set_clinic_active=(clinicId, isActive)=>{
    return httpPatchRequest(`/clinic/${clinicId}/set-active?isActive=${isActive}`)
}