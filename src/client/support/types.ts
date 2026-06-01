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
    totalUsd: number;
    capturedAt: string;
}

export interface SyncResult {
    ok: boolean;
    positions: number;
    totalUsd: number;
    errors: { trading212: string | null; binance: string | null };
}

export interface AnalysisMeta {
    cost_usd: number;
    duration_ms: number;
}
