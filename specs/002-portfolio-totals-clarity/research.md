# Phase 0 — Research

## R-001: Source of "net contributed capital" from Trading 212

**Decision**: Pull from `GET /history/transactions` and aggregate `DEPOSIT − WITHDRAWAL` rows in the account's base currency (PLN for this user). Persist to a new `cash_flows` table; recompute the aggregate on each sync.

**Rationale**:
- `GET /equity/account/summary` exposes `investments.totalCost` (mapped to `T212Summary.invested` today), but that field reflects only the **cost basis of currently open positions** — it shrinks when the user sells. The user wants "money I put in", which only the transactions ledger provides.
- The transactions endpoint returns `DEPOSIT`, `WITHDRAWAL`, `DIVIDEND`, `INTEREST`, and `FEE` rows. For "Invested" we sum only `DEPOSIT − WITHDRAWAL`. Dividends/interest stay inside Current Value (they hit the cash balance), so total return = Current Value − Invested already accounts for them.
- Storing cash flows locally means later we can chart "Invested over time" and split realized vs. unrealized P&L (US3) without re-hitting the API.

**Alternatives considered**:
- *Use `cash.invested` from account summary*: same problem as `investments.totalCost` — shrinks on sell.
- *Manual user entry of total deposits*: cumbersome and drifts immediately.
- *No cache, fetch on every dashboard load*: violates the cache-first principle and the documented transactions rate limit.

**Open follow-ups (handled at implementation time, not blocking)**:
- Exact transactions endpoint shape and pagination cursor — verified against the live API during implementation. The contract assumes standard cursor-based pagination; if Trading 212 uses a different format, only `fetchT212CashFlows()` changes.
- Rate limit for transactions endpoint — assume 1 req/30 s and adjust if production logs reveal otherwise. Sync runs at most every few minutes, so this is comfortable.

## R-002: Currency for "Invested"

**Decision**: Store cash flows in their native currency in the `cash_flows` table, but compute the displayed `investedPln` figure by summing PLN-equivalent amounts. For deposits/withdrawals that occurred in PLN (the user's account base currency), this is the literal amount. For any non-PLN flow (none expected for this user, but defended against), use the FX rate at the time the flow was recorded.

**Rationale**: Keeps the database honest about source currency while letting the UI present a single comparable figure. Matches existing FX handling in `exchangeRate.ts`.

**Alternatives considered**:
- *Store in PLN only*: lossy; can't recompute if FX rates correct later.

## R-003: Staleness indicator threshold

**Decision**: 1 hour. If `snapshot.capturedAt` is older than 1 hour OR the most recent sync recorded an error, dim the totals row and show a small "stale" badge.

**Rationale**: The user manually triggers `cosmos` / sync; an hour is a reasonable upper bound before a working session's data should be considered stale. Matches the AI analysis "freshness" hint already in the codebase.

**Alternatives considered**:
- *Always show data without staleness*: contradicts FR-009.
- *Aggressive 5-minute threshold*: too noisy given manual sync cadence.

## R-004: Visual layout

**Decision**: Promote three primary cards (Invested / Current / P&L) to a larger top row; demote the existing per-account ("Stocks", "Crypto") into a second smaller sub-row beneath. No new SCSS variables — reuse `.card`, `.positive`, `.negative`, and existing spacing scale.

**Rationale**: Preserves all existing information while making the user's three key questions visually dominant. Aligns with Principle III (UX Consistency) — no new design tokens introduced.
