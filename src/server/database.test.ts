import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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

        CREATE TABLE IF NOT EXISTS known_instruments (
            base_ticker   TEXT PRIMARY KEY,
            name          TEXT NOT NULL,
            type          TEXT NOT NULL DEFAULT 'Unknown',
            market        TEXT,
            sector        TEXT,
            industry      TEXT,
            index_tracked TEXT,
            updated_at    TEXT NOT NULL
        );
    `);
}

interface KnownInstrumentInput {
    baseTicker: string;
    name: string;
    type: 'ETF' | 'Stock' | 'Bond' | 'Unknown';
    market: string | null;
    sector: string | null;
    industry: string | null;
    indexTracked: string | null;
}

interface KnownInstrumentRow {
    base_ticker: string;
    name: string;
    type: string;
    market: string | null;
    sector: string | null;
    industry: string | null;
    index_tracked: string | null;
    updated_at: string;
}

function upsertInstruments(d: Database.Database, rows: KnownInstrumentInput[]) {
    const stmt = d.prepare(`
        INSERT INTO known_instruments
            (base_ticker, name, type, market, sector, industry, index_tracked, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(base_ticker) DO UPDATE SET
            name          = excluded.name,
            type          = excluded.type,
            market        = excluded.market,
            sector        = excluded.sector,
            industry      = excluded.industry,
            index_tracked = excluded.index_tracked,
            updated_at    = excluded.updated_at
    `);
    const txn = d.transaction((items: KnownInstrumentInput[]) => {
        const now = new Date().toISOString();
        for (const r of items) {
            stmt.run(
                r.baseTicker,
                r.name,
                r.type,
                r.market,
                r.sector,
                r.industry,
                r.indexTracked,
                now
            );
        }
    });
    txn(rows);
}

function loadInstruments(
    d: Database.Database,
    baseTickers: string[]
): Map<string, KnownInstrumentRow> {
    const out = new Map<string, KnownInstrumentRow>();
    if (baseTickers.length === 0) return out;
    const ph = baseTickers.map(() => '?').join(',');
    const rows = d
        .prepare(`SELECT * FROM known_instruments WHERE base_ticker IN (${ph})`)
        .all(...baseTickers) as KnownInstrumentRow[];
    for (const r of rows) out.set(r.base_ticker, r);
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
        insertFlow(db, 'd1', 'DEPOSIT', 1000);
        expect(netPln(db)).toBe(1000);
    });
});

describe('known_instruments upsert/load', () => {
    it('inserts and reads back multiple rows', () => {
        upsertInstruments(db, [
            {
                baseTicker: 'VWCE',
                name: 'Vanguard FTSE All-World Acc',
                type: 'ETF',
                market: 'Xetra',
                sector: 'Diversified',
                industry: 'Diversified — all sectors',
                indexTracked: 'FTSE All-World'
            },
            {
                baseTicker: 'BRKS',
                name: 'Azenta Inc',
                type: 'Stock',
                market: 'NASDAQ',
                sector: 'Healthcare',
                industry: 'Semiconductor Equipment',
                indexTracked: 'NASDAQ Composite'
            }
        ]);
        const out = loadInstruments(db, ['VWCE', 'BRKS']);
        expect(out.size).toBe(2);
        expect(out.get('VWCE')?.type).toBe('ETF');
        expect(out.get('VWCE')?.index_tracked).toBe('FTSE All-World');
        expect(out.get('BRKS')?.sector).toBe('Healthcare');
    });

    it('upserts update existing rows', () => {
        upsertInstruments(db, [
            {
                baseTicker: 'AGGH',
                name: 'Old Name',
                type: 'ETF',
                market: 'LSE',
                sector: null,
                industry: null,
                indexTracked: null
            }
        ]);
        upsertInstruments(db, [
            {
                baseTicker: 'AGGH',
                name: 'iShares Global Aggregate Bond EUR-Hedged Acc',
                type: 'Bond',
                market: 'LSE',
                sector: 'Fixed Income',
                industry: 'Fixed Income — Govt + Corp',
                indexTracked: 'Bloomberg Global Aggregate (EUR-hedged)'
            }
        ]);
        const out = loadInstruments(db, ['AGGH']);
        expect(out.get('AGGH')?.type).toBe('Bond');
        expect(out.get('AGGH')?.name).toBe('iShares Global Aggregate Bond EUR-Hedged Acc');
    });

    it('returns empty map for unknown base tickers', () => {
        const out = loadInstruments(db, ['GHOST']);
        expect(out.size).toBe(0);
    });
});
