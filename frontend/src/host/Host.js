import axios from "axios"

export const api="http://10.34.82.154:5000/api"
export const apiEcg="http://127.0.0.1:8000"
export const imgApi="http://10.34.82.154:5000"

export const getTokenAccess=()=>{
    var token=window.localStorage.getItem("NMED_token")
    return(token)

}

export const deleteTokenAccess=()=>{
    window.localStorage.removeItem("NMED_token")
   

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