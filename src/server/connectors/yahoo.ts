import yahooFinance from 'yahoo-finance2';
import type { StockMetadata } from '../database.js';

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 300;

const COUNTRY_TO_YAHOO: Record<string, string> = {
    US: '',
    DE: '.DE',
    GY: '.DE',
    GB: '.L',
    UK: '.L',
    LN: '.L',
    FR: '.PA',
    PA: '.PA',
    NL: '.AS',
    IT: '.MI',
    ES: '.MC'
};

export function t212ToYahoo(t212Ticker: string): string {
    const parts = t212Ticker.split('_');
    const base = parts[0];
    const country = parts[1];
    const suffix = country !== undefined ? (COUNTRY_TO_YAHOO[country] ?? '') : '';
    return base + suffix;
}

export function quoteTypeToAssetType(qt: string | null | undefined): 'ETF' | 'Stock' | 'Unknown' {
    if (qt === 'ETF') return 'ETF';
    if (qt === 'EQUITY') return 'Stock';
    return 'Unknown';
}

function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

interface YahooClient {
    quoteSummary(
        symbol: string,
        opts: { modules: ('assetProfile' | 'price')[] }
    ): Promise<{
        assetProfile?: { sector?: string | null; industry?: string | null } | null;
        price?: {
            quoteType?: string | null;
            longName?: string | null;
            shortName?: string | null;
        } | null;
    }>;
}

async function fetchOne(
    yf: YahooClient,
    t212Ticker: string,
    now: string
): Promise<StockMetadata | null> {
    const yahooSymbol = t212ToYahoo(t212Ticker);
    try {
        const res = await yf.quoteSummary(yahooSymbol, {
            modules: ['assetProfile', 'price']
        });
        const sector = res.assetProfile?.sector ?? null;
        const industry = res.assetProfile?.industry ?? null;
        const assetType = quoteTypeToAssetType(res.price?.quoteType);
        const longName = res.price?.longName ?? res.price?.shortName ?? null;
        return {
            ticker: t212Ticker,
            sector,
            industry,
            assetType,
            longName,
            fetchedAt: now
        };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[yahoo] ${t212Ticker} (${yahooSymbol}): ${msg}`);
        return null;
    }
}

export async function fetchStockMetadata(tickers: string[]): Promise<StockMetadata[]> {
    if (tickers.length === 0) return [];
    const yf = yahooFinance as unknown as YahooClient;
    const now = new Date().toISOString();
    const out: StockMetadata[] = [];

    for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
        const batch = tickers.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(batch.map((t) => fetchOne(yf, t, now)));
        for (const r of results) {
            if (r.status === 'fulfilled' && r.value !== null) out.push(r.value);
        }
        if (i + BATCH_SIZE < tickers.length) await sleep(BATCH_DELAY_MS);
    }
    return out;
}
