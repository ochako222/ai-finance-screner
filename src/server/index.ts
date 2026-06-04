import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import open from 'open';
import { loadConfig } from './config.js';
import { KNOWN_INSTRUMENTS } from './data/known-instruments.js';
import { getDb, upsertKnownInstruments } from './database.js';
import { portfolioRoutes } from './routes/portfolio.js';
import { syncRoutes } from './routes/sync.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = loadConfig();
const { port } = config.app;

if (config.trading212.api_key.startsWith('your-')) {
    console.warn(
        '  ⚠  config.toml: trading212.api_key looks like a placeholder — sync will fail with 401'
    );
}

const fastify = Fastify({ logger: { level: 'info' } });

getDb();
upsertKnownInstruments(KNOWN_INSTRUMENTS);

await fastify.register(fastifyCors, { origin: 'http://localhost:5173' });

await fastify.register(portfolioRoutes);
await fastify.register(syncRoutes);

const distPath = resolve(__dirname, '../../dist/client');
if (existsSync(distPath)) {
    await fastify.register(fastifyStatic, { root: distPath });
    fastify.setNotFoundHandler((_req, reply) => reply.sendFile('index.html'));
}

await fastify.listen({ port, host: '127.0.0.1' });
console.log(`\n  ✦ Alex Financial Screener  →  http://localhost:${port}\n`);
setTimeout(() => open(`http://localhost:${port}`), 1200);
