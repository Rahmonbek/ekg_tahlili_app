import { httpGetRequest, httpPostRequest } from "../Host"


export const registration=(data)=>{
    return httpPostRequest("/auth/register/", data)
}

export const login=(data)=>{
    return httpPostRequest("/auth/login/", data)
}

export const verify_code=(data)=>{
    return httpPostRequest("/auth/verify/", data)
}

export const send_reset_code=(data)=>{
    return httpPostRequest("/auth/send-reset-code/", data)
}

export const change_password=(data)=>{
    return httpPostRequest("/auth/change-password/", data)
}

export const checkusername = (data) => {
    return httpGetRequest("/auth/check-username", data);
  };

export const checkphone = (data) => {
    return httpGetRequest("/auth/check-phone", data);
  };

export const checkClinicInn = (data) => {
    return httpGetRequest("/auth/check-clinic-inn", data);
  };
  
  
