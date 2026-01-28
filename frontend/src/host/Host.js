import axios from "axios"
import axiosInstance from "./Api";
import Cookies from "js-cookie";
//export const api="https://api.nmed.uz/api"
//export const apiEcg="https://analyse.nmed.uz"
//export const imgApi="https://api.nmed.uz"

export const api="http://172.22.22.25:5000/api"
export const apiEcg="http://127.0.0.1:8000"
export const imgApi="http://172.22.22.25:5000"


export const getTokenAccess=()=>{
    var token=Cookies.get("NMED_token")
    return(token)
}

export const deleteTokenAccess=()=>{
    Cookies.remove("NMED_token")
   }

export const httpPostRequest = async (url, data) => {
    return await axiosInstance.post(url, data);
};

export const httpPatchRequest = async (url, data) => {
    return await axiosInstance.patch(url, data);
};

export const httpGetRequest = async (url, params) => {
    return await axiosInstance.get(url, { params });
};

export const httpDeleteRequest = async (url, params) => {
    return await axiosInstance.delete(url, { params });
};