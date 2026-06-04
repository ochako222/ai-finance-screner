import { fmtPln, formatSignedPln } from '../support/format';
import type { T212Position } from '../support/types';

interface Props {
    positions: T212Position[];
}

export default function StocksTable({ positions }: Props) {
    if (positions.length === 0) {
        return (
            <section className="tile span-3">
                <div className="tile__head">
                    <div className="tile__title">
                        <span className="glyph">▤</span> Trading 212
                    </div>
                </div>
                <p style={{ color: 'var(--overlay1)', fontSize: '12px', fontStyle: 'italic' }}>
                    No stock positions.
                </p>
            </section>
        );
    }

    return (
        <section className="tile span-3">
            <div className="tile__head">
                <div className="tile__title">
                    <span className="glyph">▤</span> Trading 212 — {positions.length} position
                    {positions.length !== 1 ? 's' : ''}
                </div>
            </div>
            <div className="stocks-table">
                <table>
                    <thead>
                        <tr>
                            <th className="th-left">Ticker</th>
                            <th className="th-left">Type</th>
                            <th className="th-left">Sector</th>
                            <th>Qty</th>
                            <th>Avg Price</th>
                            <th>Current</th>
                            <th>P&L</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {positions.map((pos, idx) => {
                            const ticker = pos.ticker.split('_')[0];
                            const sector = pos.sector && pos.sector !== '—' ? pos.sector : null;
                            const kind = pos.kind ?? 'Stock';

                            return (
                                <tr key={pos.ticker}>
                                    <td>
                                        <span className="ticker-cell">
                                            <span
                                                className={`ticker-cell__dot ticker-cell__dot--${idx % 8}`}
                                            />
                                            <span className="ticker-cell__name">{ticker}</span>
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'left' }}>
                                        <span className={`kindtag kindtag--${kind.toLowerCase()}`}>
                                            {kind.toUpperCase()}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'left' }}>
                                        {sector ? (
                                            <span className="sectag" data-sector={sector}>
                                                {sector}
                                            </span>
                                        ) : (
                                            <span style={{ color: 'var(--overlay0)' }}>—</span>
                                        )}
                                    </td>
                                    <td>{pos.quantity}</td>
                                    <td>{fmtPln(pos.averagePrice)}</td>
                                    <td>{fmtPln(pos.currentPrice)}</td>
                                    <td className={pos.ppl >= 0 ? 'pos' : 'neg'}>
                                        {formatSignedPln(pos.ppl)}
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{fmtPln(pos.value)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
