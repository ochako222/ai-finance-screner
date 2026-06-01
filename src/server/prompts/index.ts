export interface PortfolioContext {
    trading212: {
        summary: {
            cash: number;
            invested: number;
            total: number;
            result: number;
            currency: string;
        };
        positions: {
            ticker: string;
            quantity: number;
            averagePrice: number;
            currentPrice: number;
            ppl: number;
            value: number;
        }[];
    };
    binance: {
        assets: { symbol: string; qty: number; valueUsd: number }[];
        totalUsd: number;
        note?: string;
    };
    totalUsd: number;
    capturedAt: string;
}

export const PROMPTS = {
    advise: (ctx: PortfolioContext): string =>
        `You are a personal finance advisor. Analyze the portfolio snapshot below and provide clear, actionable insights.

**Portfolio Snapshot** (captured ${ctx.capturedAt}):
\`\`\`json
${JSON.stringify(ctx, null, 2)}
\`\`\`

Structure your response with these sections:

## Portfolio Overview
Total value breakdown, stocks vs crypto split, and overall assessment.

## Performance Analysis
Top 3 performers and any significant losers. Reference actual P&L numbers.

## Risk Assessment
Concentration risk, sector exposure, diversification quality.

## Recommendations
Exactly 3 specific, actionable suggestions grounded in the data above.

## Watch List
Positions that warrant monitoring in the near term and why.

Be concise and data-driven. Cite actual figures. Skip generic disclaimers.`.trim()
} as const;
