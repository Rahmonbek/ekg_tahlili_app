import { create } from "zustand";

const SIDEBAR_MENU_STORAGE_KEY = 'nmed.sidebar.open.desktop';

const getDesktopMenuState = () => {
    if (typeof window === 'undefined') return true;

    const isDesktop = window.innerWidth > 1024;
    if (!isDesktop) return false;

    const saved = window.localStorage.getItem(SIDEBAR_MENU_STORAGE_KEY);
    if (saved == null) return true;
    return saved === '1';
};

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
    open_menu: getDesktopMenuState(),
    setopen_menu: (id) =>
        set(() => {
            const nextValue = !!id;
            if (typeof window !== 'undefined' && window.innerWidth > 1024) {
                window.localStorage.setItem(SIDEBAR_MENU_STORAGE_KEY, nextValue ? '1' : '0');
            }
            return { open_menu: nextValue };
        }),
    initMenu: () =>
        set(() => {
            if (typeof window === 'undefined') return { open_menu: true };

            if (window.innerWidth <= 1024) {
                return { open_menu: false };
            }

            const saved = window.localStorage.getItem(SIDEBAR_MENU_STORAGE_KEY);
            return { open_menu: saved == null ? true : saved === '1' };
        }),
    user: null,
    setuser: (id) => set({ user: id }),

    // ─── Phase 3: Region cache (har mount da qayta fetch qilmaslik uchun) ───
    regions: [],
    setregions: (data) => set({ regions: data }),

    // ─── Shifokor ko'rilmagan tahlillar soni ───────────────────────────────
    ecg_unread: 0,
    setecg_unread: (n) => set({ ecg_unread: n }),
    holter_unread: 0,
    setholter_unread: (n) => set({ holter_unread: n }),
    smad_unread: 0,
    setsmad_unread: (n) => set({ smad_unread: n }),
    lab_unread: 0,
    setlab_unread: (n) => set({ lab_unread: n }),
    diagnoses_unread: 0,
    setdiagnoses_unread: (n) => set({ diagnoses_unread: n }),

    // ─── Klinika onboarding va faollik holati ──────────────────────────────
    // null = tekshirilmagan, false = to'ldirilmagan, true = to'ldirilgan
    clinic_setup_modal: false,
    setclinic_setup_modal: (v) => set({ clinic_setup_modal: v }),

    // ─── Fon rejimidagi tahlillar ──────────────────────────────────────────
    // item: { key, label, listPath, status: 'loading'|'done'|'error', errorMsg? }
    // ─── Video qo'ng'iroq holati ──────────────────────────────────────────────
    videoCall: {
        incomingCall: null,   // { roomName, initiatorName, initiatorId, sessionId }
        activeRoom: null,     // { roomName, token, liveKitUrl }
        isCalling: false,
    },
    setVideoCall: (patch) => set((s) => ({ videoCall: { ...s.videoCall, ...patch } })),

    // ─── Online Konsultatsiya badge ────────────────────────────────────────────
    consultationBadge: {
        adminPendingCount: 0,   // Admin sidebar badge (pending konsultatsiyalar)
        doctorPendingCount: 0,  // Doctor sidebar badge (pending so'rovlar)
    },
    setConsultationBadge: (patch) => set((s) => ({
        consultationBadge: { ...s.consultationBadge, ...patch }
    })),

    pendingAnalyses: [],
    addPendingAnalysis: (item) => set((s) => ({ pendingAnalyses: [...s.pendingAnalyses, item] })),
    updatePendingAnalysis: (key, updates) => set((s) => ({
        pendingAnalyses: s.pendingAnalyses.map((a) => a.key === key ? { ...a, ...updates } : a),
    })),
    removePendingAnalysis: (key) => set((s) => ({
        pendingAnalyses: s.pendingAnalyses.filter((a) => a.key !== key),
    })),
}))
