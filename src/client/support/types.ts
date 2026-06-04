export interface T212Summary {
    cash: number;
    invested: number;
    total: number;
    result: number;
    currency: string;
}

export interface T212Position {
    ticker: string;
    quantity: number;
    averagePrice: number;
    currentPrice: number;
    ppl: number;
    value: number;
    sector?: string | null;
    kind?: 'Stock' | 'ETF';
}

export interface BinanceAsset {
    symbol: string;
    qty: number;
    valueUsd: number;
}

export interface BinanceData {
    assets: BinanceAsset[];
    totalUsd: number;
    note?: string;
}

export interface Trading212Data {
    summary: T212Summary;
    positions: T212Position[];
}

export interface PortfolioSnapshot {
    trading212: Trading212Data;
    binance: BinanceData;
    totalPln: number;
    totalUsd: number | null;
    exchangeRate: number | null;
    capturedAt: string;
    investedPln: number;
    pnlPln: number;
    pnlPct: number | null;
}

export interface SyncResult {
    ok: boolean;
    positions: number;
    totalPln: number;
    totalUsd: number | null;
    exchangeRate: number | null;
    errors: { trading212: string | null; binance: string | null; exchangeRate: string | null };
}

export interface PortfolioHistoryPoint {
    capturedAt: string;
    totalPln: number;
    totalUsd: number | null;
    exchangeRate: number | null;
}

export interface AnalysisMeta {
    cost_usd: number;
    duration_ms: number;
}

export type AssetType = 'ETF' | 'Stock' | 'Unknown';

export interface PositionPerf {
    ticker: string;
    sector?: string | null;
    industry?: string | null;
    asset_type?: AssetType;
    pnl_pct: number;
    pnl_value?: number;
}

export interface SectorWeight {
    sector: string;
    weight_pct: number;
}

export interface PositionSummary {
    ticker: string;
    long_name?: string | null;
    asset_type: AssetType;
    sector: string | null;
    industry: string | null;
    weight_pct: number;
    pnl_pct: number;
}

export interface AllocationBucket {
    label: string;
    weight_pct: number;
}

export interface AnalysisAllocation {
    by_asset_type: AllocationBucket[];
    by_sector: AllocationBucket[];
    by_industry: AllocationBucket[];
}

export interface Recommendation {
    title: string;
    rationale: string;
    action: 'buy' | 'sell' | 'hold' | 'rebalance' | 'watch';
    ticker?: string;
}

export interface WatchlistItem {
    ticker: string;
    sector?: string;
    reason: string;
}

export interface AnalysisResult {
    overview: {
        total_value: number;
        stocks_value: number;
        crypto_value: number;
        currency: string;
        summary: string;
    };
    performance: {
        top: PositionPerf[];
        losers: PositionPerf[];
    };
    risk: {
        concentration_pct: number;
        top_sectors: SectorWeight[];
        notes: string;
    };
    recommendations: Recommendation[];
    watchlist: WatchlistItem[];
    positions_summary: PositionSummary[];
    allocation: AnalysisAllocation;
}
