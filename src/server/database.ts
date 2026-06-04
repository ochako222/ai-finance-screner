import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';

const DB_DIR = join(import.meta.dirname, '..', '..', 'data');
const DB_PATH = join(DB_DIR, 'portfolio.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
    if (_db) return _db;
    mkdirSync(DB_DIR, { recursive: true });
    _db = new Database(DB_PATH);
    _db.exec(`
        CREATE TABLE IF NOT EXISTS snapshots (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            source      TEXT NOT NULL,
            captured_at TEXT NOT NULL,
            payload     TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_snapshots_source_time
            ON snapshots (source, captured_at DESC);

        CREATE TABLE IF NOT EXISTS portfolio_history (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            captured_at   TEXT NOT NULL,
            total_pln     REAL NOT NULL,
            total_usd     REAL,
            exchange_rate REAL,
            invested_pln  REAL,
            pnl_pln       REAL
        );
        CREATE INDEX IF NOT EXISTS idx_history_time ON portfolio_history (captured_at DESC);

        CREATE TABLE IF NOT EXISTS cash_flows (
            id          TEXT PRIMARY KEY,
            captured_at TEXT NOT NULL,
            date_time   TEXT NOT NULL,
            type        TEXT NOT NULL,
            amount      REAL NOT NULL,
            currency    TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_cash_flows_date ON cash_flows (date_time);

        CREATE TABLE IF NOT EXISTS stock_metadata (
            ticker      TEXT PRIMARY KEY,
            sector      TEXT,
            industry    TEXT,
            asset_type  TEXT NOT NULL DEFAULT 'Unknown',
            long_name   TEXT,
            fetched_at  TEXT NOT NULL
        );
    `);
    return _db;
}

export function savePortfolioHistory(
    totalPln: number,
    totalUsd: number | null,
    exchangeRate: number | null,
    investedPln?: number,
    pnlPln?: number
): void {
    getDb()
        .prepare(
            'INSERT INTO portfolio_history (captured_at, total_pln, total_usd, exchange_rate, invested_pln, pnl_pln) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .run(
            new Date().toISOString(),
            totalPln,
            totalUsd,
            exchangeRate,
            investedPln ?? null,
            pnlPln ?? null
        );
}

export function loadPortfolioHistory(): {
    capturedAt: string;
    totalPln: number;
    totalUsd: number | null;
    exchangeRate: number | null;
}[] {
    const rows = getDb()
        .prepare(
            'SELECT captured_at, total_pln, total_usd, exchange_rate FROM portfolio_history ORDER BY captured_at ASC'
        )
        .all() as {
        captured_at: string;
        total_pln: number;
        total_usd: number | null;
        exchange_rate: number | null;
    }[];
    return rows.map((r) => ({
        capturedAt: r.captured_at,
        totalPln: r.total_pln,
        totalUsd: r.total_usd,
        exchangeRate: r.exchange_rate
    }));
}

export function saveSnapshot(source: 'trading212' | 'binance', payload: unknown): void {
    getDb()
        .prepare('INSERT INTO snapshots (source, captured_at, payload) VALUES (?, ?, ?)')
        .run(source, new Date().toISOString(), JSON.stringify(payload));
}

export interface SnapshotRow {
    payload: string;
    captured_at: string;
}

export interface CashFlow {
    id: string;
    dateTime: string;
    type: 'DEPOSIT' | 'WITHDRAWAL';
    amount: number;
    currency: string;
}

export function saveCashFlows(rows: CashFlow[]): void {
    if (rows.length === 0) return;
    const stmt = getDb().prepare(
        'INSERT OR IGNORE INTO cash_flows (id, captured_at, date_time, type, amount, currency) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const now = new Date().toISOString();
    const insertMany = getDb().transaction((items: CashFlow[]) => {
        for (const row of items) {
            stmt.run(row.id, now, row.dateTime, row.type, row.amount, row.currency);
        }
    });
    insertMany(rows);
}

export interface StockMetadata {
    ticker: string;
    sector: string | null;
    industry: string | null;
    assetType: 'ETF' | 'Stock' | 'Unknown';
    longName: string | null;
    fetchedAt: string;
}

export interface StockMetadataRow {
    ticker: string;
    sector: string | null;
    industry: string | null;
    asset_type: 'ETF' | 'Stock' | 'Unknown';
    long_name: string | null;
    fetched_at: string;
}

export function upsertStockMetadata(rows: StockMetadata[]): void {
    if (rows.length === 0) return;
    const stmt = getDb().prepare(
        `INSERT INTO stock_metadata (ticker, sector, industry, asset_type, long_name, fetched_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(ticker) DO UPDATE SET
             sector     = excluded.sector,
             industry   = excluded.industry,
             asset_type = excluded.asset_type,
             long_name  = excluded.long_name,
             fetched_at = excluded.fetched_at`
    );
    const txn = getDb().transaction((items: StockMetadata[]) => {
        for (const r of items) {
            stmt.run(r.ticker, r.sector, r.industry, r.assetType, r.longName, r.fetchedAt);
        }
    });
    txn(rows);
}

export function loadStockMetadata(tickers: string[]): Map<string, StockMetadataRow> {
    const out = new Map<string, StockMetadataRow>();
    if (tickers.length === 0) return out;
    const placeholders = tickers.map(() => '?').join(',');
    const rows = getDb()
        .prepare(
            `SELECT ticker, sector, industry, asset_type, long_name, fetched_at
             FROM stock_metadata WHERE ticker IN (${placeholders})`
        )
        .all(...tickers) as StockMetadataRow[];
    for (const r of rows) out.set(r.ticker, r);
    return out;
}

export function getNetContributedCapital(): { amountPln: number } {
    const rows = getDb()
        .prepare('SELECT SUM(amount) as total FROM cash_flows WHERE currency = ?')
        .get('PLN') as { total: number | null };
    return { amountPln: rows.total ?? 0 };
}

export function loadLatestSnapshot(): {
    trading212: any;
    binance: any;
    totalPln: number;
    totalUsd: number | null;
    exchangeRate: number | null;
    capturedAt: string;
    investedPln: number;
    pnlPln: number;
    pnlPct: number | null;
} | null {
    const db = getDb();
    const stmt = db.prepare(
        'SELECT payload, captured_at FROM snapshots WHERE source = ? ORDER BY captured_at DESC LIMIT 1'
    );
    const t212 = stmt.get('trading212') as SnapshotRow | undefined;
    const binance = stmt.get('binance') as SnapshotRow | undefined;

    if (!t212) return null;

    const t212Data = JSON.parse(t212.payload);
    const binanceData = binance ? JSON.parse(binance.payload) : { assets: [], totalUsd: 0 };
    const totalPln = t212Data.summary?.total ?? 0;

    const histRow = db
        .prepare(
            'SELECT total_usd, exchange_rate FROM portfolio_history ORDER BY captured_at DESC LIMIT 1'
        )
        .get() as { total_usd: number | null; exchange_rate: number | null } | undefined;

    const { amountPln: investedPln } = getNetContributedCapital();
    const pnlPln = totalPln - investedPln;
    const pnlPct = investedPln === 0 ? null : (pnlPln / investedPln) * 100;

    return {
        trading212: t212Data,
        binance: binanceData,
        totalPln,
        totalUsd: histRow?.total_usd ?? null,
        exchangeRate: histRow?.exchange_rate ?? null,
        capturedAt: t212.captured_at,
        investedPln,
        pnlPln,
        pnlPct
    };
}
