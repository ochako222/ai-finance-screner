import type { FastifyInstance } from 'fastify';
import { fetchBinance } from '../connectors/binance.js';
import { fetchT212 } from '../connectors/trading212.js';
import { saveSnapshot } from '../database.js';

export async function syncRoutes(fastify: FastifyInstance): Promise<void> {
    fastify.post('/api/sync', async (_req, reply) => {
        const [t212Result, binanceResult] = await Promise.allSettled([fetchT212(), fetchBinance()]);

        const t212Data = t212Result.status === 'fulfilled' ? t212Result.value : null;
        const binanceData =
            binanceResult.status === 'fulfilled'
                ? binanceResult.value
                : { assets: [], totalUsd: 0 };

        if (t212Result.status === 'rejected') {
            fastify.log.error(`T212 sync failed: ${t212Result.reason}`);
        }

        if (t212Data) saveSnapshot('trading212', t212Data);
        saveSnapshot('binance', binanceData);

        return reply.send({
            ok: true,
            positions: t212Data?.positions.length ?? 0,
            totalUsd: (t212Data?.summary.total ?? 0) + binanceData.totalUsd,
            errors: {
                trading212: t212Result.status === 'rejected' ? String(t212Result.reason) : null,
                binance: binanceResult.status === 'rejected' ? String(binanceResult.reason) : null
            }
        });
    });
}
