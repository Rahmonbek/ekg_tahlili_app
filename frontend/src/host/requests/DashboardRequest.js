import axiosInstance from "../Api";

export const get_dashboard_statistics = () =>
    axiosInstance.get('/dashboard/statistics');

export const get_unviewed_counts = () =>
    axiosInstance.get('/dashboard/unviewed-counts');

// Shifokor profili: unga yuborilgan (tayinlangan) tahlillar statistikasi
// va hali xulosa yozilmagan tahlillar ro'yxati.
export const get_doctor_dashboard = (limit = 12) =>
    axiosInstance.get('/doctor-dashboard', { params: { limit } });
