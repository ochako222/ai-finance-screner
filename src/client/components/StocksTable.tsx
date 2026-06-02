import type { T212Position } from '../support/types';

interface Props {
    positions: T212Position[];
}

function fmtPln(n: number) {
    return n.toLocaleString('pl-PL', {
        style: 'currency',
        currency: 'PLN',
        maximumFractionDigits: 2
    });
}

export default function StocksTable({ positions }: Props) {
    if (positions.length === 0) {
        return (
            <div className="panel">
                <h3 className="section-title">Stocks</h3>
                <p className="stub-notice">No stock positions.</p>
            </div>
        );
    }

    const sorted = [...positions].sort((a, b) => b.value - a.value);

    return (
        <div className="panel">
            <h3 className="section-title">Stocks — {positions.length} positions</h3>
            <table>
                <thead>
                    <tr>
                        <th>Ticker</th>
                        <th>Sector</th>
                        <th>Qty</th>
                        <th>Avg Price</th>
                        <th>Current</th>
                        <th>P&amp;L</th>
                        <th>Value</th>
                    </tr>
                </thead>
                <tbody>
                    {sorted.map((pos) => (
                        <tr key={pos.ticker}>
                            <td style={{ fontWeight: 500 }}>{pos.ticker.split('_')[0]}</td>
                            <td className="sector-cell">{pos.sector ?? '—'}</td>
                            <td>{pos.quantity}</td>
                            <td>{fmtPln(pos.averagePrice)}</td>
                            <td>{fmtPln(pos.currentPrice)}</td>
                            <td className={pos.ppl >= 0 ? 'positive' : 'negative'}>
                                {pos.ppl >= 0 ? '+' : ''}
                                {fmtPln(pos.ppl)}
                            </td>
                            <td>{fmtPln(pos.value)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
