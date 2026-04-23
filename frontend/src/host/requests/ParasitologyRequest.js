import axiosInstance from "../Api";

export const get_parasitology_analyses_by_clinic = (params) =>
    axiosInstance.get('/parasitology-analyses/get-by-clinic', { params });

export const get_parasitology_analyses_by_doctor = (params) =>
    axiosInstance.get('/parasitology-analyses/get-by-doctor', { params });

export const get_parasitology_analyses_by_nurse = (params) =>
    axiosInstance.get('/parasitology-analyses/get-by-nurse', { params });
