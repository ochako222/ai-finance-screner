import { useEffect, useRef } from 'react';
import { analyzeService } from '../api';
import { useAppStore } from '../store/appStore';

export default function AiPanel() {
    const {
        isPanelOpen,
        closePanel,
        isAnalyzing,
        setAnalyzing,
        analysisText,
        setAnalysisText,
        analysisMeta,
        setAnalysisMeta
    } = useAppStore();

    const esRef = useRef<EventSource | null>(null);

    useEffect(() => {
        if (!isPanelOpen) return;

        setAnalyzing(true);

        esRef.current = analyzeService.openStream(
            (text) => setAnalysisText(text),
            (meta) => setAnalysisMeta(meta),
            () => setAnalyzing(false)
        );

        return () => {
            esRef.current?.close();
            esRef.current = null;
        };
    }, [isPanelOpen, setAnalyzing, setAnalysisText, setAnalysisMeta]);

    useEffect(() => {
        if (!isPanelOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closePanel();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isPanelOpen, closePanel]);

    if (!isPanelOpen) return null;

    return (
        <div className="ai-overlay">
            <button
                type="button"
                className="ai-overlay__backdrop"
                onClick={closePanel}
                aria-label="Close dialog"
            />
            <div role="dialog" aria-modal="true" className="ai-panel">
                <div className="ai-panel__header">
                    <span>✦ AI Portfolio Analysis</span>
                    <button type="button" onClick={closePanel} aria-label="Close">
                        ×
                    </button>
                </div>
                <div className="ai-panel__content">
                    {isAnalyzing && !analysisText && (
                        <p className="ai-panel__loading">Analyzing your portfolio…</p>
                    )}
                    {analysisText && <pre className="ai-panel__text">{analysisText}</pre>}
                </div>
                {analysisMeta && (
                    <div className="ai-panel__footer">
                        Cost: ${analysisMeta.cost_usd.toFixed(4)} · Duration:{' '}
                        {(analysisMeta.duration_ms / 1000).toFixed(1)}s
                    </div>
                )}
            </div>
        </div>
    );
}
