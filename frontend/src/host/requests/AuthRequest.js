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


export const checkusername = (username) => {
    return httpGetRequest("/auth/check-username", {
      username: username
    });
  };
  
  