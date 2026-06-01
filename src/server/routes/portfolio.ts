import type { FastifyInstance } from 'fastify';
import { loadLatestSnapshot } from '../database.js';

export async function portfolioRoutes(fastify: FastifyInstance): Promise<void> {
    fastify.get('/api/portfolio', async (_req, reply) => {
        const snapshot = loadLatestSnapshot();
        if (!snapshot) {
            return reply.status(404).send({ error: 'No data yet. Click Synchronize.' });
        }
        return snapshot;
    });
}
