import { httpGetRequest } from "../Host"

/** Audit jurnali — Admin/Direktor uchun o'z shifoxonasi doirasida. */
export const get_audit_logs = (data) => {
    return httpGetRequest("/audit-logs", data)
}

/** Jurnalda uchraydigan amallar ro'yxati (filtr uchun). */
export const get_audit_actions = () => {
    return httpGetRequest("/audit-logs/actions")
}
