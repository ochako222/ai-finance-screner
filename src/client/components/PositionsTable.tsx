import type { PositionSummary } from '../support/types';

function fmt(n: number, decimals = 2) {
    return n.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

function pnlClass(v: number) {
    return v >= 0 ? 'pos' : 'neg';
}

interface Props {
    rows: PositionSummary[];
}

export default function PositionsTable({ rows }: Props) {
    if (rows.length === 0) return null;
    const sorted = [...rows].sort((a, b) => b.weight_pct - a.weight_pct);

    return (
        <div className="positions-table">
            <table>
                <thead>
                    <tr>
                        <th>Ticker</th>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Sector</th>
                        <th>Industry</th>
                        <th className="positions-table__num">Weight %</th>
                        <th className="positions-table__num">P&amp;L %</th>
                    </tr>
                </thead>
                <tbody>
                    {sorted.map((r) => {
                        const unknown = r.asset_type === 'Unknown';
                        return (
                            <tr
                                key={r.ticker}
                                className={unknown ? 'positions-table__row--unknown' : undefined}
                            >
                                <td className="positions-table__ticker">{r.ticker}</td>
                                <td>{r.long_name ?? r.ticker}</td>
                                <td>{r.asset_type}</td>
                                <td>{r.sector ?? 'Unknown'}</td>
                                <td>{r.industry ?? 'Unknown'}</td>
                                <td className="positions-table__num">{fmt(r.weight_pct)}%</td>
                                <td className={`positions-table__num ${pnlClass(r.pnl_pct)}`}>
                                    {r.pnl_pct >= 0 ? '+' : ''}
                                    {fmt(r.pnl_pct)}%
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
