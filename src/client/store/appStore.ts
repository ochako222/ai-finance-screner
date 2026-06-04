import { create } from 'zustand';
import type { AnalysisMeta, AnalysisResult } from '../support/types';

interface AppStore {
    isPanelOpen: boolean;
    isSyncing: boolean;
    isAnalyzing: boolean;
    analysisResult: AnalysisResult | null;
    analysisError: string | null;
    analysisMeta: AnalysisMeta | null;
    syncError: string | null;

    openPanel: () => void;
    closePanel: () => void;
    setSyncing: (v: boolean) => void;
    setSyncError: (err: string | null) => void;
    setAnalyzing: (v: boolean) => void;
    setAnalysisResult: (result: AnalysisResult) => void;
    setAnalysisError: (message: string | undefined) => void;
    setAnalysisMeta: (meta: AnalysisMeta) => void;
}

export const useAppStore = create<AppStore>()((set) => ({
    isPanelOpen: false,
    isSyncing: false,
    isAnalyzing: false,
    analysisResult: null,
    analysisError: null,
    analysisMeta: null,
    syncError: null,

    openPanel: () =>
        set({
            isPanelOpen: true,
            analysisResult: null,
            analysisError: null,
            analysisMeta: null,
            isAnalyzing: false
        }),
    closePanel: () => set({ isPanelOpen: false }),
    setSyncing: (v) => set({ isSyncing: v }),
    setSyncError: (err) => set({ syncError: err }),
    setAnalyzing: (v) => set({ isAnalyzing: v }),
    setAnalysisResult: (result) => set({ analysisResult: result }),
    setAnalysisError: (message) =>
        set({ analysisError: message ?? 'Analysis failed', isAnalyzing: false }),
    setAnalysisMeta: (meta) => set({ analysisMeta: meta, isAnalyzing: false })
}));
