import type { FastifyInstance } from 'fastify';
import { fetchBinance } from '../connectors/binance.js';
import { fetchPlnUsdRate } from '../connectors/exchangeRate.js';
import { fetchT212, fetchT212CashFlows } from '../connectors/trading212.js';
import { fetchInstrumentInfo } from '../connectors/yahoo.js';
import {
    getNetContributedCapital,
    missingSectorTickers,
    saveCashFlows,
    saveInstrumentInfo,
    savePortfolioHistory,
    saveSnapshot
} from '../database.js';

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

        if (t212Data) {
            saveSnapshot('trading212', t212Data);

            const missing = missingSectorTickers(t212Data.positions.map((p) => p.ticker));
            if (missing.length > 0) {
                try {
                    const info = await fetchInstrumentInfo(missing);
                    for (const [ticker, { sector, kind }] of Object.entries(info)) {
                        saveInstrumentInfo(ticker, sector, kind);
                    }
                } catch (err) {
                    fastify.log.warn(`Instrument info fetch failed: ${err}`);
                }
            }

            try {
                await new Promise((r) => setTimeout(r, 1100));
                const cashFlows = await fetchT212CashFlows();
                saveCashFlows(cashFlows);
                const nonPln = [
                    ...new Set(cashFlows.filter((f) => f.currency !== 'PLN').map((f) => f.currency))
                ];
                if (nonPln.length > 0) {
                    fastify.log.warn(
                        `Cash flows contain non-PLN currencies: ${nonPln.join(', ')} — FX conversion not yet applied`
                    );
                }
                fastify.log.info(`Cash flows synced: ${cashFlows.length} rows`);
            } catch (err) {
                fastify.log.error(`Cash flow sync failed: ${err}`);
            }
        }
        saveSnapshot('binance', binanceData);

        const totalPln = t212Data?.summary.total ?? 0;
        const totalUsd = exchangeRate != null ? totalPln / exchangeRate : null;
        const { amountPln: investedPln } = getNetContributedCapital();
        const pnlPln = totalPln - investedPln;

        savePortfolioHistory(totalPln, totalUsd, exchangeRate, investedPln, pnlPln);

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
