import axiosInstance from "../Api";

export const get_dashboard_statistics = () =>
    axiosInstance.get('/dashboard/statistics');
