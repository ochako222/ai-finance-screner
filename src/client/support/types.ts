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
