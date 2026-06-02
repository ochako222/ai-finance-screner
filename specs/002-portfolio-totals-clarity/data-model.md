# Phase 1 — Data Model

## New entity: `CashFlow`

A single deposit or withdrawal recorded by Trading 212.

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Trading 212 transaction id; primary key (idempotent upsert). |
| `dateTime` | ISO 8601 string | When the flow occurred at the broker. |
| `type` | `'DEPOSIT' \| 'WITHDRAWAL'` | Only these two contribute to "Invested". Other ledger types (DIVIDEND, INTEREST, FEE) are ignored for this feature. |
| `amount` | number | Positive for deposits, negative for withdrawals. In `currency`. |
| `currency` | string | ISO 4217 (typically `PLN` for this user). |

**Validation**:
- `id` non-empty.
- `amount` non-zero.
- `type ∈ {DEPOSIT, WITHDRAWAL}` — other rows are dropped at fetch time.

## SQLite table: `cash_flows`

```sql
CREATE TABLE IF NOT EXISTS cash_flows (
  id          TEXT PRIMARY KEY,
  captured_at TEXT NOT NULL,    -- when we recorded it locally
  date_time   TEXT NOT NULL,    -- broker timestamp
  type        TEXT NOT NULL,
  amount      REAL NOT NULL,
  currency    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cash_flows_date ON cash_flows(date_time);
```

Insert: `INSERT OR IGNORE INTO cash_flows (...)` — `id` collision means we've already seen the row, no error.

## Derived figure: `net contributed capital`

```text
invested_native = SUM(amount) FROM cash_flows
invested_pln    = SUM(amount * fx_rate_at(date_time, currency → PLN))
                  -- when currency == 'PLN', fx_rate = 1
```

For this user all flows are PLN, so `invested_pln === invested_native` until a non-PLN flow appears.

## Extended entity: `PortfolioSnapshot` (existing)

Adds three computed fields, all in PLN:

| Field | Type | Definition |
|-------|------|-----------|
| `investedPln` | number | Net contributed capital, converted to PLN. |
| `pnlPln` | number | `totalPln − investedPln`. |
| `pnlPct` | number \| null | `pnlPln / investedPln * 100`; `null` when `investedPln === 0`. |

Existing fields (`trading212`, `binance`, `totalPln`, `totalUsd`, `exchangeRate`, `capturedAt`) are unchanged.

## State transitions

`cash_flows` is append-only (no updates, no deletes). A withdrawal is stored as a separate row with a negative `amount`, not as an update to the matching deposit. This keeps the audit trail intact and makes "Invested over time" trivially computable.
