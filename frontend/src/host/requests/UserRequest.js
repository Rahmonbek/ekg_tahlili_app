import { httpGetRequest } from "../Host"


export const get_user_data=(data)=>{
    return httpGetRequest("/user/get-user-by-token/", data)
}