import { httpGetRequest } from "../Host"

/** Tizim holati: API, baza, AI xizmati + oxirgi 24 soat statistikasi. */
export const get_system_status = () => {
    return httpGetRequest("/system/status")
}
