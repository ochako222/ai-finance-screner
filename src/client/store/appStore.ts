import { create } from 'zustand';

interface AppStore {
    isSyncing: boolean;
    syncError: string | null;

    setSyncing: (v: boolean) => void;
    setSyncError: (err: string | null) => void;
}

export const useAppStore = create<AppStore>()((set) => ({
    isSyncing: false,
    syncError: null,

    setSyncing: (v) => set({ isSyncing: v }),
    setSyncError: (err) => set({ syncError: err })
}));
