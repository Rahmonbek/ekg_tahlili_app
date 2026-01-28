import { httpGetRequest } from "../Host"

export const get_region_data=(data)=>{
    return httpGetRequest("/regions/get-regions", data)
}

export const get_districts_data = (data) => {
    return httpGetRequest("/regions/get-districts-by-region-id", data); 
}
