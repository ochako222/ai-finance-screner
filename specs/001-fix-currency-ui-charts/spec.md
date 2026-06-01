# Feature Specification: Currency Fix, USD Conversion & Dashboard Layout

**Feature Branch**: `001-fix-currency-ui-charts`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "We are going to fix the bugs in the app. First of all Everything connected to the Trading 212 account is in the PLN, remove $ signs across the app. In the Total Portfolio I want to see the total sum in the PLN, and $. Convert PLN into the $ by today exchange rate, load it with synchronyze button. I like Allocation Pie chart, but Also I want to see the Dynamic of my investments by the time, create a chart for it. The design should be: The first Row is a totals cards, like now. Second Row should be the allocation and charts. Third Row table with current stocks, make it whole screen width. Fourth row the same table but for the binance"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Correct Currency Display (Priority: P1)

The user opens the dashboard and sees all monetary values from their Trading 212 account displayed in PLN (Polish Złoty) with the correct `zł` symbol, never with a `$` sign. They can immediately trust that the numbers they see reflect their actual account currency.

**Why this priority**: Displaying the wrong currency symbol is a data accuracy bug that breaks trust in the application. All other improvements are secondary to showing correct information.

**Independent Test**: Navigate to the dashboard and verify that every monetary figure in the totals cards, position table, and allocation chart labels shows `zł` (or `PLN`) instead of `$`.

**Acceptance Scenarios**:

1. **Given** the dashboard is loaded with Trading 212 data, **When** the user views any monetary value, **Then** it is formatted with the PLN symbol (e.g., `1 234,56 zł`) and no `$` symbol appears anywhere on the page for T212 data.
2. **Given** the positions table is visible, **When** the user reads current value, purchase value, or P&L columns, **Then** all amounts are in PLN format.

---

### User Story 2 - Total Portfolio in PLN and USD (Priority: P2)

The user wants to see the total value of their portfolio expressed both in PLN (the native account currency) and its USD equivalent. The USD figure is derived from the PLN total using the exchange rate fetched on the last synchronisation, so the user always knows how fresh the conversion is.

**Why this priority**: Having the USD equivalent alongside PLN is the next most actionable piece of information — it lets the user compare their portfolio against globally-denominated benchmarks without leaving the app.

**Independent Test**: Trigger a synchronisation and verify the totals card shows two figures: one in PLN and one in USD, with the USD value matching PLN ÷ current PLN/USD exchange rate.

**Acceptance Scenarios**:

1. **Given** a successful synchronisation, **When** the user views the Total Portfolio card, **Then** it shows the total in PLN (e.g., `45 320,00 zł`) and the USD equivalent below it (e.g., `≈ $11,330`).
2. **Given** the user clicks the Synchronise button, **When** the sync completes, **Then** the PLN→USD exchange rate is fetched for today and both figures are refreshed simultaneously.
3. **Given** the exchange rate API is unavailable during sync, **When** sync completes, **Then** the PLN total is still shown and the USD field displays a "rate unavailable" indicator rather than a stale or incorrect value.

---

### User Story 3 - Investment Dynamics Chart (Priority: P3)

The user wants to see how their total portfolio value has changed over time — not just the current snapshot. A time-series chart displayed alongside the existing allocation pie shows the historical trend of their investment, giving context to whether they are up or down compared to earlier periods.

**Why this priority**: The allocation chart shows the current composition but not the trajectory. A dynamics chart is the most natural complement and gives the user insight into performance over time.

**Independent Test**: After multiple synchronisations on different dates exist in the database, the dynamics chart renders a line/area graph with one data point per sync, with dates on the x-axis and total portfolio value (PLN) on the y-axis.

**Acceptance Scenarios**:

1. **Given** at least two portfolio snapshots exist (different sync dates), **When** the user views the dashboard, **Then** the dynamics chart shows a line/area graph with date on the x-axis and total value (PLN) on the y-axis.
2. **Given** only one snapshot exists, **When** the user views the dynamics chart, **Then** it shows the single data point and a friendly message indicating more syncs are needed for trend data.
3. **Given** a new sync is performed, **When** it completes, **Then** the dynamics chart updates to include the new data point without a page refresh.

---

### User Story 4 - Dashboard Layout Redesign (Priority: P4)

The user navigates the dashboard and finds a clear, predictable four-row layout: totals at the top, charts in the second row, the full-width T212 positions table in the third row, and the full-width Binance table in the fourth row. Each section is visually distinct and easy to scroll.

**Why this priority**: Layout is important for usability but does not affect data correctness. It is the lowest-risk change and can be adjusted after the data fixes are confirmed.

**Independent Test**: On desktop viewport, the dashboard renders with exactly four vertical sections in the specified order, and both data tables span the full width of the viewport.

**Acceptance Scenarios**:

1. **Given** the dashboard loads, **When** the user views the page, **Then** sections appear in this vertical order: (1) totals cards, (2) allocation pie + dynamics chart side by side, (3) T212 positions table full-width, (4) Binance table full-width.
2. **Given** the user views the T212 or Binance table, **When** the table is rendered, **Then** it spans the full available width with no side margins eating into the table columns.
3. **Given** the Binance connector is still a stub, **When** the fourth row is shown, **Then** it renders the Binance table placeholder gracefully (e.g., "Binance not yet connected") without crashing the page.

---

### Edge Cases

- What happens when the PLN/USD exchange rate fetch fails during sync? Show stale rate with timestamp or "unavailable" indicator — never silently show an incorrect value.
- What happens if the portfolio has zero positions? Totals cards show `0,00 zł` / `$0`, charts show empty-state messages.
- What happens if historical sync data is only one record? Dynamics chart shows single-point state with guidance message.
- What happens on narrow/mobile viewports? Tables scroll horizontally rather than breaking layout.
- What happens if a Trading 212 position has an unexpected currency (non-PLN instrument value)? Display the value as-is with the instrument's own currency, noting it is not included in the PLN total, or converted.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display all Trading 212 monetary values using the PLN currency symbol; no `$` symbol MUST appear for T212 account data.
- **FR-002**: The Total Portfolio card MUST show the portfolio total in PLN and a USD equivalent derived from the current PLN/USD exchange rate.
- **FR-003**: The system MUST fetch the PLN/USD exchange rate for today's date during the synchronisation action (Synchronise button).
- **FR-004**: The fetched exchange rate MUST be stored alongside the portfolio snapshot so the conversion is reproducible offline.
- **FR-005**: The dashboard MUST include an Investment Dynamics chart that plots total portfolio value (PLN) over time, using one data point per recorded synchronisation.
- **FR-006**: The Dynamics chart and Allocation Pie chart MUST be displayed side by side in the second row of the dashboard.
- **FR-007**: The T212 positions table MUST occupy the full width of the third dashboard row.
- **FR-008**: The Binance positions table MUST occupy the full width of the fourth dashboard row; while the Binance connector is a stub it MUST render a graceful placeholder.
- **FR-009**: The system MUST handle exchange rate fetch failures gracefully — showing the PLN total with a "rate unavailable" indicator rather than a wrong USD figure.
- **FR-010**: All currency figures MUST be locale-formatted (thousands separator, decimal places) consistent with the Polish locale for PLN values.

### Key Entities

- **PortfolioSnapshot**: A saved record of total portfolio value in PLN at a specific sync timestamp; the basis for the dynamics chart time series.
- **ExchangeRate**: The PLN/USD rate on a given date, fetched during sync and stored alongside the snapshot; used to compute the USD equivalent display value.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero `$` symbols appear on the dashboard for Trading 212-sourced monetary values after the fix is applied.
- **SC-002**: The Total Portfolio card displays both a PLN total and a USD equivalent within 3 seconds of a sync completing.
- **SC-003**: The Investment Dynamics chart renders a correct time-series with all available historical sync data points within 1 second of the dashboard loading.
- **SC-004**: The dashboard layout consistently renders in the four-row order (totals → charts → T212 table → Binance table) across all desktop viewport widths ≥ 1024 px.
- **SC-005**: Exchange rate fetch failure does not cause the dashboard to crash or display an incorrect USD value; a human-readable indicator is shown instead.

## Assumptions

- The Trading 212 account is denominated entirely in PLN; positions that are denominated in other currencies will show their native values alongside a PLN equivalent if the API provides it, or be excluded from the PLN total with a note.
- The PLN/USD exchange rate will be fetched from a free, unauthenticated public exchange-rate API (e.g., exchangerate-api.com or similar); no additional API keys are required.
- Historical sync data sufficient for the dynamics chart (multiple snapshots over different dates) will be accumulated naturally as the user performs syncs over time; no backfill of historical data is required.
- The Binance connector remains a stub for this feature; the fourth row renders a placeholder, not live data.
- Desktop viewport (≥ 1024 px wide) is the primary supported layout; mobile responsiveness is a best-effort improvement within the existing SCSS system, not a hard requirement.
- The existing SQLite database schema will be extended (not replaced) to store exchange rate and snapshot data.
