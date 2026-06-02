import type { FastifyInstance } from 'fastify';
import { loadLatestSnapshot, loadPortfolioHistory, loadSectors } from '../database.js';

export async function portfolioRoutes(fastify: FastifyInstance): Promise<void> {
    fastify.get('/api/portfolio', async (_req, reply) => {
        const snapshot = loadLatestSnapshot();
        if (!snapshot) {
            return reply.status(404).send({ error: 'No data yet. Click Synchronize.' });
        }

        const tickers = snapshot.trading212.positions.map((p: any) => p.ticker);
        const sectors = loadSectors(tickers);
        snapshot.trading212.positions = snapshot.trading212.positions.map((p: any) => ({
            ...p,
            sector: sectors[p.ticker] ?? null
        }));

        return snapshot;
    });

    fastify.get('/api/portfolio/history', async (_req, reply) => {
        return reply.send(loadPortfolioHistory());
    });
}
