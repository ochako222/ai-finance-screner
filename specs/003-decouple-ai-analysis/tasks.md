---
description: "Task list for 003-decouple-ai-analysis"
---

# Tasks: Decoupled AI Portfolio Analysis with Enriched Sector Data

**Input**: Design documents from `specs/003-decouple-ai-analysis/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: The spec did not mandate tests. Three high-leverage Vitest unit tests are recommended in `research.md` R11 and are included below as separately-labelled `[TEST]` tasks; skip them if you want strict spec-only scope.

**Organization**: Tasks are grouped by user story (US1–US4 from `spec.md`) so each story can be implemented, tested, and demoed in isolation.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: parallelizable (different files, no dependency on a still-incomplete task)
- **[Story]**: US1 / US2 / US3 / US4 — maps to a user story
- File paths are absolute relative to repo root (`/home/magicalex/Desktop/dev/financial-screener/`)

## Path Conventions

- Server: `src/server/`
- Client: `src/client/`
- Contracts referenced: `specs/003-decouple-ai-analysis/contracts/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Pull in the new dependency. No business logic.

- [X] T001 Add `yahoo-finance2` to `dependencies` in `/home/magicalex/Desktop/dev/financial-screener/package.json` and run `npm install` to refresh `package-lock.json`. Verify `node_modules/yahoo-finance2/package.json` exists.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, DB helpers, type definitions, and the structured-output contract. Every user story depends on these.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Extend the `getDb()` `_db.exec` block in `/home/magicalex/Desktop/dev/financial-screener/src/server/database.ts` to create the `stock_metadata` table per `specs/003-decouple-ai-analysis/contracts/stock_metadata.sql` (idempotent `CREATE TABLE IF NOT EXISTS`).
- [X] T003 In `/home/magicalex/Desktop/dev/financial-screener/src/server/database.ts`, add `export interface StockMetadataRow`, `export function upsertStockMetadata(rows: StockMetadata[]): void`, and `export function loadStockMetadata(tickers: string[]): Map<string, StockMetadataRow>`. The upsert MUST use `INSERT ... ON CONFLICT(ticker) DO UPDATE SET ...` so rows for tickers not present in `rows` are preserved untouched (FR-004). Wrap multi-row upserts in `getDb().transaction(...)` (see existing `saveCashFlows` for the pattern).
- [X] T004 [P] Extend `ANALYSIS_SCHEMA` in `/home/magicalex/Desktop/dev/financial-screener/src/server/prompts/index.ts` to match `specs/003-decouple-ai-analysis/contracts/analysis-schema.json`: add `industry` (`string | null`) and `asset_type` (`enum ['ETF','Stock','Unknown']`, required) to `$defs.PositionPerf`; add top-level required `positions_summary` array; add top-level required `allocation` object with `by_asset_type`, `by_sector`, `by_industry` (each `AllocationBucket[] = { label, weight_pct }[]`). Mark them in the `required` array. **Do NOT touch `PROMPTS.advise()` — its function body MUST remain byte-identical to today** (FR-015).
- [X] T005 [P] Extend `/home/magicalex/Desktop/dev/financial-screener/src/client/support/types.ts` with `AssetType`, `PositionSummary`, `AllocationBucket`, `AnalysisAllocation`; add `industry?: string | null` and `asset_type?: AssetType` to `PositionPerf`; add required `positions_summary: PositionSummary[]` and `allocation: AnalysisAllocation` to `AnalysisResult`. See `data-model.md` for the canonical TypeScript shapes.

**Checkpoint**: Foundation ready — DB has the new table, types compile, schema accepts the new fields. `npx tsc --noEmit` MUST be clean. User-story phases may now begin in parallel.

---

## Phase 3: User Story 1 — Faster, More Consistent AI Analysis (Priority: P1) 🎯 MVP

**Goal**: Move all data acquisition out of the Claude subprocess. Sync resolves every held ticker via Yahoo; analyze loads a cached snapshot, merges in `stock_metadata`, embeds it in the prompt, and spawns Claude with no MCP tools. Analysis is faster, deterministic in classification, and makes zero outbound calls.

**Independent Test**: Sync against a real portfolio. Then `curl -N http://localhost:7788/api/analyze/stream` twice in a row without re-syncing — both runs must produce identical `positions_summary` shape and structural classification, the first `event: analysis` must arrive within ~3 s (SC-001/SC-002), and the spawn command in `analyze.ts` must contain no `--mcp-config` or `--allowedTools` (SC-003).

### Tests for User Story 1 (OPTIONAL — research R11)

- [X] T006 [P] [TEST] [US1] Create `/home/magicalex/Desktop/dev/financial-screener/src/server/connectors/yahoo.test.ts` covering the `t212ToYahoo()` mapping table from `contracts/yahoo-mapping.md` (13 cases) and the `quoteTypeToAssetType()` mapping for `ETF`, `EQUITY`, and any other Yahoo `quoteType` → `Unknown`.

### Implementation for User Story 1

- [X] T007 [P] [US1] Create `/home/magicalex/Desktop/dev/financial-screener/src/server/connectors/yahoo.ts`. Export `interface StockMetadata`, `t212ToYahoo(t212Ticker: string): string` (rules per `contracts/yahoo-mapping.md`), `quoteTypeToAssetType(qt: string | null | undefined): 'ETF' | 'Stock' | 'Unknown'`, and `async function fetchStockMetadata(tickers: string[]): Promise<StockMetadata[]>`. Implementation: lazy-import the default export from `yahoo-finance2`; for each ticker call `yf.quoteSummary(symbol, { modules: ['assetProfile', 'price'] })`; process in batches of 5 via `Promise.allSettled`; `await setTimeout(..., 300)` between batches. Per-ticker rejections are logged as `warn` and the ticker is OMITTED from the returned array (failures MUST NOT pollute the upsert — FR-004).
- [X] T008 [US1] In `/home/magicalex/Desktop/dev/financial-screener/src/server/routes/sync.ts`, after the existing `saveSnapshot('trading212', t212Data)` and the cash-flow block, add a new step: if `t212Data?.positions.length > 0`, call `fetchStockMetadata(t212Data.positions.map(p => p.ticker))` and pass the result to `upsertStockMetadata(...)`. Wrap the whole Yahoo block in `try { ... } catch (err) { fastify.log.warn('Yahoo enrichment skipped: ' + err) }` so a total provider failure cannot abort the sync. Keep the existing 1100 ms T212 pacing unchanged (FR-014).
- [X] T009 [P] [US1] Add `PROMPTS.analyzeWithData(payload: AnalyzePayload): string` to `/home/magicalex/Desktop/dev/financial-screener/src/server/prompts/index.ts` and `export interface AnalyzePayload` (shape from `data-model.md`). The prompt MUST contain the literal sentence `"Do not make any API calls. Analyze only the data provided below."`, then a fenced ```` ```json ```` block with `JSON.stringify(payload, null, 2)`. Reference the structured output requirements (overview / performance / risk / recommendations / watchlist / positions_summary / allocation). Leave the existing `PROMPTS.advise` export untouched.
- [X] T010 [US1] In `/home/magicalex/Desktop/dev/financial-screener/src/server/routes/analyze.ts`:
    1. Remove `buildMcpConfig`, the `api_secret`/`mcp_path` validation block, and from the `spawn('claude', [...])` argument array remove `--strict-mcp-config`, `--mcp-config`, `--allowedTools`, and all three `mcp__trading212__*` tool names.
    2. After `loadLatestSnapshot()`, call the new `loadStockMetadata(snapshot.trading212.positions.map(p => p.ticker))`.
    3. Build `enrichedPositions` via a new pure helper `mergePositionsWithMetadata(positions, byTicker)` (see T011).
    4. Construct an `AnalyzePayload { captured_at, currency: 'PLN', account_summary, invested_pln, pnl_pln, pnl_pct, positions: enrichedPositions }` and pass it to `PROMPTS.analyzeWithData(payload)` in place of `PROMPTS.advise()`.
    5. Leave the SSE event handling (`stream-json` parsing, `result`/`done` events) unchanged.
- [X] T011 [P] [US1] Create `/home/magicalex/Desktop/dev/financial-screener/src/server/lib/mergePositions.ts` exporting `mergePositionsWithMetadata(positions: T212Position[], byTicker: Map<string, StockMetadataRow>): EnrichedPosition[]`. For tickers absent from the map, default `assetType = 'Unknown'`, `sector = null`, `industry = null`, `longName = null`. Compute `pnlPct` as `ppl / (averagePrice * quantity) * 100` (or `0` when denominator is 0). Pure function, no I/O.

**Checkpoint**: User Story 1 is fully functional. `npm run lint` passes, `npx tsc --noEmit` is clean, sync writes `stock_metadata` rows, analyze streams a structured result whose `positions_summary` reflects every held ticker, and the spawn command contains no MCP flags.

---

## Phase 4: User Story 2 — Allocation Breakdown by Asset Type, Sector, and Industry (Priority: P1)

**Goal**: Surface the new `allocation.by_asset_type` and `allocation.by_sector` arrays as charts on the dashboard. The "by position" donut continues to work without an analysis result.

**Independent Test**: After a sync against a portfolio with ≥1 ETF, ≥1 stock, and ≥3 distinct sectors, opening the AI panel shows an asset-type breakdown and a sector breakdown whose weights each sum to within 1% of 100% (SC-004). "Unknown" buckets are labelled, not dropped (FR-013).

### Implementation for User Story 2

- [X] T012 [US2] Refactor `/home/magicalex/Desktop/dev/financial-screener/src/client/components/AllocationChart.tsx` to accept an optional `analysis?: AnalysisResult | null` prop (read from `useAppStore`). Keep today's "by position" donut driven by `data: PortfolioSnapshot`. Replace the "by instrument" donut with two donuts: one fed by `analysis.allocation.by_asset_type` (label = "ETF"/"Stock"/"Unknown") and one fed by `analysis.allocation.by_sector` (top 6 buckets + an "Other" bucket aggregating the remainder). When `analysis` is null, render today's snapshot-derived stock/ETF fallback so the dashboard is never blank.
- [X] T013 [US2] Update the call site in `/home/magicalex/Desktop/dev/financial-screener/src/client/pages/DashboardPage.tsx` (or wherever `<AllocationChart data=...>` is rendered) to also pass `analysis={analysisResult}` from `useAppStore`. If the prop is unused elsewhere this is the only change.
- [X] T014 [P] [US2] Add `.alloc__chart--asset-type` and `.alloc__chart--sector` styles to `/home/magicalex/Desktop/dev/financial-screener/src/client/styles/_dashboard.scss`, using only the colour tokens already in `_variables.scss` (constitution III). No hardcoded hex.

**Checkpoint**: User Stories 1 AND 2 are functional. Opening the AI panel renders two new donuts driven by the structured analysis output; the dashboard pre-analysis still shows the snapshot-derived "by position" donut and a fallback "by instrument" donut.

---

## Phase 5: User Story 3 — Positions Table with Classification Columns (Priority: P2)

**Goal**: Render every held position in a sortable table inside the AI panel with columns `ticker | name | type | sector | industry | weight % | P&L %`. Unknown classifications display the literal text "Unknown".

**Independent Test**: After a sync, opening the AI panel shows a positions table with one row per holding from the latest snapshot, sorted by weight descending, all seven columns populated (or "Unknown" for missing classification), weights sum to ~100% (SC-007).

### Implementation for User Story 3

- [X] T015 [P] [US3] Create `/home/magicalex/Desktop/dev/financial-screener/src/client/components/PositionsTable.tsx` accepting `{ rows: PositionSummary[] }`. Render a `<table>` sorted by `weight_pct` desc with columns: Ticker, Name (`long_name ?? ticker`), Type (`asset_type`), Sector (`sector ?? 'Unknown'`), Industry (`industry ?? 'Unknown'`), Weight % (use existing `fmt(n)` style — locale-formatted with `%`), P&L % (apply `pnlClass(pnl_pct)` from `AiPanel`). Rows where `asset_type === 'Unknown'` get an additional CSS class `positions-table__row--unknown` for muted styling.
- [X] T016 [US3] Wire `<PositionsTable rows={analysisResult.positions_summary} />` into `/home/magicalex/Desktop/dev/financial-screener/src/client/components/AiPanel.tsx` inside `AnalysisView`, immediately after the `Watchlist` section. Guard with `analysisResult.positions_summary.length > 0`.
- [X] T017 [P] [US3] Add `.positions-table`, `.positions-table__row--unknown`, and any column-specific styles to `/home/magicalex/Desktop/dev/financial-screener/src/client/styles/_dashboard.scss` using only `_variables.scss` tokens.

**Checkpoint**: US1 + US2 + US3 all functional. Dashboard delivers narrative analysis, allocation donuts, AND a per-holding table populated from the same structured AI result.

---

## Phase 6: User Story 4 — Resilient Sync When Reference Data Source Is Unavailable (Priority: P2)

**Goal**: Confirm and harden the failure semantics designed into the foundational + US1 work: per-ticker errors and a full Yahoo outage both leave the existing `stock_metadata` cache intact and let the rest of the sync complete.

**Independent Test**: With Yahoo blocked at the network layer, `POST /api/sync` returns `ok: true`, the server log contains `"Yahoo enrichment skipped"`, and `SELECT COUNT(*) FROM stock_metadata` is unchanged from before the sync (SC-006).

### Tests for User Story 4 (OPTIONAL — research R11)

- [X] T018 [P] [TEST] [US4] Create `/home/magicalex/Desktop/dev/financial-screener/src/server/database.test.ts` (or extend the existing one if present) with three cases for `upsertStockMetadata` + `loadStockMetadata`: (a) insert two rows then read them back; (b) upsert one ticker and assert the OTHER ticker's `fetched_at` is unchanged; (c) load tickers that were never inserted and verify they are absent from the returned `Map` (caller must default to `'Unknown'`).

### Implementation for User Story 4

- [X] T019 [US4] Audit `/home/magicalex/Desktop/dev/financial-screener/src/server/routes/sync.ts` to ensure the Yahoo block added in T008 is wrapped in `try { ... } catch (err) { fastify.log.warn(...) }` AND that the catch does NOT touch `stock_metadata` (no `DELETE`, no `UPDATE`). If T008 already meets this, the task is verification only — record the check in the PR description.
- [X] T020 [US4] Audit `/home/magicalex/Desktop/dev/financial-screener/src/server/connectors/yahoo.ts` to confirm `Promise.allSettled` is used (not `Promise.all`) so a single ticker's rejection cannot crash the batch, and that rejected tickers are simply not present in the returned array. If T007 already meets this, the task is verification only.
- [X] T021 [US4] Add a one-line log in `src/server/routes/sync.ts` after the Yahoo block (`fastify.log.info('Yahoo enrichment: refreshed N tickers')`) so the operator can see at a glance how many rows were touched per sync (supports manual quickstart Step 4).

**Checkpoint**: All four user stories independently functional. Sync is robust to provider outages; analysis pipeline is fully decoupled.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T022 Update `/home/magicalex/Desktop/dev/financial-screener/config.example.toml` with a short comment above `trading212.api_secret` and `trading212.mcp_path` noting they are no longer required by `/api/analyze/stream` (kept for backward compatibility / other flows).
- [X] T023 [P] Run `npm run lint` from repo root — MUST report zero errors (constitution I). Fix any Biome findings introduced by this change.
- [X] T024 [P] Run `npx tsc --noEmit` from repo root — MUST be clean. Fix any type errors introduced by the new interfaces.
- [X] T025 Execute every step of `specs/003-decouple-ai-analysis/quickstart.md` against a real sync. Tick each acceptance bullet. If any step fails, return to the relevant phase before reporting done.
- [X] T026 Verify the `/advise` slash command (`.claude/commands/advise.md`) still functions on a representative portfolio (FR-015). The check is observational — produce a non-empty response — and confirms `PROMPTS.advise()` was not regressed.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately.
- **Phase 2 (Foundational)**: Depends on T001. T002 and T003 are sequential (same file); T004 and T005 can run in parallel with T002/T003 because they touch different files.
- **Phase 3 (US1)**: Depends on Phase 2 complete. **MVP target.**
- **Phase 4 (US2)**: Depends on Phase 2 complete; can run in parallel with US3 once US1 is delivering structured results (or in parallel with US1 if the consumer uses the contract directly).
- **Phase 5 (US3)**: Depends on Phase 2 complete; can run in parallel with US2.
- **Phase 6 (US4)**: Depends on T007 + T008 (audit tasks examine code authored there). T018 (test-only) can run as soon as Phase 2 is done.
- **Phase 7 (Polish)**: Depends on every user story whose acceptance is being validated by the quickstart step.

### Within Each User Story

- Tests (where included) MUST be written and fail before implementation (TDD per constitution II).
- Server foundation before server route changes.
- Server changes before client changes.
- Each story is independently shippable behind the existing UI.

### Parallel Opportunities

- T004 ‖ T005 (different files in Phase 2).
- T006 ‖ T007 (test ‖ connector — same module pair, different files).
- T007 ‖ T009 ‖ T011 (connector, prompt, merge helper — three different files).
- T012 ‖ T014 (component change ‖ SCSS).
- T015 ‖ T017 (new component ‖ SCSS).
- T018 (test) can start as soon as T003 is done.
- T023 ‖ T024 (lint and tsc are independent).

---

## Parallel Example: User Story 1

```bash
# After Phase 2, three implementation tasks can be authored in parallel:
Task T007: "Create src/server/connectors/yahoo.ts with t212ToYahoo + fetchStockMetadata"
Task T009: "Add PROMPTS.analyzeWithData to src/server/prompts/index.ts"
Task T011: "Create src/server/lib/mergePositions.ts with mergePositionsWithMetadata"

# Optional Vitest test for the mapper can be authored simultaneously:
Task T006: "Add src/server/connectors/yahoo.test.ts covering the t212ToYahoo table"
```

T008 (sync route) and T010 (analyze route) come AFTER T007/T009/T011 because they consume those exports.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (T001).
2. Phase 2 (T002–T005).
3. Phase 3 (T006–T011).
4. STOP and validate via `quickstart.md` Steps 1, 2, 3, 5, 7.
5. Demo: faster, deterministic AI analysis with zero live calls during analyze. This alone is a shippable improvement.

### Incremental Delivery

1. Phase 1 + 2 + 3 → MVP (US1) → ship.
2. Add Phase 4 (US2 — allocation donuts) → ship.
3. Add Phase 5 (US3 — positions table) → ship.
4. Add Phase 6 (US4 — verify resilience) → ship.
5. Phase 7 polish runs before each ship boundary.

### Parallel Team Strategy

With multiple developers:

1. One developer completes Phase 1 + 2.
2. Once foundational is done:
    - Developer A: Phase 3 (US1) — server-heavy.
    - Developer B: Phase 4 + 5 (US2 + US3) — client-heavy; can build against the schema contract before US1 ships by mocking `analysisResult`.
    - Developer C: Phase 6 (US4) — focused on integration tests + sync-route audit.
3. All converge on Phase 7 polish.

---

## Notes

- `[P]` = different files, no incomplete-task dependency.
- `[Story]` = traceability back to a spec user story (US1–US4).
- `[TEST]` = optional Vitest task — skip these if you want strict spec-only scope; they are recommended in `research.md` R11.
- `PROMPTS.advise()` MUST NOT be modified (FR-015). Any diff touching its body fails the constitution check.
- Commit at each Checkpoint or after each task; constitution development workflow requires `npm run lint` clean before merge.
