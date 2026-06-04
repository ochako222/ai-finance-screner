import { useEffect, useRef } from 'react';
import { analyzeService } from '../api';
import { useAppStore } from '../store/appStore';
import type { AnalysisResult, Recommendation } from '../support/types';
import PositionsTable from './PositionsTable';

const ACTION_LABELS: Record<Recommendation['action'], string> = {
    buy: 'BUY',
    sell: 'SELL',
    hold: 'HOLD',
    rebalance: 'REBALANCE',
    watch: 'WATCH'
};

const ACTION_CLASS: Record<Recommendation['action'], string> = {
    buy: 'rec__badge--buy',
    sell: 'rec__badge--sell',
    hold: 'rec__badge--hold',
    rebalance: 'rec__badge--rebalance',
    watch: 'rec__badge--watch'
};

function fmt(n: number, decimals = 2) {
    return n.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

function pnlClass(v: number) {
    return v >= 0 ? 'pos' : 'neg';
}

function AnalysisView({ result }: { result: AnalysisResult }) {
    const { overview, performance, risk, recommendations, watchlist } = result;

    return (
        <div className="analysis">
            <section className="analysis__section">
                <h3 className="analysis__heading">Overview</h3>
                <div className="analysis__overview-grid">
                    <div className="analysis__kv">
                        <span className="analysis__kv-label">Total</span>
                        <span className="analysis__kv-value">
                            {overview.currency} {fmt(overview.total_value)}
                        </span>
                    </div>
                    <div className="analysis__kv">
                        <span className="analysis__kv-label">Stocks</span>
                        <span className="analysis__kv-value">
                            {overview.currency} {fmt(overview.stocks_value)}
                        </span>
                    </div>
                    <div className="analysis__kv">
                        <span className="analysis__kv-label">Crypto</span>
                        <span className="analysis__kv-value">
                            {overview.currency} {fmt(overview.crypto_value)}
                        </span>
                    </div>
                </div>
                <p className="analysis__summary">{overview.summary}</p>
            </section>

            <section className="analysis__section">
                <h3 className="analysis__heading">Performance</h3>
                <div className="analysis__perf-cols">
                    {performance.top.length > 0 && (
                        <div>
                            <div className="analysis__perf-label">Top performers</div>
                            {performance.top.map((p) => (
                                <div key={p.ticker} className="analysis__perf-row">
                                    <span className="analysis__perf-ticker">{p.ticker}</span>
                                    {p.sector && (
                                        <span className="analysis__perf-sector">{p.sector}</span>
                                    )}
                                    <span className={`analysis__perf-pnl ${pnlClass(p.pnl_pct)}`}>
                                        {p.pnl_pct >= 0 ? '+' : ''}
                                        {fmt(p.pnl_pct)}%
                                    </span>
                                    {p.pnl_value !== undefined && (
                                        <span
                                            className={`analysis__perf-val ${pnlClass(p.pnl_value)}`}
                                        >
                                            {p.pnl_value >= 0 ? '+' : ''}
                                            {fmt(p.pnl_value)}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    {performance.losers.length > 0 && (
                        <div>
                            <div className="analysis__perf-label">Losers</div>
                            {performance.losers.map((p) => (
                                <div key={p.ticker} className="analysis__perf-row">
                                    <span className="analysis__perf-ticker">{p.ticker}</span>
                                    {p.sector && (
                                        <span className="analysis__perf-sector">{p.sector}</span>
                                    )}
                                    <span className={`analysis__perf-pnl ${pnlClass(p.pnl_pct)}`}>
                                        {p.pnl_pct >= 0 ? '+' : ''}
                                        {fmt(p.pnl_pct)}%
                                    </span>
                                    {p.pnl_value !== undefined && (
                                        <span
                                            className={`analysis__perf-val ${pnlClass(p.pnl_value)}`}
                                        >
                                            {p.pnl_value >= 0 ? '+' : ''}
                                            {fmt(p.pnl_value)}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <section className="analysis__section">
                <h3 className="analysis__heading">Risk</h3>
                <div className="analysis__risk-row">
                    <div className="analysis__kv">
                        <span className="analysis__kv-label">Top concentration</span>
                        <span className="analysis__kv-value">{fmt(risk.concentration_pct)}%</span>
                    </div>
                </div>
                {risk.top_sectors.length > 0 && (
                    <div className="analysis__sectors">
                        {risk.top_sectors.map((s) => (
                            <div key={s.sector} className="analysis__sector-row">
                                <span className="analysis__sector-name">{s.sector}</span>
                                <div className="analysis__sector-bar-wrap">
                                    <div
                                        className="analysis__sector-bar"
                                        style={{ width: `${Math.min(s.weight_pct, 100)}%` }}
                                    />
                                </div>
                                <span className="analysis__sector-pct">{fmt(s.weight_pct)}%</span>
                            </div>
                        ))}
                    </div>
                )}
                <p className="analysis__summary">{risk.notes}</p>
            </section>

            <section className="analysis__section">
                <h3 className="analysis__heading">Recommendations</h3>
                <div className="analysis__recs">
                    {recommendations.map((rec) => (
                        <div key={rec.title} className="rec">
                            <div className="rec__top">
                                <span className={`rec__badge ${ACTION_CLASS[rec.action]}`}>
                                    {ACTION_LABELS[rec.action]}
                                </span>
                                {rec.ticker && <span className="rec__ticker">{rec.ticker}</span>}
                                <span className="rec__title">{rec.title}</span>
                            </div>
                            <p className="rec__rationale">{rec.rationale}</p>
                        </div>
                    ))}
                </div>
            </section>

            {watchlist.length > 0 && (
                <section className="analysis__section">
                    <h3 className="analysis__heading">Watchlist</h3>
                    <div className="analysis__watchlist">
                        {watchlist.map((item) => (
                            <div key={item.ticker} className="watch-item">
                                <div className="watch-item__top">
                                    <span className="watch-item__ticker">{item.ticker}</span>
                                    {item.sector && (
                                        <span className="watch-item__sector">{item.sector}</span>
                                    )}
                                </div>
                                <p className="watch-item__reason">{item.reason}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {result.positions_summary && result.positions_summary.length > 0 && (
                <section className="analysis__section">
                    <h3 className="analysis__heading">Positions</h3>
                    <PositionsTable rows={result.positions_summary} />
                </section>
            )}
        </div>
    );
}

export default function AiPanel() {
    const {
        isPanelOpen,
        closePanel,
        isAnalyzing,
        setAnalyzing,
        analysisResult,
        analysisError,
        setAnalysisResult,
        setAnalysisError,
        analysisMeta,
        setAnalysisMeta
    } = useAppStore();

    const esRef = useRef<EventSource | null>(null);

    useEffect(() => {
        if (!isPanelOpen) return;

        setAnalyzing(true);

        esRef.current = analyzeService.openStream(
            (result) => setAnalysisResult(result),
            (meta) => setAnalysisMeta(meta),
            (message) => setAnalysisError(message)
        );

        return () => {
            esRef.current?.close();
            esRef.current = null;
        };
    }, [isPanelOpen, setAnalyzing, setAnalysisResult, setAnalysisError, setAnalysisMeta]);

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
                    {isAnalyzing && !analysisResult && !analysisError && (
                        <p className="ai-panel__loading">Analyzing your portfolio…</p>
                    )}
                    {analysisError && (
                        <div className="ai-panel__error">Analysis failed: {analysisError}</div>
                    )}
                    {analysisResult && <AnalysisView result={analysisResult} />}
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
