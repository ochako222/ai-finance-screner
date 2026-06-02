---
description: "Task list for Portfolio Totals Clarity refactor"
---

# Tasks: Portfolio Totals Clarity

**Input**: Design documents in `specs/002-portfolio-totals-clarity/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/portfolio-snapshot.md

**Tests**: Tests are OPTIONAL for this feature. One small Vitest unit test is recommended for the pure cash-flow aggregation utility (T009). All other verification is manual via `quickstart.md`.

**Organization**: Tasks grouped by user story. US1 is the MVP — completing Phase 1 + 2 + 3 delivers the user's full ask.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 / US2 / US3 — maps to user stories from spec.md
- Web-app layout per plan.md: `src/server/` and `src/client/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Pre-flight verification — no scaffolding needed; the project, deps, and lint config already exist.

- [X] T001 Confirm clean baseline: run `npm run lint` and `npm run build` and ensure both pass on `002-portfolio-totals-clarity` before any edits.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Data layer that every user story depends on — cash-flow storage and the connector that populates it. **Blocks all user stories.**

- [X] T002 Add `cash_flows` table + index to schema initialization in `src/server/database.ts` (per data-model.md). Use `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`; no migration framework needed.
- [X] T003 [P] Add `saveCashFlows(rows: CashFlow[])` helper in `src/server/database.ts` using `INSERT OR IGNORE` on `id`.
- [X] T004 [P] Add `getNetContributedCapital(): { amountPln: number }` helper in `src/server/database.ts` that sums all `cash_flows.amount`, FX-converting non-PLN rows via existing `exchangeRate.ts` utilities.
- [X] T005 Export `CashFlow` interface and add `fetchT212CashFlows(): Promise<CashFlow[]>` in `src/server/connectors/trading212.ts`. Map `GET /history/transactions` rows, keep only `DEPOSIT`/`WITHDRAWAL` types, negate amounts for withdrawals.
- [X] T006 In `src/server/routes/sync.ts`, after the existing T212 positions fetch and 1100 ms sleep, call `fetchT212CashFlows()` and persist via `saveCashFlows()`. Surface any error in the existing `errors.trading212` channel without aborting the sync.

**Checkpoint**: `sqlite3 ~/.local/share/bubbly-cosmos/portfolio.db "SELECT COUNT(*) FROM cash_flows;"` returns a non-zero count after one sync. User-story work can now begin.

---

## Phase 3: User Story 1 — Invested / Current / P&L at a glance (Priority: P1) 🎯 MVP

**Goal**: Replace the four current `SummaryCards` with a primary row of three clearly labeled cards — Invested, Current Value, P&L (absolute + %) — sharing PLN formatting, with correct gain/loss styling and divide-by-zero protection.

**Independent Test**: With a populated portfolio, the top row shows three cards in order *Invested → Current Value → P&L*; P&L equals `Current − Invested`, color matches sign, and an empty-portfolio fixture renders `0,00 zł / 0,00 zł / 0,00 zł (—)` with no NaN.

### Implementation for User Story 1

- [X] T007 [P] [US1] Extend `PortfolioSnapshot` in `src/client/support/types.ts` with `investedPln: number`, `pnlPln: number`, `pnlPct: number | null`.
- [X] T008 [P] [US1] Mirror the same three fields on the server-side snapshot type used by `src/server/routes/portfolio.ts` (and any shared types file the route imports from).
- [X] T009 [US1] Compute `investedPln`, `pnlPln`, `pnlPct` in `src/server/routes/portfolio.ts` (or the snapshot builder it calls). `pnlPct = investedPln === 0 ? null : (pnlPln / investedPln) * 100`. Depends on T004 + T007 + T008.
- [X] T010 [US1] Rewrite `src/client/components/SummaryCards.tsx` to render a primary row of three cards (`Invested`, `Current Value`, `P&L`) per the table in plan.md §"What changes". Use existing `fmtPln`/`fmtUsd`, existing `.positive`/`.negative` classes. Render `—` when `pnlPct === null`. Depends on T007.
- [X] T011 [US1] Adjust `src/client/styles/_summary.scss` (or the equivalent SCSS partial owning `.summary-cards`) so the three primary cards are visually dominant. No new color variables — reuse existing tokens.
- [X] T012 [US1] Run quickstart steps 1–4 in `specs/002-portfolio-totals-clarity/quickstart.md` against a real sync; confirm the three figures are correct against an independent calculation.

**Checkpoint**: SC-001, SC-002, SC-003 (for empty and gaining/losing portfolios), and SC-004 from spec.md are all met. This is the shippable MVP.

---

## Phase 4: User Story 2 — Consistent currency presentation (Priority: P2)

**Goal**: All three primary figures render in the same primary currency (PLN), with matching thousand separators and decimal precision, regardless of native instrument currencies.

**Independent Test**: Open a multi-currency portfolio (or fixture); confirm `Invested`, `Current Value`, and `P&L` all use PLN formatting `X XXX,XX zł` with identical precision.

### Implementation for User Story 2

- [X] T013 [P] [US2] Audit `fmtPln` usage across `src/client/components/SummaryCards.tsx` and ensure every primary-row figure is routed through it (no per-instrument currency leaks into the totals row).
- [X] T014 [US2] Add a tooltip / `title` attribute on the `Invested` card label in `src/client/components/SummaryCards.tsx`: "Net deposits − withdrawals on your trading account." (FR-010).
- [X] T015 [US2] If any cash flow stored in `cash_flows` has `currency !== 'PLN'`, confirm `getNetContributedCapital()` (T004) converts it via `exchangeRate.ts`. Add a server-side unit log line listing distinct currencies seen, so a non-PLN flow surfaces clearly.

**Checkpoint**: A non-PLN deposit (manual fixture if needed) is summed into `investedPln` correctly; the totals row still renders only PLN.

---

## Phase 5: User Story 3 — P&L breakdown on hover (Priority: P3)

**Goal**: Hovering the P&L card surfaces `Realized` and `Unrealized` sub-figures whose sum equals the headline P&L.

**Independent Test**: Hover the P&L card; tooltip shows `Realized: X` and `Unrealized: Y` where `X + Y` equals the displayed `pnlPln`.

### Implementation for User Story 3

- [X] T016 [P] [US3] Extend `fetchT212CashFlows()` in `src/server/connectors/trading212.ts` to also retain `DIVIDEND`, `INTEREST`, and realized-trade rows (or, if Trading 212 exposes realized P&L via account summary, source from there). Decide between the two sources during implementation; document the choice in a code comment.
- [X] T017 [US3] Compute `realizedPln` and `unrealizedPln = pnlPln − realizedPln` in `src/server/routes/portfolio.ts`. Add both to the snapshot type (mirror in `src/client/support/types.ts`). Depends on T009 + T016.
- [X] T018 [US3] In `src/client/components/SummaryCards.tsx`, add a hover tooltip / popover on the P&L card showing the two sub-figures. Reuse existing `fmtPln` and color tokens.

**Checkpoint**: `realizedPln + unrealizedPln === pnlPln` (to the cent) across at least three test portfolios.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T019 [P] Add a Vitest unit test for the pure cash-flow aggregator (sum of mixed-sign, mixed-currency rows) — small, fast, defends FR-002 and FR-006. Location: `src/server/database.test.ts` (or co-located per existing convention).
- [X] T020 Stale-data indicator: in `src/client/components/SummaryCards.tsx`, dim the row and show a small `stale` badge when `Date.now() − new Date(capturedAt).getTime() > 60 * 60 * 1000` OR the last sync errored (FR-009).
- [X] T021 Persist `investedPln` and `pnlPln` into the `portfolio_history` row written by `src/server/routes/sync.ts` so future "invested over time" charts can read them without recomputation. Additive column(s) only, `CREATE TABLE IF NOT EXISTS` migration pattern.
- [X] T022 Run `npm run lint`, `npm run build`, and full `quickstart.md` (steps 1–6) on the final branch. Resolve any Biome violations introduced.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → no dependencies.
- **Foundational (Phase 2)** → depends on Phase 1; **blocks all user stories**.
- **US1 (Phase 3)** → depends on Phase 2. This is the MVP.
- **US2 (Phase 4)** → depends on Phase 2. Independently testable, integrates cleanly with US1.
- **US3 (Phase 5)** → depends on Phase 2; T017 reads server snapshot fields added in T009 (US1) — if US3 ships before US1 those fields must already exist. Recommended order: US1 → US2 → US3.
- **Polish (Phase 6)** → after the user stories that are in scope for the release.

### Within Each User Story

- Types before producers before consumers: client + server types (T007/T008) → server computation (T009) → client UI (T010) → SCSS (T011) → manual verification (T012).

### Parallel Opportunities

- T003 and T004 (different helpers in the same file but logically independent — review the diff together) can be drafted in parallel.
- T007 (client types) and T008 (server types) touch different files and run in parallel.
- T013 (US2 audit) is independent of US3 work.
- T016 (US3 connector extension) and T019 (polish unit test) touch different files and can run in parallel once US1 lands.

---

## Parallel Example: User Story 1

```bash
# Once Phase 2 completes, kick off these together:
Task: "Extend PortfolioSnapshot in src/client/support/types.ts (T007)"
Task: "Mirror new snapshot fields in server snapshot type (T008)"
# Then sequential:
Task: "Compute investedPln/pnlPln/pnlPct in src/server/routes/portfolio.ts (T009)"
Task: "Rewrite src/client/components/SummaryCards.tsx (T010)"
```

---

## Implementation Strategy

### MVP First (US1 only)

1. T001 (verify clean baseline).
2. Phase 2 (T002–T006) — cash-flow storage + connector + sync wiring.
3. Phase 3 (T007–T012) — three-card refactor.
4. **STOP AND VALIDATE** — run quickstart.md. Ship.

### Incremental Delivery

- After MVP: add US2 (T013–T015) — single-currency cleanliness + tooltip.
- Then US3 (T016–T018) — realized/unrealized breakdown.
- Then Polish (T019–T022) — unit test, stale indicator, history persistence, final lint/build.

### Parallel Team Strategy

Not relevant — single developer.

---

## Notes

- `T005` introduces the only new external network call. Keep the 1100 ms sleep between T212 endpoint hits per constitution Principle IV.
- No new SCSS color variables. Reuse `.positive` / `.negative` and existing card tokens.
- `pnlPct` is `null` (not `NaN`) when `investedPln === 0` — the wire format and the UI both depend on this.
- Realized/unrealized split (US3) is gracefully deferrable if the data source proves awkward — US1 + US2 still deliver the user's stated ask.
- Verify with `quickstart.md` after each phase; commit per phase, not per task.
