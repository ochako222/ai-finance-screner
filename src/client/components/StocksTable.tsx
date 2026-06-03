import { useState } from 'react';
import type { T212Position } from '../support/types';

interface Props {
    positions: T212Position[];
}

type SortKey = 'ticker' | 'kind' | 'sector' | 'qty' | 'avg' | 'cur' | 'ppl' | 'val';
type SortDir = 1 | -1;

const SECTOR_COLORS: Record<string, string> = {
    'Communication Services': 'var(--sapphire)',
    'Consumer Cyclical': 'var(--peach)',
    Healthcare: 'var(--teal)',
    Technology: 'var(--blue)',
    Industrials: 'var(--yellow)',
    Financials: 'var(--lavender)',
    Energy: 'var(--maroon)',
    Materials: 'var(--green)',
    'Real Estate': 'var(--rosewater)',
    Utilities: 'var(--sky)'
};

const POSITION_COLORS = [
    '#89b4fa',
    '#a6e3a1',
    '#f9e2af',
    '#eba0ac',
    '#fab387',
    '#74c7ec',
    '#94e2d5',
    '#cba6f7'
];

function fmtPln(n: number) {
    return `${n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;
}

function fmtSigned(n: number) {
    const abs = Math.abs(n).toLocaleString('pl-PL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    return `${n >= 0 ? '+' : '−'}${abs} zł`;
}

export default function StocksTable({ positions }: Props) {
    const [sortKey, setSortKey] = useState<SortKey>('val');
    const [sortDir, setSortDir] = useState<SortDir>(-1);

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

    // Sort
    const sorted = [...positions].sort((a, b) => {
        let av: string | number;
        let bv: string | number;
        switch (sortKey) {
            case 'ticker':
                av = a.ticker;
                bv = b.ticker;
                break;
            case 'kind':
                av = a.kind ?? 'Stock';
                bv = b.kind ?? 'Stock';
                break;
            case 'sector':
                av = a.sector ?? '';
                bv = b.sector ?? '';
                break;
            case 'qty':
                av = a.quantity;
                bv = b.quantity;
                break;
            case 'avg':
                av = a.averagePrice;
                bv = b.averagePrice;
                break;
            case 'cur':
                av = a.currentPrice;
                bv = b.currentPrice;
                break;
            case 'ppl':
                av = a.ppl;
                bv = b.ppl;
                break;
            default:
                av = a.value;
                bv = b.value;
        }
        if (typeof av === 'string') return sortDir * av.localeCompare(bv as string);
        return sortDir * ((av as number) - (bv as number));
    });

    function handleSort(key: SortKey, isStr: boolean) {
        if (key === sortKey) {
            setSortDir((d) => (d === 1 ? -1 : 1));
        } else {
            setSortKey(key);
            setSortDir(isStr ? 1 : -1);
        }
    }

    function Th({
        label,
        colKey,
        isStr = false,
        left = false
    }: {
        label: string;
        colKey: SortKey;
        isStr?: boolean;
        left?: boolean;
    }) {
        const active = sortKey === colKey;
        return (
            <th
                className={left ? 'th-left' : undefined}
                data-active={active ? 'true' : 'false'}
                onClick={() => handleSort(colKey, isStr)}
            >
                {label}
                <span className="arr">{active ? (sortDir < 0 ? '▼' : '▲') : ''}</span>
            </th>
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
                            <Th label="Ticker" colKey="ticker" isStr left />
                            <Th label="Type" colKey="kind" isStr left />
                            <Th label="Sector" colKey="sector" isStr left />
                            <Th label="Qty" colKey="qty" />
                            <Th label="Avg Price" colKey="avg" />
                            <Th label="Current" colKey="cur" />
                            <Th label="P&L" colKey="ppl" />
                            <Th label="Value" colKey="val" />
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((pos, idx) => {
                            const ticker = pos.ticker.split('_')[0];
                            const dot = POSITION_COLORS[idx % POSITION_COLORS.length];
                            const sector = pos.sector && pos.sector !== '—' ? pos.sector : null;
                            const sectorColor = sector
                                ? (SECTOR_COLORS[sector] ?? 'var(--overlay0)')
                                : null;
                            const kind = pos.kind ?? 'Stock';
                            const kindColor = kind === 'ETF' ? 'var(--teal)' : 'var(--lavender)';
                            const kindBorder =
                                kind === 'ETF'
                                    ? 'color-mix(in oklab, var(--teal) 40%, transparent)'
                                    : 'color-mix(in oklab, var(--lavender) 40%, transparent)';

                            return (
                                <tr key={pos.ticker}>
                                    <td>
                                        <span className="ticker-cell">
                                            <span
                                                className="ticker-cell__dot"
                                                style={{ background: dot }}
                                            />
                                            <span className="ticker-cell__name">{ticker}</span>
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'left' }}>
                                        <span
                                            className="kindtag"
                                            style={{ color: kindColor, borderColor: kindBorder }}
                                        >
                                            {kind.toUpperCase()}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'left' }}>
                                        {sector ? (
                                            <span
                                                className="sectag"
                                                style={{
                                                    color: sectorColor ?? 'var(--overlay0)',
                                                    background: `color-mix(in oklab, ${sectorColor ?? 'var(--overlay0)'} 14%, transparent)`
                                                }}
                                            >
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
                                        {fmtSigned(pos.ppl)}
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
