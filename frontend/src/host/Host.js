import axios from "axios"

export const api="https://localhost:7020/api"

export const getTokenAccess=()=>{
    var token=window.localStorage.getItem("NMED_token")
    return(token)

}

export const httpPostRequest=async(url, data)=>{
    var token=getTokenAccess()
    var res=await axios.post(api+url, data, {
        headers:{
            "Authorization":"Bearer "+token
        }
    })
    return(res)
}
export const httpPatchRequest=async(url, data)=>{
    var token=getTokenAccess()
    var res=await axios.patch(api+url, data, {
        headers:{
            "Authorization":"Bearer "+token
        }
    })
    return(res)
}
export const httpGetRequest=async(url, params)=>{
    var token=getTokenAccess()
    var res=await axios.get(api+url, {
        params:params,
        headers:{
            "Authorization":"Bearer "+token
        }
    })
    return(res)
}
export const httpDeleteRequest=async(url, params)=>{
    var token=getTokenAccess()
    var res=await axios.delete(api+url, {
        params:params,
        headers:{
            "Authorization":"Bearer "+token
        }
    })
    return(res)
}