import type { T212Position } from '../connectors/trading212.js';
import type { StockMetadataRow } from '../database.js';

export interface EnrichedPosition {
    ticker: string;
    long_name: string | null;
    quantity: number;
    average_price: number;
    current_price: number;
    value: number;
    ppl: number;
    pnl_pct: number;
    sector: string | null;
    industry: string | null;
    asset_type: 'ETF' | 'Stock' | 'Unknown';
}

export function mergePositionsWithMetadata(
    positions: T212Position[],
    byTicker: Map<string, StockMetadataRow>
): EnrichedPosition[] {
    return positions.map((p) => {
        const meta = byTicker.get(p.ticker);
        const denom = p.averagePrice * p.quantity;
        const pnlPct = denom === 0 ? 0 : (p.ppl / denom) * 100;
        return {
            ticker: p.ticker,
            long_name: meta?.long_name ?? null,
            quantity: p.quantity,
            average_price: p.averagePrice,
            current_price: p.currentPrice,
            value: p.value,
            ppl: p.ppl,
            pnl_pct: pnlPct,
            sector: meta?.sector ?? null,
            industry: meta?.industry ?? null,
            asset_type: meta?.asset_type ?? 'Unknown'
        };
    });
}
