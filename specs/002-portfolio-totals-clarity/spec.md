# Feature Specification: Portfolio Totals Clarity

**Feature Branch**: `002-portfolio-totals-clarity`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: "I want refactor this app. I have the row with totals but it's not clear. I want to know how many money I invested, then how many money do I have in the portfolio now. And then I want to see the difference how many I earned, looses from the difference between invested money vs money on the trading account"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See invested vs current vs P&L at a glance (Priority: P1)

As the portfolio owner, when I open the dashboard I want the top totals row to clearly answer three questions in order: (1) how much money have I put in, (2) how much is that worth right now, and (3) what is the absolute and percentage difference between those two numbers. The current totals row mixes values without labels that map to these questions, forcing me to do mental math.

**Why this priority**: This is the primary reason the user opens the app — understanding overall position health. Without this, every other panel is supporting information. It is also the smallest self-contained slice that delivers the requested value.

**Independent Test**: Open the dashboard with a populated portfolio and verify the totals row shows three clearly labeled figures: "Invested", "Current Value", and "P&L" (absolute + %). The third figure must equal Current Value − Invested, and its sign/color must reflect gain (positive) or loss (negative).

**Acceptance Scenarios**:

1. **Given** a portfolio with known cost basis of 10,000 PLN and current market value of 11,500 PLN, **When** the user views the dashboard, **Then** the totals row shows Invested = 10,000 PLN, Current Value = 11,500 PLN, P&L = +1,500 PLN (+15.00%) styled as a gain.
2. **Given** a portfolio currently underwater (cost basis 5,000 PLN, market value 4,200 PLN), **When** the user views the dashboard, **Then** the totals row shows P&L = −800 PLN (−16.00%) styled as a loss.
3. **Given** an empty portfolio (no positions, no cash deposited), **When** the user views the dashboard, **Then** the totals row shows Invested = 0, Current Value = 0, P&L = 0 (0.00%) without divide-by-zero artifacts.

---

### User Story 2 - Consistent currency presentation across the totals row (Priority: P2)

When viewing the totals, all three figures should be presented in the same primary currency so they are directly comparable, with an optional secondary currency (USD) shown alongside as it already is elsewhere in the app.

**Why this priority**: Without a single primary currency, the user cannot visually compare Invested vs Current to derive P&L. This is a refinement on top of P1 and not strictly required for the labels themselves.

**Independent Test**: With the portfolio holding instruments quoted in multiple currencies, verify all three totals figures render in the same primary currency (PLN), formatted with the same separators and decimal precision.

**Acceptance Scenarios**:

1. **Given** a multi-currency portfolio, **When** the totals row renders, **Then** Invested, Current Value, and P&L all display in PLN with matching thousand separators and 2-decimal precision.

---

### User Story 3 - P&L breakdown on hover or expand (Priority: P3)

The user can hover or click the P&L cell to see how P&L is composed: realized P&L (from closed positions / dividends received) vs unrealized P&L (mark-to-market on open positions).

**Why this priority**: Nice-to-have transparency. Not required to answer the user's original three questions, but useful once the basic row is correct.

**Independent Test**: Hover the P&L cell and verify a tooltip/popover shows two sub-figures that sum to the displayed P&L.

**Acceptance Scenarios**:

1. **Given** a portfolio with both closed and open positions, **When** the user hovers the P&L cell, **Then** a tooltip shows "Realized: X" and "Unrealized: Y" where X + Y equals the headline P&L.

---

### Edge Cases

- **Empty portfolio**: Invested = 0 must not cause a NaN/Infinity in the percentage cell — render `0.00%` or a dash.
- **Deposits without trades**: If the user has deposited cash but bought nothing, Invested should equal deposits, Current Value should equal cash on account, and P&L should be 0 (or reflect FX drift only, if any).
- **Withdrawals**: If the user has withdrawn cash, "Invested" should reflect net contributions (deposits − withdrawals), not gross deposits, so P&L stays meaningful.
- **Pending settlements / unrealized FX**: FX movements between the trade currency and the display currency are included in unrealized P&L; this must not double-count.
- **Stale data**: If the upstream broker fetch fails, the totals row should clearly indicate the figures are stale rather than silently showing zeros.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The dashboard MUST display a totals row containing three labeled figures in fixed order: "Invested", "Current Value", "P&L".
- **FR-002**: "Invested" MUST represent the user's net contributed capital — the sum of cash deposited into the trading account minus cash withdrawn, expressed in the primary display currency.
- **FR-003**: "Current Value" MUST represent the present total value of the trading account: cash balance plus mark-to-market value of all open positions, expressed in the primary display currency.
- **FR-004**: "P&L" MUST be displayed as both an absolute amount (Current Value − Invested) and a percentage ((Current Value − Invested) / Invested × 100), in the same primary currency.
- **FR-005**: When P&L is positive the cell MUST use the gain visual treatment already used elsewhere in the app; when negative it MUST use the loss treatment; when exactly zero it MUST use a neutral treatment.
- **FR-006**: When "Invested" is zero, the percentage cell MUST render a placeholder (e.g., `—` or `0.00%`) rather than NaN/Infinity.
- **FR-007**: All three totals figures MUST share the same primary currency, number formatting (thousand separators, decimal precision), and font treatment so they are visually comparable.
- **FR-008**: The totals row MUST update when a portfolio sync completes, without requiring a full page reload.
- **FR-009**: If the most recent sync failed or data is older than the sync staleness threshold, the totals row MUST visually indicate the figures are stale (e.g., dimmed, with a stale indicator/tooltip).
- **FR-010**: Each totals figure MUST have a label or tooltip explaining in one short sentence what it represents, so the meaning is unambiguous to the user.
- **FR-011**: The primary display currency for the totals row is PLN (Polish złoty), matching the rest of the app's primary currency convention.

### Key Entities *(include if feature involves data)*

- **Invested (net contributed capital)**: Cumulative net cash flow from the user into the trading account. Derived from broker deposit/withdrawal history or, if unavailable, from the account summary's reported "deposit" / "total invested" field.
- **Current Value**: Current total account equity = free cash + sum(market_price × quantity) for all open positions, in the primary display currency.
- **P&L (Profit and Loss)**: A derived figure with two facets — absolute (currency amount) and relative (percentage of Invested). Sign determines gain/loss styling.
- **Realized P&L** *(P3)*: Locked-in gains/losses from closed trades and received dividends.
- **Unrealized P&L** *(P3)*: Mark-to-market gain/loss on currently open positions, including any FX revaluation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user opening the dashboard for the first time can correctly state, within 10 seconds and without explanation, (a) how much they invested, (b) what it's worth now, and (c) whether they are up or down and by how much.
- **SC-002**: The headline P&L number in the totals row matches an independently calculated P&L (Current Value − Invested) to the cent in 100% of test portfolios (empty, gaining, losing, multi-currency, post-withdrawal).
- **SC-003**: Zero rendering defects on edge cases — empty portfolio, withdrawal-only history, and stale-data state all render meaningful values rather than NaN, Infinity, or blanks.
- **SC-004**: The totals row reflects new sync data within 2 seconds of sync completion, with no full page reload required.

## Assumptions

- The primary display currency is PLN, consistent with the rest of the app; USD is shown as a secondary reference where it already is and is out of scope for this refactor.
- "Invested" uses **net contributed capital** (deposits − withdrawals). This is the most common interpretation of "money I put in" and avoids the inflation that gross-deposit numbers cause after partial withdrawals. The broker (Trading 212) exposes account-level deposit/withdrawal figures in the account summary, so no separate ledger is required.
- Crypto / Binance integration remains the stub it is today; totals reflect only the Trading 212 account until that connector lands. The labels and math defined here will extend trivially once Binance contributes its own Invested and Current Value.
- Visual styling (colors, typography, layout) reuses the existing dashboard tokens; this spec defines content and semantics, not a new visual language.
- Realized vs unrealized split (US3) depends on order/dividend history being available from the broker connector; if that data is not present, US3 is deferred without blocking US1 and US2.
