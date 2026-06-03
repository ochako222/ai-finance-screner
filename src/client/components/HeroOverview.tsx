import type { PortfolioSnapshot } from '../support/types';

interface Props {
    data: PortfolioSnapshot;
}

function fmtPln(n: number) {
    return n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtSigned(n: number) {
    const abs = Math.abs(n).toLocaleString('pl-PL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    return (n >= 0 ? '+' : '−') + abs;
}

export default function HeroOverview({ data }: Props) {
    const { trading212: t212, capturedAt } = data;
    const { summary } = t212;

    // deposited = cost basis + free cash = total account value at cost (no unrealised gains)
    const deposited = summary.total - summary.result;
    const flowPct = deposited > 0 ? (summary.total / deposited) * 100 : 100;
    const inMarket = summary.total - summary.cash;
    const pnlPct = deposited > 0 ? (summary.result / deposited) * 100 : 0;

    const isStale = Date.now() - new Date(capturedAt).getTime() > 24 * 60 * 60 * 1000;

    return (
        <section className="tile tile--focus span-3">
            <div className="tile__head">
                <div className="tile__title">
                    <span className="glyph">◆</span> Account Overview
                </div>
                {isStale && <span className="chip chip--stale">stale · 24h+</span>}
            </div>

            <div className="hero">
                {/* Column 1: Portfolio Value */}
                <div className="hero__col">
                    <div className="label">Portfolio Value</div>
                    <div className="hero__value">
                        {fmtPln(summary.total)}{' '}
                        <span style={{ fontSize: '20px', color: 'var(--overlay1)' }}>zł</span>
                    </div>
                </div>

                {/* Column 2: Deposited → Value flow */}
                <div className="hero__col">
                    <div className="label">Deposited → Value</div>
                    <div className="flowbar">
                        <div className="flowbar__track">
                            <div
                                className="flowbar__fill"
                                style={{ width: `${Math.min(flowPct, 100)}%` }}
                            />
                            <div
                                className="flowbar__cap"
                                style={{ left: `${Math.min(flowPct, 100)}%` }}
                            />
                        </div>
                        <div className="flowbar__legend">
                            <span>value {flowPct.toFixed(1)}% of deposited</span>
                            <span>deposited {fmtPln(deposited)} zł</span>
                        </div>
                    </div>
                    <div className="hero__sub-row">
                        <div className="hero__sub-item">
                            <div className="label">Deposited</div>
                            <div className="hero__sub-value">{fmtPln(deposited)} zł</div>
                        </div>
                        <div className="hero__sub-item">
                            <div className="label">In Market</div>
                            <div className="hero__sub-value">{fmtPln(inMarket)} zł</div>
                        </div>
                        <div className="hero__sub-item">
                            <div className="label">Cash Idle</div>
                            <div className="hero__sub-value" style={{ color: 'var(--subtext0)' }}>
                                {fmtPln(summary.cash)} zł
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 3: Total P&L */}
                <div className="hero__col">
                    <div className="label">Total P&amp;L</div>
                    <div className={`hero__big ${summary.result >= 0 ? 'pos' : 'neg'}`}>
                        {fmtSigned(summary.result)} zł
                    </div>
                    <div className="hero__sub-label">unrealised</div>
                    <div className={`chip ${summary.result >= 0 ? 'chip--pos' : 'chip--neg'}`}>
                        <span>{summary.result >= 0 ? '▲' : '▼'}</span> {fmtSigned(pnlPct)} %
                    </div>
                </div>
            </div>
        </section>
    );
}
