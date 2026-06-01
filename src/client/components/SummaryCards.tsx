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

export default function SummaryCards({ data }: Props) {
    const { trading212: t212, binance, totalPln, totalUsd } = data;
    const pnl = t212.summary.result;
    const pnlPct =
        t212.summary.invested > 0 ? ((pnl / t212.summary.invested) * 100).toFixed(2) : '0.00';

    return (
        <div className="summary-cards">
            <div className="card">
                <div className="card__label">Total Portfolio</div>
                <div className="card__value">{fmtPln(totalPln)}</div>
                <div className="card__sub">
                    {totalUsd != null ? `≈ ${fmtUsd(totalUsd)}` : 'Rate unavailable'}
                </div>
            </div>
            <div className="card">
                <div className="card__label">Total P&amp;L</div>
                <div className={`card__value ${pnl >= 0 ? 'positive' : 'negative'}`}>
                    {pnl >= 0 ? '+' : ''}
                    {fmtPln(pnl)}
                </div>
                <div className="card__sub">{pnlPct}%</div>
            </div>
            <div className="card">
                <div className="card__label">Stocks (T212)</div>
                <div className="card__value">{fmtPln(t212.summary.total)}</div>
                <div className="card__sub">{t212.positions.length} positions</div>
            </div>
            <div className="card">
                <div className="card__label">Crypto (Binance)</div>
                <div className="card__value">{fmtUsd(binance.totalUsd)}</div>
                <div className="card__sub">{binance.assets.length} assets</div>
            </div>
        </div>
    );
}
