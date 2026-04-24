import { httpGetRequest, httpPostRequest, httpPutRequest, httpDeleteRequest } from "../Host"

export const get_analysis_diagnoses = (type, analysisId) => {
    return httpGetRequest(`/analysis-diagnosis`, { type, analysisId });
}

export const check_has_diagnosis = (type, ids) => {
    return httpGetRequest(`/analysis-diagnosis/has-diagnosis`, { type, ids: ids.join(',') });
}

export const save_analysis_diagnosis = (data) => {
    return httpPostRequest("/analysis-diagnosis", data);
}

export const update_analysis_diagnosis = (id, data) => {
    return httpPutRequest(`/analysis-diagnosis/${id}`, data);
}

export const delete_analysis_diagnosis = (id) => {
    return httpDeleteRequest(`/analysis-diagnosis/${id}`);
}
