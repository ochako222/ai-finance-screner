# Contract: `GET /api/portfolio`

The portfolio snapshot endpoint already exists. This feature **extends** the response shape with three additional fields. All existing fields are preserved.

## Response (additions in bold)

```ts
interface PortfolioSnapshot {
  trading212: {
    summary: { cash: number; invested: number; total: number; result: number; currency: string };
    positions: T212Position[];
  };
  binance: { assets: BinanceAsset[]; totalUsd: number; note?: string };
  totalPln: number;
  totalUsd: number | null;
  exchangeRate: number | null;
  capturedAt: string;

  // NEW
  investedPln: number;        // net contributed capital across all accounts, in PLN
  pnlPln: number;             // totalPln - investedPln
  pnlPct: number | null;      // null when investedPln === 0
}
```

## Compatibility

- Adding fields is backwards-compatible — existing clients ignore unknown keys.
- `trading212.summary.invested` (cost basis of open positions) is **kept** and unchanged. The new `investedPln` is a separate, top-level field with different semantics (net contributed capital). They are not interchangeable.

## Error semantics

- If `cash_flows` is empty (first sync hasn't run yet, or fetch failed), `investedPln` = `0`, `pnlPln` = `totalPln`, `pnlPct` = `null`. The UI renders the staleness indicator and a "—" in the percentage cell.
