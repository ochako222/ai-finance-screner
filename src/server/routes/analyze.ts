import { spawn } from 'node:child_process';
import type { FastifyInstance } from 'fastify';
import { loadConfig } from '../config.js';
import { loadLatestSnapshot, loadStockMetadata } from '../database.js';
import { mergePositionsWithMetadata } from '../lib/mergePositions.js';
import { ANALYSIS_SCHEMA, type AnalyzePayload, PROMPTS } from '../prompts/index.js';

export async function analyzeRoutes(fastify: FastifyInstance): Promise<void> {
    fastify.get('/api/analyze/stream', async (request, reply) => {
        const snapshot = loadLatestSnapshot();
        if (!snapshot) {
            return reply.status(400).send({ error: 'No portfolio data. Synchronize first.' });
        }

        const cfg = loadConfig();
        const { model, effort } = cfg.ai;

        reply.raw.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no'
        });

        const send = (event: string, data: string) => {
            reply.raw.write(`event: ${event}\ndata: ${data}\n\n`);
        };

        const positions = snapshot.trading212.positions;
        const byTicker = loadStockMetadata(positions.map((p) => p.ticker));
        const enriched = mergePositionsWithMetadata(positions, byTicker);

        const payload: AnalyzePayload = {
            captured_at: snapshot.capturedAt,
            currency: 'PLN',
            account_summary: snapshot.trading212.summary,
            invested_pln: snapshot.investedPln,
            pnl_pln: snapshot.pnlPln,
            pnl_pct: snapshot.pnlPct,
            positions: enriched
        };

        const proc = spawn('claude', [
            '-p',
            PROMPTS.analyzeWithData(payload),
            '--model',
            model,
            '--effort',
            effort,
            '--output-format',
            'stream-json',
            '--verbose',
            '--json-schema',
            JSON.stringify(ANALYSIS_SCHEMA)
        ]);

        let buf = '';

        proc.stdout.on('data', (chunk: Buffer) => {
            buf += chunk.toString();
            const lines = buf.split('\n');
            buf = lines.pop() ?? '';

            for (const line of lines.filter(Boolean)) {
                try {
                    const ev = JSON.parse(line);
                    if (ev.type === 'result') {
                        if (ev.subtype === 'success' && ev.structured_output) {
                            send('analysis', JSON.stringify(ev.structured_output));
                        } else {
                            send(
                                'error',
                                JSON.stringify({ message: ev.subtype ?? 'unknown_error' })
                            );
                        }
                        send(
                            'done',
                            JSON.stringify({
                                cost_usd: ev.total_cost_usd,
                                duration_ms: ev.duration_ms
                            })
                        );
                    }
                } catch {
                    // skip malformed lines
                }
            }
        });

        proc.stderr.on('data', (chunk: Buffer) => {
            fastify.log.debug(`claude stderr: ${chunk.toString().trim()}`);
        });

        proc.on('error', (err) => {
            send('error', JSON.stringify({ message: err.message }));
            reply.raw.end();
        });

        proc.on('close', () => {
            send('close', '');
            reply.raw.end();
        });

        request.raw.on('close', () => proc.kill());

        await new Promise((resolve) => proc.on('close', resolve));
    });
}
