import { create } from "zustand";

export const useStore = create((set) => ({
    user_id: null,
    setuser_id: (id) => set({ user_id: id }),
    open_menu: false,
    setopen_menu: (id) => set({ open_menu: id }),
    clinic: null,
    setclinic: (id) => set({ clinic: id }),
}))