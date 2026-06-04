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
                            <th className="th-left">Name</th>
                            <th className="th-left">Type</th>
                            <th className="th-left">Market</th>
                            <th className="th-left">Industry</th>
                            <th className="th-left">Index</th>
                            <th>Qty</th>
                            <th>Avg Price</th>
                            <th>Current</th>
                            <th>P&L</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {positions.map((pos, idx) => {
                            const ticker = pos.ticker.split('_')[0].replace(/[a-z]+$/, '');
                            const type = pos.type ?? 'Unknown';

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
                                        {pos.name ? (
                                            <span className="pos-name">{pos.name}</span>
                                        ) : (
                                            <span style={{ color: 'var(--overlay0)' }}>—</span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'left' }}>
                                        <span className={`kindtag kindtag--${type.toLowerCase()}`}>
                                            {type.toUpperCase()}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'left' }}>
                                        {pos.market ?? (
                                            <span style={{ color: 'var(--overlay0)' }}>—</span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'left' }}>
                                        {pos.industry ?? (
                                            <span style={{ color: 'var(--overlay0)' }}>—</span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'left' }}>
                                        {pos.indexTracked ? (
                                            <span title={pos.indexTracked} className="index-cell">
                                                {pos.indexTracked}
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
