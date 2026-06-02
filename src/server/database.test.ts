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
    `);
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
