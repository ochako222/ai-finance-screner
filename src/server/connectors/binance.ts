export interface BinanceData {
    assets: { symbol: string; qty: number; valueUsd: number }[];
    totalUsd: number;
    note?: string;
}

export async function fetchBinance(): Promise<BinanceData> {
    return { assets: [], totalUsd: 0, note: 'Binance connector not implemented yet.' };
}
