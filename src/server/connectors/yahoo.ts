import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

function t212ToYahoo(ticker: string): string {
    const parts = ticker.split('_');
    const base = parts[0].replace(/[a-z]+$/, '');

    const suffix = parts.slice(1).join('_');
    if (suffix.startsWith('DE')) return `${base}.DE`;
    if (suffix.startsWith('GB') || suffix.startsWith('UK')) return `${base}.L`;
    if (suffix.startsWith('FR')) return `${base}.PA`;
    if (suffix.startsWith('NL')) return `${base}.AS`;
    if (suffix.startsWith('IT')) return `${base}.MI`;
    if (suffix.startsWith('ES')) return `${base}.MC`;

    return base;
}

export interface InstrumentInfo {
    sector: string | null;
    kind: 'Stock' | 'ETF';
}

export async function fetchInstrumentInfo(
    tickers: string[]
): Promise<Record<string, InstrumentInfo>> {
    const CONCURRENCY = 5;
    const result: Record<string, InstrumentInfo> = {};

    for (let i = 0; i < tickers.length; i += CONCURRENCY) {
        const batch = tickers.slice(i, i + CONCURRENCY);
        const settled = await Promise.allSettled(
            batch.map(async (ticker) => {
                const symbol = t212ToYahoo(ticker);
                let summary: Awaited<ReturnType<typeof yf.quoteSummary>>;
                try {
                    summary = await yf.quoteSummary(symbol, { modules: ['assetProfile', 'quoteType'] });
                } catch {
                    if (symbol.includes('.')) {
                        throw new Error(`Yahoo lookup failed for ${symbol}`);
                    }
                    // Bare ticker: try common EU/UK exchange suffixes before giving up
                    let resolved = false;
                    for (const suffix of ['.L', '.DE', '.AS', '.PA']) {
                        try {
                            summary = await yf.quoteSummary(`${symbol}${suffix}`, { modules: ['assetProfile', 'quoteType'] });
                            resolved = true;
                            break;
                        } catch {
                            // try next suffix
                        }
                    }
                    if (!resolved) throw new Error(`Yahoo lookup failed for ${symbol}`);
                }
                const sector = (summary.assetProfile as any)?.sector as string | undefined;
                const quoteType = (summary.quoteType as any)?.quoteType as string | undefined;
                const kind: 'Stock' | 'ETF' = quoteType === 'ETF' ? 'ETF' : 'Stock';
                return { ticker, sector: sector ?? null, kind };
            })
        );

        for (const res of settled) {
            if (res.status === 'fulfilled') {
                result[res.value.ticker] = { sector: res.value.sector, kind: res.value.kind };
            }
        }
    }

    return result;
}
