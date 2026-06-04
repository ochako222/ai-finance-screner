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

const ASSET_TYPE_COLORS: Record<string, string> = {
    Stock: '#89b4fa',
    ETF: '#94e2d5',
    Bond: '#f9e2af',
    Unknown: '#6c7086'
};

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
                            key={`${s.color}-${s.startAngle}`}
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

    const posSegs = buildSegments(
        positions.map((p) => p.value),
        POSITION_COLORS
    );

    const stockVal = positions
        .filter((p) => !p.type || p.type === 'Stock')
        .reduce((s, p) => s + p.value, 0);
    const etfVal = positions.filter((p) => p.type === 'ETF').reduce((s, p) => s + p.value, 0);
    const bondVal = positions.filter((p) => p.type === 'Bond').reduce((s, p) => s + p.value, 0);
    const total = stockVal + etfVal + bondVal;
    const stockPct = total > 0 ? Math.round((stockVal / total) * 100) : 100;

    const typeValues = [stockVal, etfVal, bondVal].filter((v) => v > 0);
    const typeColors = [
        ASSET_TYPE_COLORS.Stock,
        ASSET_TYPE_COLORS.ETF,
        ASSET_TYPE_COLORS.Bond
    ].filter((_, i) => [stockVal, etfVal, bondVal][i] > 0);
    let assetTypeSegs = buildSegments(typeValues, typeColors);
    if (assetTypeSegs.length === 0) {
        assetTypeSegs = [{ dashLen: CIRC, startAngle: 0, color: ASSET_TYPE_COLORS.Stock }];
    }
    const assetTypeCenterLabel = `${stockPct}%`;
    const assetTypeCenterSub = 'stocks';

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

                <div className="alloc__chart alloc__chart--div alloc__chart--asset-type">
                    <Donut
                        segments={assetTypeSegs}
                        centerLabel={assetTypeCenterLabel}
                        centerSub={assetTypeCenterSub}
                    />
                    <div className="alloc__cap">by instrument</div>
                </div>
            </div>
        </section>
    );
}
