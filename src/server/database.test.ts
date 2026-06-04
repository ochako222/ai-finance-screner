import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// We test the aggregation logic directly with an in-memory SQLite database,
// bypassing the module singleton so each test starts from a clean state.

let db: Database.Database;

function setupSchema(d: Database.Database) {
    d.exec(`
        CREATE TABLE IF NOT EXISTS cash_flows (
            id          TEXT PRIMARY KEY,
            captured_at TEXT NOT NULL,
            date_time   TEXT NOT NULL,
            type        TEXT NOT NULL,
            amount      REAL NOT NULL,
            currency    TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS stock_metadata (
            ticker      TEXT PRIMARY KEY,
            sector      TEXT,
            industry    TEXT,
            asset_type  TEXT NOT NULL DEFAULT 'Unknown',
            long_name   TEXT,
            fetched_at  TEXT NOT NULL
        );
    `);
}

interface StockMetadataInput {
    ticker: string;
    sector: string | null;
    industry: string | null;
    assetType: 'ETF' | 'Stock' | 'Unknown';
    longName: string | null;
    fetchedAt: string;
}

interface StockMetadataDbRow {
    ticker: string;
    sector: string | null;
    industry: string | null;
    asset_type: 'ETF' | 'Stock' | 'Unknown';
    long_name: string | null;
    fetched_at: string;
}

function upsertMetadata(d: Database.Database, rows: StockMetadataInput[]) {
    const stmt = d.prepare(
        `INSERT INTO stock_metadata (ticker, sector, industry, asset_type, long_name, fetched_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(ticker) DO UPDATE SET
             sector     = excluded.sector,
             industry   = excluded.industry,
             asset_type = excluded.asset_type,
             long_name  = excluded.long_name,
             fetched_at = excluded.fetched_at`
    );
    const txn = d.transaction((items: StockMetadataInput[]) => {
        for (const r of items) {
            stmt.run(r.ticker, r.sector, r.industry, r.assetType, r.longName, r.fetchedAt);
        }
    });
    txn(rows);
}

function loadMetadata(d: Database.Database, tickers: string[]): Map<string, StockMetadataDbRow> {
    const out = new Map<string, StockMetadataDbRow>();
    if (tickers.length === 0) return out;
    const placeholders = tickers.map(() => '?').join(',');
    const rows = d
        .prepare(
            `SELECT ticker, sector, industry, asset_type, long_name, fetched_at
             FROM stock_metadata WHERE ticker IN (${placeholders})`
        )
        .all(...tickers) as StockMetadataDbRow[];
    for (const r of rows) out.set(r.ticker, r);
    return out;
}

function insertFlow(
    d: Database.Database,
    id: string,
    type: 'DEPOSIT' | 'WITHDRAWAL',
    amount: number,
    currency = 'PLN'
) {
    d.prepare(
        'INSERT OR IGNORE INTO cash_flows (id, captured_at, date_time, type, amount, currency) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, new Date().toISOString(), new Date().toISOString(), type, amount, currency);
}

function netPln(d: Database.Database): number {
    const row = d
        .prepare('SELECT SUM(amount) as total FROM cash_flows WHERE currency = ?')
        .get('PLN') as { total: number | null };
    return row.total ?? 0;
}

beforeEach(() => {
    db = new Database(':memory:');
    setupSchema(db);
});

afterEach(() => {
    db.close();
});

describe('net contributed capital aggregation', () => {
    it('returns 0 when no flows recorded', () => {
        expect(netPln(db)).toBe(0);
    });

    it('sums deposits correctly', () => {
        insertFlow(db, 'd1', 'DEPOSIT', 1000);
        insertFlow(db, 'd2', 'DEPOSIT', 500);
        expect(netPln(db)).toBe(1500);
    });

    it('subtracts withdrawals (stored as negative amounts)', () => {
        insertFlow(db, 'd1', 'DEPOSIT', 2000);
        insertFlow(db, 'w1', 'WITHDRAWAL', -300);
        expect(netPln(db)).toBe(1700);
    });

    it('handles full withdrawal resulting in zero', () => {
        insertFlow(db, 'd1', 'DEPOSIT', 1000);
        insertFlow(db, 'w1', 'WITHDRAWAL', -1000);
        expect(netPln(db)).toBe(0);
    });

    it('excludes non-PLN flows from PLN sum', () => {
        insertFlow(db, 'd1', 'DEPOSIT', 1000, 'PLN');
        insertFlow(db, 'd2', 'DEPOSIT', 500, 'USD');
        expect(netPln(db)).toBe(1000);
    });

    it('is idempotent for duplicate IDs (INSERT OR IGNORE)', () => {
        insertFlow(db, 'd1', 'DEPOSIT', 1000);
        insertFlow(db, 'd1', 'DEPOSIT', 1000); // duplicate — should be ignored
        expect(netPln(db)).toBe(1000);
    });
});

describe('stock_metadata upsert/load', () => {
    it('inserts and reads back multiple rows', () => {
        upsertMetadata(db, [
            {
                ticker: 'AAPL_US_EQ',
                sector: 'Technology',
                industry: 'Consumer Electronics',
                assetType: 'Stock',
                longName: 'Apple Inc.',
                fetchedAt: '2026-06-04T08:00:00.000Z'
            },
            {
                ticker: 'VWCE_GY_ETF',
                sector: null,
                industry: null,
                assetType: 'ETF',
                longName: 'Vanguard FTSE All-World UCITS Acc',
                fetchedAt: '2026-06-04T08:00:00.000Z'
            }
        ]);
        const out = loadMetadata(db, ['AAPL_US_EQ', 'VWCE_GY_ETF']);
        expect(out.size).toBe(2);
        expect(out.get('AAPL_US_EQ')?.sector).toBe('Technology');
        expect(out.get('VWCE_GY_ETF')?.asset_type).toBe('ETF');
        expect(out.get('VWCE_GY_ETF')?.sector).toBeNull();
    });

    it('preserves rows for tickers not in the upsert payload (FR-004)', () => {
        upsertMetadata(db, [
            {
                ticker: 'AAPL_US_EQ',
                sector: 'Technology',
                industry: 'Consumer Electronics',
                assetType: 'Stock',
                longName: 'Apple Inc.',
                fetchedAt: '2026-06-04T08:00:00.000Z'
            },
            {
                ticker: 'MSFT_US_EQ',
                sector: 'Technology',
                industry: 'Software—Infrastructure',
                assetType: 'Stock',
                longName: 'Microsoft Corp',
                fetchedAt: '2026-06-04T08:00:00.000Z'
            }
        ]);
        // Simulate a later sync where only AAPL gets refreshed (e.g. MSFT failed at Yahoo).
        upsertMetadata(db, [
            {
                ticker: 'AAPL_US_EQ',
                sector: 'Technology',
                industry: 'Consumer Electronics',
                assetType: 'Stock',
                longName: 'Apple Inc.',
                fetchedAt: '2026-06-04T09:00:00.000Z'
            }
        ]);
        const out = loadMetadata(db, ['AAPL_US_EQ', 'MSFT_US_EQ']);
        expect(out.get('AAPL_US_EQ')?.fetched_at).toBe('2026-06-04T09:00:00.000Z');
        // MSFT row MUST remain at its original fetched_at — failure did not erase it.
        expect(out.get('MSFT_US_EQ')?.fetched_at).toBe('2026-06-04T08:00:00.000Z');
        expect(out.get('MSFT_US_EQ')?.sector).toBe('Technology');
    });

    it('returns empty map for never-inserted tickers (caller defaults to Unknown)', () => {
        const out = loadMetadata(db, ['GHOST_US_EQ']);
        expect(out.size).toBe(0);
        expect(out.get('GHOST_US_EQ')).toBeUndefined();
    });
});
