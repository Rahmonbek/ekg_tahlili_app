import { create } from "zustand";

export const useStore = create((set) => ({
    user_id: null,
    setuser_id: (id) => set({ user_id: id }),
    open_admin_modal: false,
    setopen_admin_modal: (id) => set({ open_admin_modal: id }),
    loader: false,
    setloader: (id) => set({ loader: id }),
    complaints: [],
    setcomplaints: (id) => set({ complaints: id }),
    roles: [],
    setroles: (id) => set({ roles: id }),
    positions: [],
    setpositions: (id) => set({ positions: id }),
    open_menu: true,
    setopen_menu: (id) => set({ open_menu: id }),
    user: null,
    setuser: (id) => set({ user: id }),
}))