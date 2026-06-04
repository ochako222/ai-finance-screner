import type { FastifyInstance } from 'fastify';
import {
    loadKnownInstruments,
    loadLatestSnapshot,
    loadPortfolioHistory,
    t212ToBase
} from '../database.js';
import { mergePositionsWithMetadata } from '../lib/mergePositions.js';

export async function portfolioRoutes(fastify: FastifyInstance): Promise<void> {
    fastify.get('/api/portfolio', async (_req, reply) => {
        const snapshot = loadLatestSnapshot();
        if (!snapshot) {
            return reply.status(404).send({ error: 'No data yet. Click Synchronize.' });
        }

        const positions = snapshot.trading212.positions;
        const baseTickers = positions.map((p: any) => t212ToBase(p.ticker));
        const byBase = loadKnownInstruments(baseTickers);
        const enriched = mergePositionsWithMetadata(positions, byBase);

        return reply.send({
            ...snapshot,
            trading212: { ...snapshot.trading212, positions: enriched }
        });
    });

    fastify.get('/api/portfolio/history', async (_req, reply) => {
        return reply.send(loadPortfolioHistory());
    });
}
