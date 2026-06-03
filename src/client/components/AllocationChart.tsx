import type { PortfolioSnapshot } from '../support/types';

// Donut geometry: r=70, circumference=2πr
const R = 70;
const CIRC = 2 * Math.PI * R; // ≈ 439.82

const POSITION_COLORS = [
    '#89b4fa', // blue
    '#a6e3a1', // green
    '#f9e2af', // yellow
    '#eba0ac', // maroon
    '#fab387', // peach
    '#74c7ec', // sapphire
    '#94e2d5', // teal
    '#cba6f7' // mauve
];

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
        const seg: Segment = {
            dashLen: pct * CIRC,
            startAngle: angle,
            color: colors[i % colors.length]
        };
        angle += pct * 360;
        return seg;
    });
}

interface DonutProps {
    segments: Segment[];
    centerLabel: string;
    centerSub: string;
    trackColor?: string;
}

function Donut({ segments, centerLabel, centerSub, trackColor = '#313244' }: DonutProps) {
    return (
        <div className="donut-wrap">
            <svg viewBox="0 0 180 180" width="180" height="180" aria-hidden="true">
                <g transform="rotate(-90 90 90)" fill="none" strokeWidth="26">
                    <circle cx="90" cy="90" r={R} stroke={trackColor} />
                    {segments.map((s) => (
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
                <b>{centerLabel}</b>
                <span>{centerSub}</span>
            </div>
        </div>
    );
}

interface Props {
    data: PortfolioSnapshot;
}

export default function AllocationChart({ data }: Props) {
    const positions = data.trading212.positions.filter((p) => p.value > 0);

    // By position donut
    const posSegs = buildSegments(
        positions.map((p) => p.value),
        POSITION_COLORS
    );

    // By instrument donut (Stock vs ETF)
    const stockVal = positions
        .filter((p) => !p.kind || p.kind === 'Stock')
        .reduce((s, p) => s + p.value, 0);
    const etfVal = positions.filter((p) => p.kind === 'ETF').reduce((s, p) => s + p.value, 0);
    const total = stockVal + etfVal;
    const stockPct = total > 0 ? Math.round((stockVal / total) * 100) : 100;
    const instrSegs = buildSegments(
        [stockVal, etfVal].filter((v) => v > 0),
        ['#89b4fa', '#94e2d5'] // blue for stock, teal for ETF
    );

    return (
        <section className="tile">
            <div className="tile__head">
                <div className="tile__title">
                    <span className="glyph">▤</span> Trading 212 · Allocation
                </div>
                <span className="label">by market value</span>
            </div>
            <div className="alloc">
                <div className="alloc__chart">
                    <Donut
                        segments={posSegs}
                        centerLabel={String(positions.length)}
                        centerSub="positions"
                    />
                    <div className="alloc__cap">by position</div>
                </div>

                <div className="alloc__chart alloc__chart--div">
                    <Donut
                        segments={
                            instrSegs.length > 0
                                ? instrSegs
                                : [{ dashLen: CIRC, startAngle: 0, color: '#89b4fa' }]
                        }
                        centerLabel={`${stockPct}%`}
                        centerSub="stocks"
                    />
                    <div className="alloc__cap">by instrument</div>
                </div>
            </div>
        </section>
    );
}
