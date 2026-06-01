# Tasks: Currency Fix, USD Conversion & Dashboard Layout

**Input**: Design documents from `specs/001-fix-currency-ui-charts/`

**Prerequisites**: plan.md ✅ · spec.md ✅ · research.md ✅ · data-model.md ✅ · contracts/api.md ✅

**Tests**: Not requested in spec — no test tasks included.

**Organization**: Tasks grouped by user story; foundational phase blocks all stories.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P] tasks in the same phase (different files, no dependencies)
- **[Story]**: User story this task belongs to
- All tasks include exact file paths

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Type and database changes that every user story depends on. No story work can start until this phase is complete.

**⚠️ CRITICAL**: TypeScript types and DB schema must be updated first — all components and server routes reference them.

- [x] T001 Update `src/client/support/types.ts`: rename `PortfolioSnapshot.totalUsd → totalPln`, add `totalUsd: number | null` and `exchangeRate: number | null`; rename `SyncResult.totalUsd → totalPln`, add `totalUsd: number | null`, `exchangeRate: number | null`, `errors.exchangeRate: string | null`; add new `PortfolioHistoryPoint` interface
- [x] T002 Update `src/server/database.ts`: add `portfolio_history` table + index to `getDb()` `exec` block; add `savePortfolioHistory(totalPln, totalUsd, exchangeRate)` function; add `loadPortfolioHistory()` returning `PortfolioHistoryPoint[]`; update `loadLatestSnapshot()` return type to include `totalPln`, `totalUsd: number | null`, `exchangeRate: number | null` (read from most recent `portfolio_history` row)

**Checkpoint**: Types compile, DB schema creates — all story phases can now begin

---

## Phase 3: User Story 1 — Correct Currency Display (Priority: P1) 🎯 MVP

**Goal**: All Trading 212 monetary values show PLN (`zł`) format — no `$` symbol anywhere for T212 data.

**Independent Test**: Start the app after sync, verify the Stocks table, P&L card, Stocks card, and Allocation chart tooltip all show `zł`-formatted values. Grep the rendered HTML for literal `$` signs — expect zero matches for T212 data.

### Implementation for User Story 1

- [x] T003 [P] [US1] Fix `src/client/components/AllocationChart.tsx`: replace hardcoded `` `$${Number(ctx.raw).toFixed(2)}` `` in tooltip callback with `toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 2 })`
- [x] T004 [P] [US1] Fix `src/client/components/StocksTable.tsx`: rename `fmtNum` → `fmtPln`, change to `toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 2 })`; apply to `averagePrice`, `currentPrice`, `ppl`, and `value` columns (leave `quantity` as plain number)
- [x] T005 [P] [US1] Fix `src/client/components/SummaryCards.tsx`: replace single `fmt` function with `fmtPln` (`pl-PL`/`PLN`) and `fmtUsd` (`en-US`/`USD`); update P&L card to `fmtPln(pnl)`; update Stocks card to `fmtPln(t212.summary.total)`; update Total Portfolio card to `fmtPln(data.totalPln)` (USD sub-line comes in US2); keep Crypto card as `fmtUsd(binance.totalUsd ?? 0)`

**Checkpoint**: Zero `$` symbols for T212 monetary values — US1 complete and independently testable

---

## Phase 4: User Story 2 — Total Portfolio in PLN and USD (Priority: P2)

**Goal**: Total Portfolio card shows PLN total + USD equivalent (`≈ $N`), fetched during sync via the NBP exchange rate API.

**Independent Test**: Click Synchronise, verify Total Portfolio card updates with both a PLN figure and a `≈ $` line. Disconnect from the internet (or stub the NBP call to fail), sync again — card shows PLN total + "Rate unavailable" with no crash.

### Implementation for User Story 2

- [x] T006 [US2] Create `src/server/connectors/exchangeRate.ts`: `fetchPlnUsdRate()` async function; primary call `GET https://api.nbp.pl/api/exchangerates/rates/a/usd/today/?format=json`; fallback `GET https://api.nbp.pl/api/exchangerates/rates/a/usd/?format=json&last=1`; parse `response.rates[0].mid`; use `undici` `fetch`; throw on both failures
- [x] T007 [US2] Update `src/server/routes/sync.ts`: import `fetchPlnUsdRate` from `../connectors/exchangeRate.js` and `savePortfolioHistory` from `../database.js`; add third `Promise.allSettled` call for exchange rate; compute `totalPln = t212Data?.summary.total ?? 0`; compute `totalUsd` and `exchangeRate` from settled result (null if failed); call `savePortfolioHistory(totalPln, totalUsd, exchangeRate)` after saving snapshots; update response body to use `totalPln`, `totalUsd`, `exchangeRate`, `errors.exchangeRate`
- [x] T008 [P] [US2] Update `src/client/hooks/usePortfolio.ts`: in `useSync()`, update `result.errors` check to also surface `result.errors.exchangeRate` as a non-fatal warning (keep sync success even if rate unavailable); invalidate portfolio query after sync (already done — verify `totalPln` field rename doesn't break anything)
- [x] T009 [US2] Update `src/client/components/SummaryCards.tsx` Total Portfolio card: add sub-line `data.totalUsd != null ? '≈ ' + fmtUsd(data.totalUsd) : 'Rate unavailable'` below the PLN primary value (depends on T005)

**Checkpoint**: Sync fetches rate, Total Portfolio card shows PLN + USD equivalent — US2 complete

---

## Phase 5: User Story 3 — Investment Dynamics Chart (Priority: P3)

**Goal**: Area chart showing portfolio total PLN over time (one point per sync) displayed beside the Allocation chart.

**Independent Test**: After at least two syncs on different dates, open the dashboard and verify a line/area chart renders with dates on x-axis and PLN totals on y-axis. With zero or one sync, chart shows appropriate empty/single-point state.

### Implementation for User Story 3

- [x] T010 [P] [US3] Add `GET /api/portfolio/history` route to `src/server/routes/portfolio.ts`: import `loadPortfolioHistory` from `../database.js`; add `fastify.get('/api/portfolio/history', ...)` returning `loadPortfolioHistory()`
- [x] T011 [P] [US3] Add `getHistory()` to `src/client/api/portfolio.service.ts`: method `getHistory = (): Promise<PortfolioHistoryPoint[]> => apiClient.get('/api/portfolio/history')`; import `PortfolioHistoryPoint` from `../support/types`
- [x] T012 [US3] Add `usePortfolioHistory()` hook to `src/client/hooks/usePortfolio.ts`: React Query hook calling `portfolioService.getHistory`, stale time 0, `queryKey: ['portfolio', 'history']`; invalidate this key inside `useSync()` after successful sync alongside the portfolio key
- [x] T013 [US3] Create `src/client/components/DynamicsChart.tsx`: register Chart.js `CategoryScale`, `LinearScale`, `PointElement`, `LineElement`, `Filler`, `Tooltip`; prop `history: PortfolioHistoryPoint[]`; empty state (`length === 0`) renders stub-notice "No sync history yet."; single-point state (`length === 1`) renders chart with subtitle; multi-point renders area chart with `fill: true`, accent-colored line/fill, PLN y-axis formatter, short date x-labels

**Checkpoint**: History endpoint live, chart renders correctly for all data states — US3 complete

---

## Phase 6: User Story 4 — Dashboard Layout Redesign (Priority: P4)

**Goal**: Four-row layout: (1) totals cards, (2) allocation + dynamics charts side by side, (3) T212 table full-width, (4) Binance table full-width.

**Independent Test**: On a ≥ 1024 px viewport with data loaded, scroll through the page — four distinct sections appear in order; both tables span the full content width.

### Implementation for User Story 4

- [x] T014 [US4] Update `src/client/styles/_dashboard.scss`: remove `.dashboard__grid` rule; add `.dashboard__charts` (`display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 12px 24px 0;`); add `.dashboard__table` (`padding: 12px 24px 0; overflow-x: auto;`); add `.dynamics-chart` class mirroring `.allocation-chart` structure; change `.dashboard` from `overflow: hidden` to `overflow-y: auto` to allow page scrolling across four rows
- [x] T015 [US4] Rewrite data section in `src/client/pages/DashboardPage.tsx`: replace `<div className="dashboard__grid">` block with four sections: `<SummaryCards>` (Row 1, unchanged); `<div className="dashboard__charts">` containing `<AllocationChart>` and `<DynamicsChart history={history ?? []}>` (Row 2); `<div className="dashboard__table"><StocksTable /></div>` (Row 3); `<div className="dashboard__table"><CryptoTable /></div>` (Row 4); add `usePortfolioHistory()` call at the top of the component

**Checkpoint**: All four rows render correctly, tables span full width — US4 complete

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all changed files.

- [x] T016 [P] Run `npm run lint` and fix any Biome lint/format errors across all changed files (`src/client/support/types.ts`, `src/server/database.ts`, `src/server/connectors/exchangeRate.ts`, `src/server/routes/sync.ts`, `src/server/routes/portfolio.ts`, `src/client/api/portfolio.service.ts`, `src/client/hooks/usePortfolio.ts`, `src/client/components/SummaryCards.tsx`, `src/client/components/AllocationChart.tsx`, `src/client/components/StocksTable.tsx`, `src/client/components/DynamicsChart.tsx`, `src/client/pages/DashboardPage.tsx`, `src/client/styles/_dashboard.scss`)
- [x] T017 [P] Run `npm run build` to verify TypeScript compiles with zero errors; fix any remaining type errors from the `totalUsd`→`totalPln` rename

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No dependencies — start immediately
- **US1 (Phase 3)**: Depends on Phase 2 (T001 types must compile)
- **US2 (Phase 4)**: Depends on Phase 2 (T002 DB functions), and T005 for SummaryCards
- **US3 (Phase 5)**: Depends on Phase 2 (T001 for PortfolioHistoryPoint type, T002 for loadPortfolioHistory)
- **US4 (Phase 6)**: Depends on US3 being complete (DynamicsChart must exist to place in layout)
- **Polish (Phase 7)**: Depends on all phases complete

### User Story Dependencies

- **US1 (P1)**: Can start after T001 — no cross-story deps
- **US2 (P2)**: Depends on T002 (DB) + T005 (SummaryCards PLN format); T006–T008 can start after T002
- **US3 (P3)**: Can start after T001 + T002 independently of US1/US2
- **US4 (P4)**: Depends on T013 (DynamicsChart component must exist)

### Within Each Phase

- Tasks marked [P] can run simultaneously (different files)
- T003, T004, T005 are all [P] — three component files with no cross-dependencies
- T006, T008 are [P] — server connector and client hook are independent
- T010, T011 are [P] — server route and client API service are independent

---

## Parallel Execution Examples

### Phase 3 (US1) — all three tasks in parallel

```
Task T003: Fix AllocationChart.tsx tooltip
Task T004: Fix StocksTable.tsx currency format
Task T005: Fix SummaryCards.tsx PLN formatting
```

### Phase 4 (US2) — T006 and T008 in parallel, then T007, then T009

```
Parallel: T006 (exchangeRate connector) + T008 (useSync hook check)
Then: T007 (sync route, depends on T006 + T002)
Then: T009 (SummaryCards USD line, depends on T005 + T007)
```

### Phase 5 (US3) — T010 and T011 in parallel, then T012, then T013

```
Parallel: T010 (history route) + T011 (getHistory service method)
Then: T012 (usePortfolioHistory hook, depends on T011)
Then: T013 (DynamicsChart component, depends on T012)
```

---

## Implementation Strategy

### MVP First (User Story 1 — just the currency fix)

1. Complete Phase 2: Foundational (T001, T002)
2. Complete Phase 3: US1 (T003, T004, T005)
3. **STOP and VALIDATE**: Open app, verify zero `$` signs on T212 data
4. Deliver/demo the fix

### Incremental Delivery

1. Phase 2 → Foundation ready (types + DB)
2. Phase 3 (US1) → PLN currency display correct ✓
3. Phase 4 (US2) → PLN + USD in Total Portfolio card ✓
4. Phase 5 (US3) → Dynamics chart renders history ✓
5. Phase 6 (US4) → Four-row layout complete ✓
6. Phase 7 → Lint + build pass ✓

---

## Notes

- [P] tasks = different files, no blocking cross-dependencies within the same phase
- T001 types rename will cause TypeScript compile errors in `database.ts` and `SummaryCards.tsx` until those files are also updated — run `tsc --noEmit` only after completing a full phase
- NBP API may return 404 on weekends/holidays for today's rate — the fallback `?last=1` handles this
- The `portfolio_history` table is append-only; the existing `snapshots` table is unchanged
- `DashboardPage.tsx` currently uses `overflow: hidden` on `.dashboard` — this must change to `overflow-y: auto` in T014 for the four-row scroll to work
