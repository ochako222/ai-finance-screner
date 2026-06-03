import type { FastifyInstance } from 'fastify';
import { loadInstrumentInfo, loadLatestSnapshot, loadPortfolioHistory } from '../database.js';

export async function portfolioRoutes(fastify: FastifyInstance): Promise<void> {
    fastify.get('/api/portfolio', async (_req, reply) => {
        const snapshot = loadLatestSnapshot();
        if (!snapshot) {
            return reply.status(404).send({ error: 'No data yet. Click Synchronize.' });
        }

        const tickers = snapshot.trading212.positions.map((p: any) => p.ticker);
        const info = loadInstrumentInfo(tickers);
        snapshot.trading212.positions = snapshot.trading212.positions.map((p: any) => ({
            ...p,
            sector: info[p.ticker]?.sector ?? null,
            kind: info[p.ticker]?.kind ?? 'Stock'
        }));

        return snapshot;
    });

    fastify.get('/api/portfolio/history', async (_req, reply) => {
        return reply.send(loadPortfolioHistory());
    });
}
