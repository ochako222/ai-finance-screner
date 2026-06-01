# Data Model: Currency Fix, USD Conversion & Dashboard Layout

## Existing Entities (modified)

### PortfolioSnapshot (types.ts)

Current `totalUsd: number` is semantically wrong — it holds a PLN value computed by summing T212's PLN total with Binance's USD total. This field is renamed and the type is extended.

**Updated shape**:
```ts
export interface PortfolioSnapshot {
    trading212: Trading212Data;
    binance: BinanceData;
    totalPln: number;        // renamed from totalUsd; T212 total in PLN
    totalUsd: number | null; // new: converted USD equivalent; null if rate unavailable
    exchangeRate: number | null; // PLN per 1 USD on capturedAt date
    capturedAt: string;
}
```

### SyncResult (types.ts)

**Updated shape**:
```ts
export interface SyncResult {
    ok: boolean;
    positions: number;
    totalPln: number;        // renamed from totalUsd
    totalUsd: number | null; // null if exchange rate fetch failed
    exchangeRate: number | null;
    errors: {
        trading212: string | null;
        binance: string | null;
        exchangeRate: string | null; // new: non-fatal, USD display degrades gracefully
    };
}
```

---

## New Entities

### PortfolioHistoryPoint (types.ts — new)

Represents one entry in the portfolio value time series.

```ts
export interface PortfolioHistoryPoint {
    capturedAt: string;  // ISO-8601 datetime
    totalPln: number;
    totalUsd: number | null;
    exchangeRate: number | null;
}
```

### ExchangeRateResult (server-internal, not exported to client)

Used internally in the exchange rate connector — not surfaced as a client type.

```ts
interface ExchangeRateResult {
    rate: number;        // PLN per 1 USD
    date: string;        // YYYY-MM-DD
}
```

---

## Database Schema Changes

### New table: `portfolio_history`

```sql
CREATE TABLE IF NOT EXISTS portfolio_history (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    captured_at   TEXT NOT NULL,
    total_pln     REAL NOT NULL,
    total_usd     REAL,           -- NULL if rate unavailable at sync time
    exchange_rate REAL            -- NULL if rate unavailable at sync time
);
CREATE INDEX IF NOT EXISTS idx_history_time ON portfolio_history (captured_at DESC);
```

**Written**: once per successful sync (in `syncRoutes`).
**Read**: by `GET /api/portfolio/history` to supply the dynamics chart.

---

## New Server Files

| File | Purpose |
|------|---------|
| `src/server/connectors/exchangeRate.ts` | Fetch today's PLN/USD rate from NBP API; handles fallback and errors |

---

## Modified Server Files

| File | Change |
|------|--------|
| `src/server/database.ts` | Add `savePortfolioHistory()`, `loadPortfolioHistory()`, update `loadLatestSnapshot()` to return `totalPln`/`totalUsd`/`exchangeRate` |
| `src/server/routes/sync.ts` | Call exchange rate connector; save to `portfolio_history`; update response shape |
| `src/server/routes/portfolio.ts` | Add `GET /api/portfolio/history` route returning `PortfolioHistoryPoint[]` |

---

## New Client Files

| File | Purpose |
|------|---------|
| `src/client/components/DynamicsChart.tsx` | Line/area chart of portfolio total PLN over time |
| `src/client/api/portfolio.service.ts` | Add `getHistory()` method (new endpoint) |

---

## Modified Client Files

| File | Change |
|------|--------|
| `src/client/support/types.ts` | Update `PortfolioSnapshot`, `SyncResult`; add `PortfolioHistoryPoint` |
| `src/client/components/SummaryCards.tsx` | Show PLN total + USD equivalent; fix `fmt` defaults |
| `src/client/components/AllocationChart.tsx` | Fix hardcoded `$` in tooltip; use PLN formatting |
| `src/client/components/StocksTable.tsx` | Add `zł` suffix to monetary columns |
| `src/client/pages/DashboardPage.tsx` | Implement four-row layout |
| `src/client/styles/_dashboard.scss` | Replace `.dashboard__grid` with four-row layout classes |
