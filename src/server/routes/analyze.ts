import { spawn } from 'node:child_process';
import type { FastifyInstance } from 'fastify';
import { loadConfig } from '../config.js';
import { loadLatestSnapshot } from '../database.js';
import { type PortfolioContext, PROMPTS } from '../prompts/index.js';

export async function analyzeRoutes(fastify: FastifyInstance): Promise<void> {
    fastify.get('/api/analyze/stream', async (request, reply) => {
        const snapshot = loadLatestSnapshot();
        if (!snapshot) {
            return reply.status(400).send({ error: 'No portfolio data. Synchronize first.' });
        }

        const { model, effort } = loadConfig().ai;
        const ctx: PortfolioContext = { ...snapshot };
        const prompt = PROMPTS.advise(ctx);

        reply.raw.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no'
        });

        const send = (event: string, data: string) => {
            reply.raw.write(`event: ${event}\ndata: ${data}\n\n`);
        };

        const proc = spawn('claude', [
            '-p',
            prompt,
            '--model',
            model,
            '--effort',
            effort,
            '--output-format',
            'stream-json',
            '--verbose'
        ]);

        let buf = '';

        proc.stdout.on('data', (chunk: Buffer) => {
            buf += chunk.toString();
            const lines = buf.split('\n');
            buf = lines.pop() ?? '';

            for (const line of lines.filter(Boolean)) {
                try {
                    const ev = JSON.parse(line);
                    if (ev.type === 'assistant') {
                        const text = (ev.message?.content ?? [])
                            .filter((b: any) => b.type === 'text')
                            .map((b: any) => b.text)
                            .join('');
                        if (text) send('text', text);
                    } else if (ev.type === 'result') {
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
            send('error', err.message);
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
