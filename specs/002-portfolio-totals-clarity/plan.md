# Implementation Plan: Portfolio Totals Clarity

**Branch**: `002-portfolio-totals-clarity` | **Date**: 2026-06-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-portfolio-totals-clarity/spec.md`

## Summary

Refactor the dashboard's totals row so the user can answer three questions at a glance: (1) how much money have I put in, (2) what is it worth now, (3) what is the absolute and percentage P&L. Today the row shows four cards — *Total Portfolio*, *Total P&L*, *Stocks (T212)*, *Crypto (Binance)* — where "Total Portfolio" and "Stocks (T212)" are duplicates, and "P&L" displays only the broker's *unrealized* result on currently open positions, not the difference between net contributed capital and current account equity.

Technical approach: replace the four current cards with three primary cards (**Invested** / **Current Value** / **P&L**) plus the existing per-account breakdown moved below. "Invested" becomes net contributed capital (deposits − withdrawals), sourced from the Trading 212 `/history/transactions` endpoint (currently unused) and cached in SQLite. The Binance stub continues to contribute zero until the connector lands.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js (current LTS), React 19, Vite

**Primary Dependencies**: Fastify, undici (server HTTP), better-sqlite3, Zustand, React Query, SCSS, Chart.js (already in use)

**Storage**: SQLite at `~/.local/share/bubbly-cosmos/portfolio.db` — add a `cash_flows` table for deposits/withdrawals so "Invested" survives broker rate-limit windows.

**Testing**: Vitest + RTL (per constitution); tests OPTIONAL for this feature, but the new cash-flow aggregation utility is small and pure — a unit test is cheap and recommended.

**Target Platform**: Local Fastify server (`:7788`) + browser SPA

**Project Type**: Web application (React client + Fastify server) — Option 2 layout

**Performance Goals**: Totals row renders in < 100 ms from cache; updates within 2 s of sync completion (SC-004).

**Constraints**:
- T212 rate limits: account summary ≤ 1 req/5 s, positions ≤ 1 req/1 s, transactions endpoint TBD in research (typically 1 req/30 s). Sync MUST respect them.
- Cache-first: dashboard MUST render from SQLite, never block on live API.

**Scale/Scope**: Single user, single Trading 212 account, < 100 lifetime transactions expected. No pagination concerns.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate question | Status |
|-----------|--------------|--------|
| I. Code Quality & Type Safety | New `CashFlow` and extended `T212Summary` types added to `src/server/connectors/trading212.ts` + mirrored in `src/client/support/types.ts`. No `any` in client. Biome passes. | [x] PASS |
| II. Testing Standards | Tests OPTIONAL per spec. Pure cash-flow aggregator gets a Vitest unit test. T212 transactions fetcher uses the existing connector pattern; integration test deferred until Binance lands. | [x] PASS |
| III. UX Consistency | Reuses existing `.card` SCSS, existing positive/negative classes, `Intl.NumberFormat` for PLN. Loading/error/stale states explicit. No new colors. | [x] PASS |
| IV. Performance & Reliability | New `/history/transactions` call gated behind sync action only; 1100 ms sleep between T212 calls preserved; results cached in SQLite as primary read path. | [x] PASS |
| V. Layered Architecture | Cash-flow fetch lives in `src/server/connectors/trading212.ts`; aggregation in server; client only consumes the typed snapshot. No AI prompt changes. | [x] PASS |

All gates pass. No entries in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-portfolio-totals-clarity/
├── plan.md              # This file
├── research.md          # Phase 0 — net contributed capital sourcing
├── data-model.md        # Phase 1 — cash_flows table + extended snapshot
├── quickstart.md        # Phase 1 — manual verification steps
├── contracts/
│   └── portfolio-snapshot.md  # Shape of /api/portfolio response
└── checklists/
    └── requirements.md  # From /speckit-specify
```

### Source Code (repository root)

```text
src/server/
├── connectors/
│   └── trading212.ts          # CHANGE: add fetchT212CashFlows()
├── database.ts                # CHANGE: cash_flows table + read helpers
├── routes/
│   ├── sync.ts                # CHANGE: persist cash flows during sync
│   └── portfolio.ts           # CHANGE: include `invested` (net) + `pnl` in snapshot
└── prompts/index.ts           # UNCHANGED

src/client/
├── components/
│   ├── SummaryCards.tsx       # REWRITE: 3 primary cards (Invested/Current/P&L) + sub-row
│   ├── DynamicsChart.tsx      # UNCHANGED
│   └── AllocationChart.tsx    # UNCHANGED
├── styles/
│   └── _summary.scss          # CHANGE: minor layout for 3-card primary row + sub-row
├── support/types.ts           # CHANGE: extend PortfolioSnapshot with investedPln/pnlPln/pnlPct
└── api/portfolio.service.ts   # UNCHANGED (typed response auto-updates)
```

**Structure Decision**: Existing web-app layout. All changes are localized — no new directories, no new top-level files.

## Detailed Change Plan — What Changes, What Stays

### What stays unchanged

- **Routing, layout shell, sidebar, sync action button** — purely a card-content refactor.
- **DynamicsChart, AllocationChart, positions table, AI streaming, /advise**.
- **Trading 212 account/summary and positions calls** — left exactly as they are.
- **Binance stub** — still returns `{ assets: [], totalUsd: 0, note: ... }`. The new Invested figure includes only T212 contributions for now; when Binance lands it will add its own net contributions to the same field.
- **All prompts in `src/server/prompts/index.ts`**.
- **PLN as primary display currency, USD secondary** — already correct per existing convention.
- **Sync rate-limit discipline** — `1100 ms` sleep between T212 calls is preserved, with the new transactions call appended after positions (so at least one more sleep is added).
- **Existing card SCSS / positive-negative color tokens** — reused.

### What changes

1. **Connector (`src/server/connectors/trading212.ts`)**
   - Add `fetchT212CashFlows()` that calls `GET /history/transactions` (paginated; cursor-based per Trading 212 docs — see research.md), returning `CashFlow[]` with `{ id, dateTime, type, amount, currency }`.
   - Export `CashFlow` interface.
   - `fetchT212()` signature unchanged; sync orchestrates calling both, with the 1100 ms sleep between calls.

2. **Database (`src/server/database.ts`)**
   - Add table:
     ```sql
     CREATE TABLE IF NOT EXISTS cash_flows (
       id TEXT PRIMARY KEY,
       captured_at TEXT NOT NULL,
       date_time TEXT NOT NULL,
       type TEXT NOT NULL,    -- DEPOSIT | WITHDRAWAL
       amount REAL NOT NULL,  -- in account currency, positive for deposits, negative for withdrawals
       currency TEXT NOT NULL
     );
     ```
   - Add `saveCashFlows(rows: CashFlow[])` (INSERT OR IGNORE on `id`) and `getNetContributedCapital(): { amount: number; currency: string }`.
   - No migration system needed — `CREATE TABLE IF NOT EXISTS` covers cold start; existing portfolio.db gets the new table on next launch.

3. **Sync route (`src/server/routes/sync.ts`)**
   - After T212 positions fetch + sleep, call `fetchT212CashFlows()` and `saveCashFlows(...)`.
   - Persist the computed `investedPln` and `pnlPln` into the same `portfolio_history` row written today, so the dynamics chart can later show invested-over-time without a second pass (additive — does not break existing reads).

4. **Portfolio route + snapshot type (`src/server/routes/portfolio.ts`, `src/client/support/types.ts`)**
   - Extend `PortfolioSnapshot` with:
     ```ts
     investedPln: number;   // net contributed capital, converted to PLN
     pnlPln: number;        // totalPln - investedPln
     pnlPct: number | null; // null when investedPln === 0
     ```
   - `pnlPct` is `null` (not `NaN`) when `investedPln === 0`; the client renders `—`.

5. **Frontend (`src/client/components/SummaryCards.tsx`)**
   - Replace the four current cards with a **primary row of three cards**:
     | Card | Value | Sub-label |
     |------|-------|-----------|
     | Invested | `fmtPln(investedPln)` | "Net deposits" + stale indicator if any |
     | Current Value | `fmtPln(totalPln)` | `≈ fmtUsd(totalUsd)` |
     | P&L | `±fmtPln(pnlPln)` (color-coded) | `±pnlPct%` or `—` |
   - Add a smaller **secondary sub-row** showing the per-account breakdown ("Stocks (T212): X PLN · N positions" / "Crypto (Binance): $Y · M assets") so the existing information is not lost, just demoted.
   - Add an info tooltip on **Invested** explaining "deposits − withdrawals on your trading account".
   - When the snapshot's `capturedAt` is older than the staleness threshold (1 hour) or the most recent sync errored, dim the row and show a small "stale" badge — uses existing visual tokens.

6. **SCSS (`src/client/styles/_summary.scss`)**
   - Promote the three primary cards (larger value font, tighter grid). Demote the per-account sub-row (smaller, single line). No new color variables.

### Trade-offs noted

- "Invested" as **net contributed capital** intentionally diverges from T212's own `investments.totalCost` field (which only reflects open positions' cost basis). This matches the user's mental model — see spec Assumptions. Realized gains on closed positions remain "in" Current Value via the cash balance, so `Current − Invested` still captures total return.
- The transactions endpoint is rate-limited; we fetch it only on explicit sync, never on dashboard load.
- US3 (realized vs. unrealized split) is **out of scope** for this plan. It can be added later by joining `cash_flows` (dividends, fees) with the existing positions data — no schema break required.

## Complexity Tracking

> Constitution Check passed without violations. No entries.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
