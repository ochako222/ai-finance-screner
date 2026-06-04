export const ANALYSIS_SCHEMA = {
    type: 'object',
    required: [
        'overview',
        'performance',
        'risk',
        'recommendations',
        'watchlist',
        'positions_summary',
        'allocation'
    ],
    properties: {
        overview: {
            type: 'object',
            required: ['total_value', 'stocks_value', 'crypto_value', 'currency', 'summary'],
            properties: {
                total_value: { type: 'number' },
                stocks_value: { type: 'number' },
                crypto_value: { type: 'number' },
                currency: { type: 'string' },
                summary: { type: 'string' }
            }
        },
        performance: {
            type: 'object',
            required: ['top', 'losers'],
            properties: {
                top: { type: 'array', items: { $ref: '#/$defs/PositionPerf' } },
                losers: { type: 'array', items: { $ref: '#/$defs/PositionPerf' } }
            }
        },
        risk: {
            type: 'object',
            required: ['concentration_pct', 'top_sectors', 'notes'],
            properties: {
                concentration_pct: { type: 'number' },
                top_sectors: {
                    type: 'array',
                    items: {
                        type: 'object',
                        required: ['sector', 'weight_pct'],
                        properties: {
                            sector: { type: 'string' },
                            weight_pct: { type: 'number' }
                        }
                    }
                },
                notes: { type: 'string' }
            }
        },
        recommendations: {
            type: 'array',
            minItems: 3,
            maxItems: 3,
            items: {
                type: 'object',
                required: ['title', 'rationale', 'action'],
                properties: {
                    title: { type: 'string' },
                    rationale: { type: 'string' },
                    action: {
                        type: 'string',
                        enum: ['buy', 'sell', 'hold', 'rebalance', 'watch']
                    },
                    ticker: { type: 'string' }
                }
            }
        },
        watchlist: {
            type: 'array',
            items: {
                type: 'object',
                required: ['ticker', 'reason'],
                properties: {
                    ticker: { type: 'string' },
                    sector: { type: 'string' },
                    reason: { type: 'string' }
                }
            }
        },
        positions_summary: {
            type: 'array',
            items: {
                type: 'object',
                required: ['ticker', 'asset_type', 'weight_pct', 'pnl_pct'],
                properties: {
                    ticker: { type: 'string' },
                    long_name: { type: ['string', 'null'] },
                    asset_type: { type: 'string', enum: ['ETF', 'Stock', 'Unknown'] },
                    sector: { type: ['string', 'null'] },
                    industry: { type: ['string', 'null'] },
                    weight_pct: { type: 'number' },
                    pnl_pct: { type: 'number' }
                }
            }
        },
        allocation: {
            type: 'object',
            required: ['by_asset_type', 'by_sector', 'by_industry'],
            properties: {
                by_asset_type: { type: 'array', items: { $ref: '#/$defs/AllocationBucket' } },
                by_sector: { type: 'array', items: { $ref: '#/$defs/AllocationBucket' } },
                by_industry: { type: 'array', items: { $ref: '#/$defs/AllocationBucket' } }
            }
        }
    },
    $defs: {
        PositionPerf: {
            type: 'object',
            required: ['ticker', 'pnl_pct', 'asset_type'],
            properties: {
                ticker: { type: 'string' },
                sector: { type: ['string', 'null'] },
                industry: { type: ['string', 'null'] },
                asset_type: { type: 'string', enum: ['ETF', 'Stock', 'Unknown'] },
                pnl_pct: { type: 'number' },
                pnl_value: { type: 'number' }
            }
        },
        AllocationBucket: {
            type: 'object',
            required: ['label', 'weight_pct'],
            properties: {
                label: { type: 'string' },
                weight_pct: { type: 'number' }
            }
        }
    }
} as const;

export interface AnalyzePayload {
    captured_at: string;
    currency: 'PLN';
    account_summary: {
        total: number;
        cash: number;
        invested: number;
        result: number;
    };
    invested_pln: number;
    pnl_pln: number;
    pnl_pct: number | null;
    positions: Array<{
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
    }>;
}

export const PROMPTS = {
    advise: (): string =>
        `You are a personal finance advisor analyzing a real portfolio.

Use the trading212 MCP tools to fetch live data:
1. Call get_account_summary to get total value, cash, invested amount and currency.
2. Call get_positions to get all current positions with quantities, prices, and P&L.
3. For each position, call get_instruments with the ticker to enrich with sector and asset type (Stock vs ETF). Batch or parallelize where possible.

Then return a structured analysis covering:

**Overview**: total portfolio value breakdown (stocks vs crypto), overall performance summary.

**Performance**: top 3 performers and up to 3 significant losers, with actual P&L % and value figures.

**Risk**: biggest concentration risk (% of portfolio in top position), sector breakdown by weight, any diversification concerns.

**Recommendations**: exactly 3 specific, actionable suggestions grounded in the live data. Each must reference actual tickers or figures.

**Watchlist**: positions to monitor closely, with sector and reason.

Be concise and data-driven. Use actual numbers from the API. Do not add generic disclaimers.`.trim(),

    analyzeWithData: (payload: AnalyzePayload): string =>
        `You are a personal finance advisor analyzing a real portfolio.

Do not make any API calls. Analyze only the data provided below.

Return a structured analysis matching the provided JSON schema. Cover:

**Overview**: total portfolio value, stocks vs crypto split (crypto is 0 unless present), currency (PLN), concise narrative summary.

**Performance**: top 3 winners and up to 3 losers from the positions list. Each entry MUST include ticker, asset_type, sector, industry, pnl_pct, and pnl_value.

**Risk**: concentration_pct (weight of the single largest position), top_sectors (array of { sector, weight_pct }), short notes on diversification.

**Recommendations**: exactly 3 actionable suggestions. action ∈ {buy, sell, hold, rebalance, watch}.

**Watchlist**: tickers worth monitoring with sector and reason.

**positions_summary**: one entry per held position with { ticker, long_name, asset_type, sector, industry, weight_pct, pnl_pct }. weight_pct is value / account_summary.total * 100.

**allocation**: { by_asset_type, by_sector, by_industry }. Each is an array of { label, weight_pct }. For by_asset_type, label is one of "ETF", "Stock", "Unknown". For by_sector / by_industry, group missing values under label "Unknown". All weight_pct values 0-100 (not 0-1) and each array sums to ~100.

PLN is the primary currency. Be concise and data-driven. Do not add generic disclaimers.

\`\`\`json
${JSON.stringify(payload, null, 2)}
\`\`\``.trim()
} as const;
