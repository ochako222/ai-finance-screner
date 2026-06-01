import { create } from 'zustand';
import type { AnalysisMeta } from '../support/types';

interface AppStore {
    isPanelOpen: boolean;
    isSyncing: boolean;
    isAnalyzing: boolean;
    analysisText: string;
    analysisMeta: AnalysisMeta | null;
    syncError: string | null;

    openPanel: () => void;
    closePanel: () => void;
    setSyncing: (v: boolean) => void;
    setSyncError: (err: string | null) => void;
    setAnalyzing: (v: boolean) => void;
    setAnalysisText: (text: string) => void;
    setAnalysisMeta: (meta: AnalysisMeta) => void;
}

export const useAppStore = create<AppStore>()((set) => ({
    isPanelOpen: false,
    isSyncing: false,
    isAnalyzing: false,
    analysisText: '',
    analysisMeta: null,
    syncError: null,

    openPanel: () =>
        set({ isPanelOpen: true, analysisText: '', analysisMeta: null, isAnalyzing: false }),
    closePanel: () => set({ isPanelOpen: false }),
    setSyncing: (v) => set({ isSyncing: v }),
    setSyncError: (err) => set({ syncError: err }),
    setAnalyzing: (v) => set({ isAnalyzing: v }),
    setAnalysisText: (text) => set({ analysisText: text }),
    setAnalysisMeta: (meta) => set({ analysisMeta: meta, isAnalyzing: false })
}));
