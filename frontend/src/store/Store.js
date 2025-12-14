import { create } from "zustand";

export const useStore = create((set) => ({
    user_id: null,
    setuser_id: (id) => set({ user_id: id }),
    complaints: [],
    setcomplaints: (id) => set({ complaints: id }),
    open_menu: true,
    setopen_menu: (id) => set({ open_menu: id }),
    clinic: null,
    setclinic: (id) => set({ clinic: id }),
}))