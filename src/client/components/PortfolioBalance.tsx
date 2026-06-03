import type { PortfolioSnapshot } from '../support/types';

const R = 70;
const CIRC = 2 * Math.PI * R;

interface Segment {
    dashLen: number;
    startAngle: number;
    color: string;
}

function buildSegments(values: number[], colors: string[]): Segment[] {
    const total = values.reduce((s, v) => s + v, 0);
    if (total === 0) return [];
    let angle = 0;
    return values.map((v, i) => {
        const pct = v / total;
        const seg: Segment = { dashLen: pct * CIRC, startAngle: angle, color: colors[i] };
        angle += pct * 360;
        return seg;
    });
}

interface Props {
    data: PortfolioSnapshot;
}

export default function PortfolioBalance({ data }: Props) {
    const stocksVal = data.trading212.summary.total;
    const cryptoVal = data.binance.totalUsd; // USD — rough balance indicator
    const total = stocksVal + cryptoVal;
    const stocksPct = total > 0 ? Math.round((stocksVal / total) * 100) : 100;
    const cryptoPct = 100 - stocksPct;

    const segs = buildSegments(
        [stocksVal, cryptoVal].filter((v) => v > 0),
        ['#b4befe', '#fab387'] // lavender for stocks, peach for crypto
    );

    const displaySegs =
        segs.length > 0 ? segs : [{ dashLen: CIRC, startAngle: 0, color: '#b4befe' }];

    return (
        <section className="tile">
            <div className="tile__head">
                <div className="tile__title">
                    <span className="glyph">◷</span> Portfolio Balance
                </div>
                <span className="label">stocks vs crypto</span>
            </div>
            <div className="alloc">
                <div className="alloc__chart">
                    <div className="donut-wrap">
                        <svg viewBox="0 0 180 180" width="180" height="180" aria-hidden="true">
                            <g transform="rotate(-90 90 90)" fill="none" strokeWidth="26">
                                <circle cx="90" cy="90" r={R} stroke="#313244" />
                                {displaySegs.map((s) => (
                                    <circle
                                        key={s.color}
                                        cx="90"
                                        cy="90"
                                        r={R}
                                        stroke={s.color}
                                        strokeDasharray={`${s.dashLen} ${CIRC}`}
                                        transform={`rotate(${s.startAngle} 90 90)`}
                                    />
                                ))}
                            </g>
                        </svg>
                        <div className="donut-center">
                            <b>{stocksPct}%</b>
                            <span>stocks</span>
                        </div>
                    </div>
                    <div className="bal-legend">
                        <div className="bal-legend__row">
                            <span className="legend__sw" style={{ background: '#b4befe' }} />
                            Stocks
                            <b>{stocksPct}%</b>
                        </div>
                        {cryptoVal > 0 && (
                            <div className="bal-legend__row">
                                <span className="legend__sw" style={{ background: '#fab387' }} />
                                Crypto
                                <b style={{ color: '#fab387' }}>{cryptoPct}%</b>
                            </div>
                        )}
                        {cryptoVal === 0 && (
                            <div className="bal-legend__row" style={{ color: 'var(--overlay0)' }}>
                                <span
                                    className="legend__sw"
                                    style={{ background: '#fab387', opacity: 0.4 }}
                                />
                                Crypto
                                <b style={{ color: 'var(--overlay0)' }}>—</b>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
