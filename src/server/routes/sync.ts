import type { FastifyInstance } from 'fastify';
import { fetchBinance } from '../connectors/binance.js';
import { fetchPlnUsdRate } from '../connectors/exchangeRate.js';
import { fetchT212 } from '../connectors/trading212.js';
import { savePortfolioHistory, saveSnapshot } from '../database.js';

export async function syncRoutes(fastify: FastifyInstance): Promise<void> {
    fastify.post('/api/sync', async (_req, reply) => {
        const [t212Result, binanceResult, rateResult] = await Promise.allSettled([
            fetchT212(),
            fetchBinance(),
            fetchPlnUsdRate()
        ]);

        const t212Data = t212Result.status === 'fulfilled' ? t212Result.value : null;
        const binanceData =
            binanceResult.status === 'fulfilled'
                ? binanceResult.value
                : { assets: [], totalUsd: 0 };
        const exchangeRate = rateResult.status === 'fulfilled' ? rateResult.value : null;

        if (t212Result.status === 'rejected') {
            fastify.log.error(`T212 sync failed: ${t212Result.reason}`);
        }
        if (rateResult.status === 'rejected') {
            fastify.log.warn(`Exchange rate fetch failed: ${rateResult.reason}`);
        }

        if (t212Data) saveSnapshot('trading212', t212Data);
        saveSnapshot('binance', binanceData);

        const totalPln = t212Data?.summary.total ?? 0;
        const totalUsd = exchangeRate != null ? totalPln / exchangeRate : null;

        savePortfolioHistory(totalPln, totalUsd, exchangeRate);

        return reply.send({
            ok: true,
            positions: t212Data?.positions.length ?? 0,
            totalPln,
            totalUsd,
            exchangeRate,
            errors: {
                trading212: t212Result.status === 'rejected' ? String(t212Result.reason) : null,
                binance: binanceResult.status === 'rejected' ? String(binanceResult.reason) : null,
                exchangeRate: rateResult.status === 'rejected' ? String(rateResult.reason) : null
            }
        });
    });
}
