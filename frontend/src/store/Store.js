import { create } from "zustand";

export const useStore = create((set) => ({
    user_id: null,
    setuser_id: (id) => set({ user_id: id }),
    open_admin_modal: false,
    setopen_admin_modal: (id) => set({ open_admin_modal: id }),
    loader: false,
    setloader: (id) => set({ loader: id }),
    ecg_btn_loading: false,
    setecg_btn_loading: (id) => set({ ecg_btn_loading: id }),
    complaints: [],
    setcomplaints: (id) => set({ complaints: id }),
    lab_values: [],
    setlab_values: (id) => set({ lab_values: id }),
    lab_categories: [],
    setlab_categories: (id) => set({ lab_categories: id }),
    doctors: [],
    setdoctors: (id) => set({ doctors: id }),
    roles: [],
    setroles: (id) => set({ roles: id }),
    positions: [],
    setpositions: (id) => set({ positions: id }),
    open_menu: true,
    setopen_menu: (id) => set({ open_menu: id }),
    initMenu: () =>
    set({
    open_menu: window.innerWidth > 768,
     }),
     user: null,
    setuser: (id) => set({ user: id }),

    // ─── Phase 3: Region cache (har mount da qayta fetch qilmaslik uchun) ───
    regions: [],
    setregions: (data) => set({ regions: data }),
}))