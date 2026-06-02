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

export async function fetchSectors(tickers: string[]): Promise<Record<string, string>> {
    const CONCURRENCY = 5;
    const result: Record<string, string> = {};

    for (let i = 0; i < tickers.length; i += CONCURRENCY) {
        const batch = tickers.slice(i, i + CONCURRENCY);
        const settled = await Promise.allSettled(
            batch.map(async (ticker) => {
                const symbol = t212ToYahoo(ticker);
                const summary = await yf.quoteSummary(symbol, { modules: ['assetProfile'] });
                const sector = (summary.assetProfile as any)?.sector as string | undefined;
                return { ticker, sector: sector ?? null };
            })
        );

        for (const res of settled) {
            if (res.status === 'fulfilled' && res.value.sector) {
                result[res.value.ticker] = res.value.sector;
            }
        }
    }

    return result;
}
