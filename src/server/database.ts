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
            exchange_rate REAL
        );
        CREATE INDEX IF NOT EXISTS idx_history_time ON portfolio_history (captured_at DESC);

        CREATE TABLE IF NOT EXISTS instrument_sectors (
            ticker     TEXT PRIMARY KEY,
            sector     TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
    `);
    return _db;
}

export function savePortfolioHistory(
    totalPln: number,
    totalUsd: number | null,
    exchangeRate: number | null
): void {
    getDb()
        .prepare(
            'INSERT INTO portfolio_history (captured_at, total_pln, total_usd, exchange_rate) VALUES (?, ?, ?, ?)'
        )
        .run(new Date().toISOString(), totalPln, totalUsd, exchangeRate);
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

export function saveSector(ticker: string, sector: string): void {
    getDb()
        .prepare(
            'INSERT INTO instrument_sectors (ticker, sector, updated_at) VALUES (?, ?, ?) ON CONFLICT(ticker) DO UPDATE SET sector = excluded.sector, updated_at = excluded.updated_at'
        )
        .run(ticker, sector, new Date().toISOString());
}

export function loadSectors(tickers: string[]): Record<string, string> {
    if (tickers.length === 0) return {};
    const placeholders = tickers.map(() => '?').join(', ');
    const rows = getDb()
        .prepare(`SELECT ticker, sector FROM instrument_sectors WHERE ticker IN (${placeholders})`)
        .all(...tickers) as { ticker: string; sector: string }[];
    const map: Record<string, string> = {};
    for (const row of rows) map[row.ticker] = row.sector;
    return map;
}

export function missingSectorTickers(tickers: string[]): string[] {
    if (tickers.length === 0) return [];
    const existing = loadSectors(tickers);
    return tickers.filter((t) => !(t in existing));
}

export function loadLatestSnapshot(): {
    trading212: any;
    binance: any;
    totalPln: number;
    totalUsd: number | null;
    exchangeRate: number | null;
    capturedAt: string;
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

    return {
        trading212: t212Data,
        binance: binanceData,
        totalPln,
        totalUsd: histRow?.total_usd ?? null,
        exchangeRate: histRow?.exchange_rate ?? null,
        capturedAt: t212.captured_at
    };
}
