# Implementation Plan: Decoupled AI Portfolio Analysis with Enriched Sector Data

**Branch**: `003-decouple-ai-analysis` | **Date**: 2026-06-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-decouple-ai-analysis/spec.md`

## Summary

Move all data acquisition for AI portfolio analysis out of the Claude subprocess and into the sync path. During `POST /api/sync`, in addition to the existing Trading 212 holdings + cash-flows fetch, the server resolves each held ticker against Yahoo Finance and upserts a row in a new `stock_metadata` SQLite table (`ticker` PK; `sector`, `industry`, `asset_type`, `long_name`, `fetched_at`). `GET /api/analyze/stream` then loads the latest snapshot, joins it with `stock_metadata`, serialises the enriched payload into the Claude prompt as a literal JSON block, and spawns Claude **without** `--mcp-config` or `--allowedTools`. Claude returns a structured response (`--json-schema`) that adds `industry` and `asset_type` to per-position entries plus two new top-level fields: `positions_summary[]` and `allocation { by_asset_type, by_sector, by_industry }`. The dashboard's `AllocationChart` switches from the locally-derived stock/ETF split to the new `allocation` payload, and a new positions table inside `AiPanel` renders the per-holding breakdown. `PROMPTS.advise()` and the `/advise` slash command are left untouched.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js (current LTS), ESM modules (`"type": "module"`).

**Primary Dependencies**: Fastify 5, better-sqlite3 12, undici 7, smol-toml 1 (server); React 19, Zustand 5, @tanstack/react-query 5, react-chartjs-2 5, Vite 6, Sass (client). New: `yahoo-finance2` (already in `node_modules/`; must be added to `package.json` `dependencies` as part of this work).

**Storage**: SQLite via `better-sqlite3` at `data/portfolio.db` (existing). One new table: `stock_metadata`. Existing tables (`snapshots`, `portfolio_history`, `cash_flows`) unchanged.

**Testing**: Vitest (already configured). Unit-test the new ticker mapper (`t212ToYahoo`) and the merge function that joins positions with metadata. Connector integration test optional — mocked HTTP layer per constitution II if added.

**Target Platform**: Local single-user web app served by Fastify on `http://localhost:7788`. Modern desktop browsers (Chromium/Firefox).

**Project Type**: Web application (`src/server/` Fastify backend + `src/client/` React SPA).

**Performance Goals**:
- AI analysis first SSE event within 3 s (constitution IV; spec SC-001).
- Sync wall-clock for ≤100 holdings: Yahoo enrichment adds no more than `ceil(N/5) * 300 ms` of pacing — under 6 s for 100 holdings, well within the same order of magnitude as today's T212 fetch (spec SC-006).

**Constraints**:
- T212 rate limits unchanged: account summary 1 req/5 s, positions 1 req/1 s, existing `1100 ms` pause preserved (constitution IV; spec FR-014).
- Yahoo Finance: concurrency = 5, 300 ms inter-batch delay; per-ticker failures degrade gracefully (spec FR-004/FR-005).
- AI agent makes zero outbound calls during `/api/analyze/stream` — `--mcp-config` and `--allowedTools` must be removed from the spawn (spec FR-007).
- PLN remains primary display currency (spec FR-016).
- `PROMPTS.advise()` signature and behaviour preserved; `/advise` slash command unaffected (spec FR-015).

**Scale/Scope**: One user, one brokerage, <100 holdings. No pagination needed for `stock_metadata`. Single-process Node server.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate question | Status |
|-----------|--------------|--------|
| I. Code Quality & Type Safety | Are all new types defined in `src/client/support/types.ts` or server interfaces? Does Biome pass? | [x] Plan: `StockMetadata`, `EnrichedPosition`, `AnalysisAllocation`, `PositionSummary` added to `support/types.ts` (mirrored as server interfaces in `connectors/yahoo.ts` / `database.ts`). `npm run lint` is a gating step in the quickstart. |
| II. Testing Standards | If tests requested: are tests written before implementation? Are connectors integration-tested in isolation? | [x] The user did not request tests in the spec. Vitest unit tests for `t212ToYahoo` mapper and `mergePositionsWithMetadata` are recommended in research.md (low cost, high regression value) but are NOT MUST per spec. Yahoo connector is structurally testable via an injectable client. |
| III. UX Consistency | Are loading/error/empty states handled? Are currency values locale-formatted? Are SCSS variables used? | [x] `AiPanel` already handles loading/error/empty for the analysis. New positions table uses existing `fmt()` helper and adds SCSS in `_dashboard.scss` keyed off `_variables.scss` colour tokens. `AllocationChart` continues to use existing palette constants. |
| IV. Performance & Reliability | Are rate limits respected (T212: 1req/5s account, 1req/1s positions)? Is cache used as primary read path? | [x] T212 pacing untouched. Yahoo pacing: 5-wide batches, 300 ms gap. `/api/analyze/stream` is **cache-only** (no live calls). `loadLatestSnapshot()` + `loadStockMetadata(tickers)` are the sole read path. |
| V. Layered Architecture | Does the feature stay in the correct layer? Is all AI prompt text in `src/server/prompts/index.ts`? | [x] Yahoo connector lives in `src/server/connectors/yahoo.ts`. SQLite helpers in `src/server/database.ts`. New `PROMPTS.analyzeWithData(payload)` added to `src/server/prompts/index.ts`. Browser receives the structured analysis result only — never calls Yahoo or T212 directly. |

**Result**: PASS. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/003-decouple-ai-analysis/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── stock_metadata.sql       # SQLite DDL
│   ├── analysis-schema.json     # New ANALYSIS_SCHEMA JSON Schema
│   └── yahoo-mapping.md         # T212 → Yahoo ticker rules + quoteType → asset_type
├── checklists/
│   └── requirements.md  # spec quality gate (already passing)
└── tasks.md             # /speckit-tasks output (NOT created here)
```

### Source Code (repository root)

```text
src/
├── server/
│   ├── connectors/
│   │   ├── trading212.ts            # unchanged
│   │   ├── binance.ts               # unchanged (stub)
│   │   ├── exchangeRate.ts          # unchanged
│   │   └── yahoo.ts                 # NEW — fetchStockMetadata(tickers): Promise<StockMetadata[]>
│   ├── routes/
│   │   ├── sync.ts                  # CHANGED — invoke yahoo.fetchStockMetadata after T212; call upsertStockMetadata
│   │   ├── analyze.ts               # CHANGED — strip --mcp-config + --allowedTools; build enriched payload; use PROMPTS.analyzeWithData
│   │   └── portfolio.ts             # unchanged
│   ├── prompts/
│   │   └── index.ts                 # CHANGED — add PROMPTS.analyzeWithData(payload); extend ANALYSIS_SCHEMA; KEEP PROMPTS.advise() identical
│   ├── database.ts                  # CHANGED — add stock_metadata DDL, upsertStockMetadata(rows), loadStockMetadata(tickers)
│   ├── config.ts                    # unchanged
│   └── index.ts                     # unchanged
└── client/
    ├── components/
    │   ├── AllocationChart.tsx      # CHANGED — read allocation.by_asset_type + allocation.by_sector from latest AnalysisResult; keep "by position" donut from snapshot
    │   ├── AiPanel.tsx              # CHANGED — render new <PositionsTable result={...} /> below Recommendations
    │   ├── PositionsTable.tsx       # NEW — ticker | name | type | sector | industry | weight % | P&L %
    │   └── ... (other components unchanged)
    ├── support/
    │   └── types.ts                 # CHANGED — extend PositionPerf, add PositionSummary, AnalysisAllocation, extend AnalysisResult
    ├── store/appStore.ts            # unchanged
    └── styles/
        └── _dashboard.scss          # CHANGED — add .positions-table styles using $variables
```

**Structure Decision**: The project is a Web application following the established Bubbly Cosmos layout (server + client siblings under `src/`). No new top-level directories. All additions are co-located with existing peers (`connectors/`, `components/`). The Yahoo connector and the `stock_metadata` table are introduced as additive seams that do not perturb existing read paths — every existing endpoint continues to work even if Yahoo is unavailable, by Constitution principle IV (cache-first).

## Complexity Tracking

> No constitution violations. Section intentionally empty.
