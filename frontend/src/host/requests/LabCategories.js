import { httpGetRequest } from "../Host"

export const get_lab_categories_data=(data)=>{
    return httpGetRequest("/lac-categories/get-all-lab-categories/", data)
}