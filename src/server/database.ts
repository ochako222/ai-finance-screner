import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';

const DB_DIR = join(homedir(), '.local', 'share', 'alex-financial-screener');
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
    `);
    return _db;
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

export function loadLatestSnapshot(): {
    trading212: any;
    binance: any;
    totalUsd: number;
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
    const totalUsd = (t212Data.summary?.total ?? 0) + (binanceData.totalUsd ?? 0);

    return { trading212: t212Data, binance: binanceData, totalUsd, capturedAt: t212.captured_at };
}
