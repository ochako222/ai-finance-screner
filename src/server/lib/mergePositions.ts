import type { T212Position } from '../connectors/trading212.js';
import { type KnownInstrument, t212ToBase } from '../database.js';

export interface EnrichedPosition extends T212Position {
    baseTicker: string;
    name: string | null;
    type: 'ETF' | 'Stock' | 'Bond' | 'Unknown';
    market: string | null;
    sector: string | null;
    industry: string | null;
    indexTracked: string | null;
    pnl_pct: number;
}

export function mergePositionsWithMetadata(
    positions: T212Position[],
    byBase: Map<string, KnownInstrument>
): EnrichedPosition[] {
    return positions.map((p) => {
        const base = t212ToBase(p.ticker);
        const meta = byBase.get(base);
        const denom = p.averagePrice * p.quantity;
        const pnl_pct = denom === 0 ? 0 : (p.ppl / denom) * 100;
        return {
            ...p,
            baseTicker: base,
            name: meta?.name ?? null,
            type: meta?.type ?? 'Unknown',
            market: meta?.market ?? null,
            sector: meta?.sector ?? null,
            industry: meta?.industry ?? null,
            indexTracked: meta?.indexTracked ?? null,
            pnl_pct
        };
    });
}
