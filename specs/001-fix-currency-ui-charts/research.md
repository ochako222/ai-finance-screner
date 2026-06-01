# Research: Currency Fix, USD Conversion & Dashboard Layout

## Decision 1: PLN/USD Exchange Rate Source

**Decision**: Use the National Bank of Poland (NBP) public API.

**Endpoint**: `GET https://api.nbp.pl/api/exchangerates/rates/a/usd/today/?format=json`

**Rationale**:
- Official Polish central-bank rate — authoritative for PLN-denominated accounts.
- Completely free, no API key, no rate limits documented for single daily calls.
- Returns today's mid-market rate as a simple JSON object.
- Consistent with the currency used by Trading 212 Poland accounts.

**Response shape**:
```json
{
  "rates": [{ "mid": 3.9234, "effectiveDate": "2026-06-01" }]
}
```
USD amount = PLN amount ÷ `rates[0].mid`.

**Alternatives considered**:
- `exchangerate-api.com` — requires registration for reliable access; adds external dependency with looser SLA.
- `openexchangerates.org` — free tier requires API key.
- Hardcoding a rate — not viable; rate changes daily.

**Fallback**: If NBP returns non-200 (e.g., weekend / public holiday), re-try with the most recent available rate endpoint: `GET https://api.nbp.pl/api/exchangerates/rates/a/usd/?format=json&last=1`. If still unavailable, mark USD as `null` and surface "Rate unavailable" in the UI.

---

## Decision 2: Historical Portfolio Data Storage

**Decision**: Add a dedicated `portfolio_history` table to SQLite.

**Schema**:
```sql
CREATE TABLE IF NOT EXISTS portfolio_history (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    captured_at     TEXT NOT NULL,
    total_pln       REAL NOT NULL,
    total_usd       REAL,
    exchange_rate   REAL
);
CREATE INDEX IF NOT EXISTS idx_history_time ON portfolio_history (captured_at DESC);
```

**Rationale**:
- The existing `snapshots` table stores full JSON payloads — expensive to re-parse for chart data.
- A separate lightweight table keeps history reads O(n) simple SELECTs.
- Decoupled from snapshot format changes; history remains stable even if payload shape evolves.

**Alternatives considered**:
- Recompute from existing `snapshots` rows on every chart load — works but scans large JSON blobs; brittle if payload schema changes.
- Store exchange rate in the snapshot payload — mixing concerns; harder to query.

---

## Decision 3: Currency Formatting for PLN

**Decision**: Use `toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })`.

**Output example**: `45 320,00 zł`

**Rationale**: The Polish locale formats PLN correctly with space thousand-separator, comma decimal, and `zł` suffix — exactly what a Polish user expects.

**USD display** (for the converted total): Use `toLocaleString('en-US', { style: 'currency', currency: 'USD' })` — standard `$1,234.56` format — since USD is an international reference currency.

---

## Decision 4: Dynamics Chart Type

**Decision**: Area chart (Chart.js `Line` with `fill: true`), one data point per sync.

**Rationale**:
- Chart.js `Line` is already registered in the project (`chart.js` v4, `react-chartjs-2` v5).
- Area fill provides better visual weight for portfolio value trends than a bare line.
- Simple to implement: x = `captured_at` timestamps, y = `total_pln` values.

**When only 1 data point**: Show a single dot with a tooltip; display a subtitle "Sync more often to see trends".

---

## Decision 5: Root Cause of Currency Bugs

Audited all files — specific locations:

| File | Line(s) | Bug |
|------|---------|-----|
| `src/client/components/SummaryCards.tsx` | 7, 21 | `fmt(totalUsd)` defaults to `'USD'`; Total Portfolio card never shows PLN |
| `src/client/components/AllocationChart.tsx` | 76 | Hardcoded `` `$${...}` `` in tooltip callback |
| `src/server/database.ts` | 57 | `totalUsd = t212.total + binance.totalUsd` — adds PLN to USD directly |
| `src/server/routes/sync.ts` | 24 | Same PLN+USD addition for `SyncResult.totalUsd` |
| `src/client/support/types.ts` | 36, 44 | `PortfolioSnapshot.totalUsd` / `SyncResult.totalUsd` are actually PLN totals |
| `src/client/components/StocksTable.tsx` | 8-10 | `fmtNum` omits currency symbol entirely — prices shown as bare numbers |

**StocksTable note**: No `$` symbol appears here (uses `fmtNum` without currency style), but column values for `averagePrice`, `currentPrice`, `ppl`, and `value` have no currency symbol at all. These should show `zł` suffix to be compliant with FR-001.
