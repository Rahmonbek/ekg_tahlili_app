import axiosInstance from "../Api";

export const get_dashboard_statistics = () =>
    axiosInstance.get('/dashboard/statistics');

export const get_unviewed_counts = () =>
    axiosInstance.get('/dashboard/unviewed-counts');
