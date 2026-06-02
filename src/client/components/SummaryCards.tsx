import type { PortfolioSnapshot } from '../support/types';

interface Props {
    data: PortfolioSnapshot;
}

function fmtPln(n: number) {
    return n.toLocaleString('pl-PL', {
        style: 'currency',
        currency: 'PLN',
        maximumFractionDigits: 2
    });
}

function fmtUsd(n: number) {
    return n.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    });
}

function isStale(capturedAt: string): boolean {
    return Date.now() - new Date(capturedAt).getTime() > 60 * 60 * 1000;
}

export default function SummaryCards({ data }: Props) {
    const { trading212: t212, totalPln, totalUsd, capturedAt, investedPln, pnlPln, pnlPct } = data;
    const stale = isStale(capturedAt);

    const cash = t212.summary.cash;
    const currentlyInvested = t212.summary.invested;
    const unrealizedPnl = t212.summary.result;
    const unrealizedPct = currentlyInvested > 0 ? (unrealizedPnl / currentlyInvested) * 100 : null;

    return (
        <div className={`summary-cards${stale ? ' summary-cards--stale' : ''}`}>
            {/* ── Row 1: bottom line ──────────────────────────── */}
            <div className="card card--primary">
                <div
                    className="card__label"
                    title="Net deposits − withdrawals on your trading account."
                >
                    Deposited
                </div>
                <div className="card__value">{fmtPln(investedPln)}</div>
                {stale && <div className="card__stale">stale</div>}
            </div>

            <div className="card card--primary">
                <div className="card__label">Portfolio Value</div>
                <div className="card__value">{fmtPln(totalPln)}</div>
                <div className="card__sub">
                    {totalUsd != null ? `≈ ${fmtUsd(totalUsd)}` : 'Rate unavailable'}
                </div>
            </div>

            <div className="card card--primary">
                <div className="card__label">Total P&amp;L</div>
                <div className={`card__value ${pnlPln >= 0 ? 'positive' : 'negative'}`}>
                    {pnlPln >= 0 ? '+' : ''}
                    {fmtPln(pnlPln)}
                </div>
                <div className={`card__sub ${pnlPln >= 0 ? 'positive' : 'negative'}`}>
                    {pnlPct !== null ? `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%` : '—'}
                </div>
            </div>

            {/* ── Row 2: composition ──────────────────────────── */}
            <div className="card card--sub">
                <div className="card__label">Cash</div>
                <div className="card__value card__value--sm">{fmtPln(cash)}</div>
                <div className="card__sub">free to trade</div>
            </div>

            <div className="card card--sub">
                <div className="card__label" title="Cost basis of your currently open positions.">
                    Currently Invested
                </div>
                <div className="card__value card__value--sm">{fmtPln(currentlyInvested)}</div>
                <div className="card__sub">{t212.positions.length} positions</div>
            </div>

            <div className="card card--sub">
                <div className="card__label">Unrealized P&amp;L</div>
                <div
                    className={`card__value card__value--sm ${
                        unrealizedPnl >= 0 ? 'positive' : 'negative'
                    }`}
                >
                    {unrealizedPnl >= 0 ? '+' : ''}
                    {fmtPln(unrealizedPnl)}
                </div>
                <div className={`card__sub ${unrealizedPnl >= 0 ? 'positive' : 'negative'}`}>
                    {unrealizedPct !== null
                        ? `${unrealizedPct >= 0 ? '+' : ''}${unrealizedPct.toFixed(2)}%`
                        : '—'}
                </div>
            </div>
        </div>
    );
}
