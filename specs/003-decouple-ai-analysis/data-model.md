# Phase 1 Data Model: Decoupled AI Analysis

**Feature**: `003-decouple-ai-analysis`
**Date**: 2026-06-04

## Persisted entities (SQLite)

### `stock_metadata` *(NEW)*

| Column       | Type | Null | Notes |
|--------------|------|------|-------|
| `ticker`     | TEXT | NO   | Primary key. The **T212 ticker** as stored on the position (e.g. `AAPL_US_EQ`, `VWCE_GY_ETF`). Not the Yahoo symbol. |
| `sector`     | TEXT | YES  | e.g. `"Technology"`. NULL when Yahoo had no `assetProfile.sector` (common for ETFs). |
| `industry`   | TEXT | YES  | e.g. `"Software—Infrastructure"`. NULL when not provided. |
| `asset_type` | TEXT | NO   | `"ETF" \| "Stock" \| "Unknown"`. Default `"Unknown"`. Derived from Yahoo `price.quoteType`: `"ETF"→"ETF"`, `"EQUITY"→"Stock"`, everything else (or fetch failure with no prior row) → `"Unknown"`. |
| `long_name`  | TEXT | YES  | Yahoo `price.longName` or `price.shortName`. Displayed in the positions table. |
| `fetched_at` | TEXT | NO   | ISO-8601 UTC timestamp of the successful Yahoo fetch that wrote this row. |

**Invariants**
- `ticker` is unique (PK).
- `asset_type` ∈ {`"ETF"`, `"Stock"`, `"Unknown"`} (enforced at app layer).
- A row is **only written** if the Yahoo fetch for that ticker succeeded; failed fetches MUST NOT overwrite an existing row (FR-004).
- `fetched_at` is monotonic per-row only when the row is rewritten; older rows for retired tickers are tolerated.

**Lifecycle**
1. Created/updated by `upsertStockMetadata(rows: StockMetadata[])` during `POST /api/sync`, after the T212 positions fetch succeeds.
2. Read by `loadStockMetadata(tickers: string[])` during `GET /api/analyze/stream`.
3. Never deleted by the application. (Manual cleanup is acceptable; not in scope.)

### Unchanged tables

`snapshots`, `portfolio_history`, `cash_flows` — schema and semantics are preserved exactly as today. The analyze endpoint continues to consume the latest `snapshots` row via `loadLatestSnapshot()`.

---

## Server-side TypeScript interfaces

### In `src/server/connectors/yahoo.ts` *(NEW)*

```ts
export interface StockMetadata {
    ticker: string;          // T212 ticker (PK in DB)
    sector: string | null;
    industry: string | null;
    assetType: 'ETF' | 'Stock' | 'Unknown';
    longName: string | null;
    fetchedAt: string;       // ISO timestamp
}

export function t212ToYahoo(t212Ticker: string): string;

export async function fetchStockMetadata(
    tickers: string[]
): Promise<StockMetadata[]>;
```

`fetchStockMetadata` returns one entry per **successfully resolved** ticker. Tickers that failed are absent from the returned array; the caller (`sync.ts`) does not need to know which failed — `upsertStockMetadata` will only refresh the rows it receives.

### In `src/server/database.ts`

```ts
export interface StockMetadataRow {
    ticker: string;
    sector: string | null;
    industry: string | null;
    asset_type: 'ETF' | 'Stock' | 'Unknown';
    long_name: string | null;
    fetched_at: string;
}

export function upsertStockMetadata(rows: StockMetadata[]): void;
export function loadStockMetadata(tickers: string[]): Map<string, StockMetadataRow>;
```

`loadStockMetadata` is keyed on the **T212 ticker** so the caller can do `byTicker.get(position.ticker) ?? null` without ambiguity.

---

## In-memory entities (not persisted)

### `EnrichedPosition` *(server only, built per analyze call)*

```ts
interface EnrichedPosition {
    ticker: string;                 // T212 ticker
    longName: string | null;        // display
    quantity: number;
    averagePrice: number;
    currentPrice: number;
    value: number;                  // PLN
    ppl: number;                    // PLN
    pnlPct: number;                 // computed: ppl / (averagePrice * quantity) * 100
    sector: string | null;
    industry: string | null;
    assetType: 'ETF' | 'Stock' | 'Unknown';
}
```

Built by `mergePositionsWithMetadata(positions: T212Position[], byTicker: Map<string, StockMetadataRow>)`. Pure function — easy to test in isolation.

### `AnalyzePayload` *(server only, serialised into the Claude prompt)*

```ts
interface AnalyzePayload {
    captured_at: string;
    currency: 'PLN';
    account_summary: {
        total: number;
        cash: number;
        invested: number;
        result: number;
    };
    invested_pln: number;
    pnl_pln: number;
    pnl_pct: number | null;
    positions: EnrichedPosition[];
}
```

No identifiers, no secrets — safe to embed verbatim in a model prompt.

---

## Client-side TypeScript interfaces

### Additions to `src/client/support/types.ts`

```ts
export type AssetType = 'ETF' | 'Stock' | 'Unknown';

export interface PositionSummary {
    ticker: string;
    long_name?: string | null;
    asset_type: AssetType;
    sector: string | null;
    industry: string | null;
    weight_pct: number;
    pnl_pct: number;
}

export interface AllocationBucket {
    label: string;          // sector name, industry name, or AssetType
    weight_pct: number;
}

export interface AnalysisAllocation {
    by_asset_type: AllocationBucket[];
    by_sector: AllocationBucket[];
    by_industry: AllocationBucket[];
}
```

### Extensions to existing interfaces

```ts
export interface PositionPerf {
    ticker: string;
    sector?: string | null;
    industry?: string | null;        // NEW
    asset_type?: AssetType;          // NEW
    pnl_pct: number;
    pnl_value?: number;
}

export interface AnalysisResult {
    // ... existing fields unchanged
    positions_summary: PositionSummary[];   // NEW (required)
    allocation: AnalysisAllocation;         // NEW (required)
}
```

The optionals on `PositionPerf.industry` / `asset_type` are a deliberate concession to client-side resilience: an old cached `AnalysisResult` shape (pre-refactor) should still render without crashing. Inside the schema the fields are required; the optional `?` is a transitional safety net for the React renderer only.

---

## Relationships

```text
T212 Position (per-snapshot)  ─┐
                                ├─►  EnrichedPosition (in-memory)  ──►  AnalyzePayload  ──►  Claude  ──►  AnalysisResult
stock_metadata (per ticker)   ─┘                                                              │
                                                                                              ├─► AnalysisAllocation (charts)
                                                                                              └─► PositionSummary[]  (positions table)
```

`stock_metadata` is the only new persisted shape. Everything downstream is either a pure derivation or a structured AI output described by `contracts/analysis-schema.json`.
