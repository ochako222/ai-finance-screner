import { fetch } from 'undici';
import { loadConfig } from '../config.js';

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

const BASE = 'https://live.trading212.com/api/v0';

export async function fetchT212(): Promise<{ summary: T212Summary; positions: T212Position[] }> {
    const { api_key, api_secret } = loadConfig().trading212;
    const authHeader = api_secret
        ? `Basic ${Buffer.from(`${api_key}:${api_secret}`).toString('base64')}`
        : api_key;
    const headers = { Authorization: authHeader };

    const summaryRes = await fetch(`${BASE}/equity/account/summary`, { headers });
    if (!summaryRes.ok) throw new Error(`T212 account/summary: HTTP ${summaryRes.status}`);
    const raw = (await summaryRes.json()) as any;

    const summary: T212Summary = {
        cash: raw.cash?.availableToTrade ?? 0,
        invested: raw.investments?.totalCost ?? 0,
        total: raw.totalValue ?? 0,
        result: raw.investments?.unrealizedProfitLoss ?? 0,
        currency: raw.currency ?? 'USD'
    };

    await new Promise((r) => setTimeout(r, 1100));

    const posRes = await fetch(`${BASE}/equity/positions`, { headers });
    if (!posRes.ok) throw new Error(`T212 positions: HTTP ${posRes.status}`);
    const posData = (await posRes.json()) as any[];

    const positions: T212Position[] = posData.map((p) => ({
        ticker: p.instrument?.ticker ?? '',
        quantity: p.quantity,
        averagePrice: p.averagePricePaid ?? 0,
        currentPrice: p.currentPrice ?? 0,
        ppl: p.walletImpact?.unrealizedProfitLoss ?? 0,
        value: p.walletImpact?.currentValue ?? 0
    }));

    return { summary, positions };
}
