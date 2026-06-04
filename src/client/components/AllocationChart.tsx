import type { AllocationBucket, AnalysisResult, PortfolioSnapshot } from '../support/types';

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
    Unknown: '#6c7086'
};

const SECTOR_COLORS = [
    '#89b4fa',
    '#a6e3a1',
    '#f9e2af',
    '#eba0ac',
    '#fab387',
    '#74c7ec',
    '#94e2d5',
    '#cba6f7'
];

const SECTOR_TOP_N = 6;

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

function bucketsToSegments(
    buckets: AllocationBucket[],
    colorFor: (b: AllocationBucket, i: number) => string
): Segment[] {
    const total = buckets.reduce((s, b) => s + b.weight_pct, 0);
    if (total === 0) return [];
    let angle = 0;
    return buckets.map((b, i) => {
        const pct = b.weight_pct / total;
        const seg: Segment = {
            dashLen: pct * CIRC,
            startAngle: angle,
            color: colorFor(b, i)
        };
        angle += pct * 360;
        return seg;
    });
}

function collapseSectors(buckets: AllocationBucket[]): AllocationBucket[] {
    if (buckets.length <= SECTOR_TOP_N) return buckets;
    const sorted = [...buckets].sort((a, b) => b.weight_pct - a.weight_pct);
    const head = sorted.slice(0, SECTOR_TOP_N);
    const tail = sorted.slice(SECTOR_TOP_N);
    const other = tail.reduce((s, b) => s + b.weight_pct, 0);
    return other > 0 ? [...head, { label: 'Other', weight_pct: other }] : head;
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
    analysis?: AnalysisResult | null;
}

export default function AllocationChart({ data, analysis }: Props) {
    const positions = data.trading212.positions.filter((p) => p.value > 0);

    const posSegs = buildSegments(
        positions.map((p) => p.value),
        POSITION_COLORS
    );

    let assetTypeSegs: Segment[];
    let assetTypeCenterLabel: string;
    let assetTypeCenterSub: string;

    if (analysis?.allocation?.by_asset_type?.length) {
        assetTypeSegs = bucketsToSegments(
            analysis.allocation.by_asset_type,
            (b) => ASSET_TYPE_COLORS[b.label] ?? '#6c7086'
        );
        const stockBucket = analysis.allocation.by_asset_type.find((b) => b.label === 'Stock');
        const stockPct = stockBucket ? Math.round(stockBucket.weight_pct) : 0;
        assetTypeCenterLabel = `${stockPct}%`;
        assetTypeCenterSub = 'stocks';
    } else {
        const stockVal = positions
            .filter((p) => !p.kind || p.kind === 'Stock')
            .reduce((s, p) => s + p.value, 0);
        const etfVal = positions.filter((p) => p.kind === 'ETF').reduce((s, p) => s + p.value, 0);
        const total = stockVal + etfVal;
        const stockPct = total > 0 ? Math.round((stockVal / total) * 100) : 100;
        assetTypeSegs = buildSegments(
            [stockVal, etfVal].filter((v) => v > 0),
            [ASSET_TYPE_COLORS.Stock, ASSET_TYPE_COLORS.ETF]
        );
        if (assetTypeSegs.length === 0) {
            assetTypeSegs = [{ dashLen: CIRC, startAngle: 0, color: ASSET_TYPE_COLORS.Stock }];
        }
        assetTypeCenterLabel = `${stockPct}%`;
        assetTypeCenterSub = 'stocks';
    }

    const sectorBuckets = analysis?.allocation?.by_sector
        ? collapseSectors(analysis.allocation.by_sector)
        : [];
    const sectorSegs = bucketsToSegments(
        sectorBuckets,
        (_, i) => SECTOR_COLORS[i % SECTOR_COLORS.length]
    );
    const sectorCenterLabel = sectorBuckets.length > 0 ? String(sectorBuckets.length) : '—';

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

                {sectorBuckets.length > 0 && (
                    <div className="alloc__chart alloc__chart--div alloc__chart--sector">
                        <Donut
                            segments={sectorSegs}
                            centerLabel={sectorCenterLabel}
                            centerSub="sectors"
                        />
                        <div className="alloc__cap">by sector</div>
                    </div>
                )}
            </div>
        </section>
    );
}
