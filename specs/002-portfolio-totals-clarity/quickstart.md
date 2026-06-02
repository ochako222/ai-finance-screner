# Quickstart — Manual Verification

After implementation, verify the totals row end-to-end.

## 1. Build and start

```bash
npm run lint          # must pass
npm run build
cosmos                # or: npm start
```

Open http://localhost:7788.

## 2. Trigger a sync

Click the sync button (or run the `/sync` slash command). Watch the server logs — expect one extra log line indicating a `/history/transactions` fetch.

## 3. Inspect the SQLite cache

```bash
sqlite3 ~/.local/share/bubbly-cosmos/portfolio.db \
  "SELECT COUNT(*), SUM(amount) FROM cash_flows;"
```

Should report a non-zero count and a SUM equal to your net contributions.

## 4. Verify the totals row

The top row of the dashboard MUST show three primary cards, in this order:

| Card | Expected |
|------|----------|
| **Invested** | PLN amount equal to the SUM from step 3 |
| **Current Value** | PLN amount equal to the existing "Total Portfolio" figure |
| **P&L** | `Current − Invested` (absolute) plus the percentage; green if ≥ 0, red if < 0 |

A smaller sub-row below the primary cards still shows "Stocks (T212): … · N positions" and "Crypto (Binance): … · M assets".

## 5. Edge cases

- **Stop the network**, then sync. The row should display the stale-data indicator.
- **Hover the Invested card label**. Expect the tooltip: "Net deposits − withdrawals on your trading account."
- **`sqlite3 ... "DELETE FROM cash_flows;"`** then reload the dashboard (without re-syncing). The row should show `Invested = 0,00 zł`, `P&L = +<totalPln>`, percentage cell `—`.

## 6. Regression check

- DynamicsChart still renders.
- AllocationChart still renders.
- `/advise` analysis still streams and shows cost + duration.
- Sync respects T212 rate limits (no HTTP 429 in server logs).
