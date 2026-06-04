# Quickstart: 003-decouple-ai-analysis

End-to-end verification of the refactored pipeline. Assumes the implementation phase is complete. Run from the repo root with a populated `config.toml` (Trading 212 credentials present).

## Prerequisites

```bash
# Ensure yahoo-finance2 is declared and installed
npm install
grep -q '"yahoo-finance2"' package.json   # MUST exit 0

# DB lives at data/portfolio.db (per src/server/database.ts)
sqlite3 data/portfolio.db '.schema stock_metadata'
# Expected output:
#   CREATE TABLE stock_metadata (
#       ticker      TEXT PRIMARY KEY,
#       sector      TEXT,
#       industry    TEXT,
#       asset_type  TEXT NOT NULL DEFAULT 'Unknown',
#       long_name   TEXT,
#       fetched_at  TEXT NOT NULL
#   );
```

## Step 1 — Lint, type-check, tests (constitution gate)

```bash
npm run lint                 # Biome — MUST pass
npx tsc --noEmit             # Type check — MUST be zero errors
npm test                     # Vitest — MUST pass if tests were added
```

## Step 2 — Smoke-test the Yahoo connector

```bash
npx tsx -e "
import { fetchStockMetadata } from './src/server/connectors/yahoo.ts';
const rows = await fetchStockMetadata(['AAPL_US_EQ', 'VWCE_GY_ETF', 'NONSENSE_XX_EQ']);
console.log(rows);
"
```

Expected:
- `AAPL_US_EQ` → `{ assetType: 'Stock', sector: 'Technology', industry: 'Consumer Electronics', longName: 'Apple Inc.', ... }`
- `VWCE_GY_ETF` → `{ assetType: 'ETF', sector: null, industry: null, longName: /Vanguard FTSE All-World/, ... }`
- `NONSENSE_XX_EQ` → **absent** from the array (per failure semantics in research R4).

## Step 3 — Sync (writes `stock_metadata`)

```bash
npm run dev:server &        # start server in background
SERVER_PID=$!
sleep 2

curl -sS -X POST http://localhost:7788/api/sync | jq .

# Verify stock_metadata populated
sqlite3 data/portfolio.db \
  "SELECT ticker, asset_type, sector, industry FROM stock_metadata ORDER BY ticker;"

kill $SERVER_PID
```

Acceptance:
- `ok: true` and `positions: N` in the response.
- At least one row per held ticker that Yahoo could resolve.
- `asset_type` is one of `ETF | Stock | Unknown` for every row (FR-013).
- No row has `asset_type = ''` or NULL.

## Step 4 — Sync with Yahoo unreachable (resilience, FR-005)

```bash
# Temporarily block Yahoo via /etc/hosts or `iptables`. Re-run sync.
curl -sS -X POST http://localhost:7788/api/sync | jq .
sqlite3 data/portfolio.db "SELECT COUNT(*) FROM stock_metadata;"
```

Acceptance:
- Response is still `ok: true` with positions count and totalPln.
- Server log contains `"Yahoo enrichment skipped"` (or per-ticker warnings).
- `stock_metadata` row count is **unchanged** (previously cached labels preserved — SC-006).

## Step 5 — Analyze (zero outbound calls)

```bash
npm run dev:server &
SERVER_PID=$!
sleep 2

# Capture egress on the spawned claude process for the duration of one analysis
# Quick check: any T212/Yahoo hostname in the SSE stream's behaviour is a regression.
curl -N -sS http://localhost:7788/api/analyze/stream | head -c 4000

kill $SERVER_PID
```

Acceptance:
- First `event: analysis` frame appears within ~3 s (SC-001).
- The `data:` payload parses as JSON conforming to `contracts/analysis-schema.json` — in particular `positions_summary[]` is non-empty and `allocation.by_asset_type[].label` ∈ {`ETF`,`Stock`,`Unknown`}.
- Across two back-to-back runs (no resync in between) `positions_summary` is identical structurally (SC-002).
- The spawn command in `src/server/routes/analyze.ts` contains **no** `--mcp-config` and **no** `--allowedTools` flags (SC-003, FR-007).

## Step 6 — UI verification

```bash
npm run dev:server &
npm run dev:client &
# open http://localhost:5173
```

Manual checks:
1. After clicking sync, the dashboard `AllocationChart` still renders the "by position" donut (snapshot-driven fallback) immediately.
2. Open the AI panel. Within a few seconds, the chart switches to display `by_asset_type` and `by_sector` from the analysis result. Sector totals sum to ~100% (within 1% — SC-004).
3. The new positions table inside `AiPanel` lists every held ticker with columns: ticker | name | type | sector | industry | weight % | P&L %. Unknown values appear as `"Unknown"` text, not blanks (FR-013, SC-007).
4. Weights in the table sum to ~100%.

## Step 7 — Regression check: `/advise` still works (FR-015)

```bash
# Run the existing /advise slash command end-to-end in claude code.
# It uses PROMPTS.advise(), which MUST be untouched in src/server/prompts/index.ts.
git diff main -- src/server/prompts/index.ts | grep -E '^\-' | grep advise
# Expect: no deletions from the advise() body — only additions for analyzeWithData().
```

## Done when

- [ ] All steps above pass.
- [ ] `npm run lint` reports 0 errors.
- [ ] Constitution Check in `plan.md` re-evaluated post-design with no new violations.
- [ ] Spec success criteria SC-001 through SC-008 each have a concrete verification in this quickstart.
