# Feature Specification: Decoupled AI Portfolio Analysis with Enriched Sector Data

**Feature Branch**: `003-decouple-ai-analysis`

**Created**: 2026-06-04

**Status**: Draft

**Input**: User description: "Refactor the AI analysis pipeline in this financial screener dashboard. Decouple data fetching from analysis: server pre-fetches T212 holdings plus Yahoo Finance sector/industry/asset-type enrichment during sync; the analyze endpoint then hands the AI a fully-assembled JSON snapshot and receives a structured result with allocation breakdowns by asset type, sector, and industry. Frontend surfaces these breakdowns as charts and a positions table."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Faster, More Consistent AI Analysis (Priority: P1)

A self-directed retail investor opens the dashboard and asks the AI assistant for a portfolio analysis. They expect the analysis to begin streaming within seconds and to produce the same structural categorisation (sector, industry, asset type per holding) every time it runs on the same portfolio snapshot, not a guessed-at version that differs between attempts.

**Why this priority**: This is the core value of the refactor. The current pipeline is slow and produces inconsistent sector/asset-type labels because the AI fetches its own reference data from an unreliable source. Without solving this, every downstream feature (allocation charts, positions table, future portfolio rules) inherits the same inconsistency.

**Independent Test**: With a synced portfolio of at least five holdings, request an AI analysis twice in a row without re-syncing. Verify that (a) streaming begins within the agreed responsiveness target, (b) the sector and asset-type labels for every holding are identical between the two runs, and (c) the analysis text references the holdings without contradicting the displayed labels.

**Acceptance Scenarios**:

1. **Given** a freshly synced portfolio with mixed ETFs and individual stocks, **When** the user requests an AI analysis, **Then** streaming output appears within the responsiveness target and every position cited by the analysis is tagged with the same sector and asset type that the dashboard shows for that ticker.
2. **Given** the same portfolio snapshot, **When** the user requests an AI analysis a second time, **Then** the structural classification (asset type, sector, industry per ticker) is identical to the first run.
3. **Given** an AI analysis is in progress, **When** the assistant produces its result, **Then** no external market-data provider receives a call that originated from the analysis itself.

---

### User Story 2 - Allocation Breakdown by Asset Type, Sector, and Industry (Priority: P1)

The investor wants to see, at a glance, what portion of their portfolio sits in ETFs versus individual stocks, how their stock exposure is split across sectors (e.g. Technology, Healthcare, Financials), and a deeper view by industry (e.g. Software—Infrastructure, Semiconductors). The breakdown should reflect their current holdings and update whenever they sync.

**Why this priority**: Allocation visibility is a primary reason investors check a portfolio dashboard. The new enrichment data unlocks this view, and without it the refactor delivers backend correctness with no user-visible benefit.

**Independent Test**: After syncing a portfolio containing at least one ETF and stocks from at least three different sectors, open the dashboard and confirm that an asset-type breakdown, a sector breakdown, and an industry breakdown are visible, that the weights in each breakdown sum to approximately 100%, and that the values match a hand-calculation from position weights.

**Acceptance Scenarios**:

1. **Given** a synced portfolio with one or more ETFs and one or more individual stocks, **When** the user views the dashboard, **Then** an asset-type allocation breakdown is displayed showing the ETF/Stock split with weights summing to ~100% (within a 1% rounding tolerance).
2. **Given** the same portfolio, **When** the user views the dashboard, **Then** a sector allocation breakdown is displayed, weights sum to ~100%, and holdings whose sector is unknown are surfaced as a clearly labelled "Unknown" or equivalent bucket rather than silently dropped.
3. **Given** the same portfolio, **When** the user views the dashboard, **Then** an industry breakdown is displayed and items with no industry data appear under a clearly labelled fallback bucket.

---

### User Story 3 - Positions Table with Classification Columns (Priority: P2)

The investor wants a tabular view of every holding showing its ticker, display name, asset type (ETF/Stock), sector, industry, current weight in the portfolio, and current P&L percentage, so they can scan holdings and spot concentration or outliers without reading prose.

**Why this priority**: The table makes the same enrichment data scannable per-holding. It is high value but the allocation breakdowns deliver the headline insight, so this is P2 rather than P1.

**Independent Test**: After a sync, open the AI analysis panel and verify a positions table is present, lists every holding from the latest snapshot, and that every row shows ticker, display name, asset type, sector, industry, weight %, and P&L %. Confirm that holdings with no resolved sector/industry display a clear placeholder rather than blank cells.

**Acceptance Scenarios**:

1. **Given** a portfolio with N holdings has been synced, **When** the user opens the AI analysis panel, **Then** the positions table contains exactly N rows, one per holding, each with the seven columns populated or showing an explicit placeholder for missing values.
2. **Given** a holding whose sector and industry could not be resolved during sync, **When** the user views the positions table, **Then** that row displays an explicit "Unknown" placeholder in the sector and industry columns and an asset type of "Unknown".
3. **Given** the positions table is displayed, **When** the user inspects weights and P&L percentages, **Then** the weights across all rows sum to ~100% (within rounding tolerance) and each row's P&L % matches the value shown elsewhere in the dashboard for that ticker.

---

### User Story 4 - Resilient Sync When Reference Data Source Is Unavailable (Priority: P2)

The investor triggers a sync at a moment when the external market-data reference source is temporarily unreachable. They expect the sync to still complete with their holdings and cash data, and they expect the previously known sector/industry/asset-type labels to remain available rather than being wiped out and replaced with blanks.

**Why this priority**: The sync action is the primary write path of the application. Catastrophic failure when one of two upstream sources is down would be a poor experience. Lower than P1 because it is a degraded-path scenario, not the golden path.

**Independent Test**: Force the Yahoo enrichment step to fail (network off, or the provider returns errors). Trigger a sync. Verify that holdings and cash data are still updated, that a non-blocking warning is surfaced to the user (or at minimum to the server log) explaining that enrichment was skipped, and that the previously cached sector/industry/asset-type values are still visible on the dashboard afterwards.

**Acceptance Scenarios**:

1. **Given** stock metadata exists in the cache from a previous successful sync, **When** the user triggers a sync and the reference-data source returns errors for all tickers, **Then** the sync completes, the holdings/cash snapshot is updated, and the previously cached sector/industry/asset-type labels are preserved (not nulled out).
2. **Given** the reference-data source resolves some tickers but errors on others, **When** the sync completes, **Then** successfully resolved tickers have their metadata refreshed and unresolved tickers retain their previously cached metadata, with no row left in an inconsistent half-updated state.
3. **Given** a ticker has never been resolved by the reference-data source, **When** sync repeatedly fails for it, **Then** that holding is treated as asset type "Unknown" with no sector or industry, and it is included in the positions table and allocation breakdowns under explicit "Unknown" labels.

---

### Edge Cases

- A holding's ticker format does not match any known mapping rule for the reference-data source: the system treats the holding as asset type "Unknown" with no sector/industry rather than failing the whole sync.
- A holding is closed (no longer in the portfolio) between syncs: it stops appearing in the positions table and allocation breakdowns on the next sync, but its cached enrichment row may remain (stale rows are tolerated; they do not cause incorrect display).
- The user opens the dashboard before any sync has ever run: the dashboard explains that no snapshot is available and offers the sync action, rather than displaying empty charts.
- The user requests an AI analysis when the latest snapshot is empty (no holdings): the analysis flow either declines gracefully with an explanation or returns an analysis whose structured output reflects an empty portfolio without erroring.
- A position's weight is zero or negative (e.g. an unusual T212 reporting edge case): the position is included in the positions table but excluded from percentage breakdowns to keep totals coherent.
- The reference-data source returns conflicting classifications across two sync runs for the same ticker (e.g. sector renamed): the most recent successful resolution wins and the dashboard reflects it on the next render.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: During a portfolio sync, the system MUST fetch reference classification data (sector, industry, asset type, display name) from an external market-data source for every ticker currently held.
- **FR-002**: The system MUST persist reference classification data per ticker in a local cache keyed by ticker so it survives across sync runs and dashboard reloads.
- **FR-003**: The system MUST upsert (insert-or-replace) reference classification data per ticker on each sync, so newly opened positions gain data and existing positions get refreshed data.
- **FR-004**: When the reference-data source fails for a given ticker, the system MUST preserve any previously cached classification for that ticker rather than overwriting it with blanks, and MUST classify the holding as asset type "Unknown" only when no cached data has ever existed.
- **FR-005**: When the reference-data source is fully unreachable, the sync MUST still complete the rest of its work (holdings, cash) and MUST log a warning that enrichment was skipped.
- **FR-006**: The reference-data fetch step MUST respect the source's rate limits and MUST NOT cause sync to take disproportionately longer than the existing brokerage fetch step on portfolios of typical size (under 100 holdings).
- **FR-007**: AI portfolio analysis MUST operate exclusively on data the server has already gathered. The AI MUST NOT issue live calls to the brokerage, the reference-data source, or any other external provider during analysis.
- **FR-008**: The AI analysis output MUST be returned in a predefined structured format that the dashboard can render directly, including per-holding sector, industry, and asset-type fields.
- **FR-009**: The structured analysis output MUST include a portfolio-wide positions summary listing every holding with ticker, asset type, sector, industry, current weight, and current P&L percentage.
- **FR-010**: The structured analysis output MUST include allocation breakdowns by asset type, by sector, and by industry, each expressed as percentage weights that sum to approximately 100% (within rounding tolerance).
- **FR-011**: The dashboard MUST display the asset-type allocation breakdown and the sector allocation breakdown as visual charts.
- **FR-012**: The dashboard MUST display a positions table in the AI analysis area listing every holding with columns for ticker, display name, asset type, sector, industry, weight %, and P&L %.
- **FR-013**: Holdings whose sector, industry, or asset type are not known MUST be displayed under an explicit "Unknown" label both in the positions table and in allocation breakdowns; they MUST NOT be silently dropped.
- **FR-014**: The brokerage rate-limit discipline (the existing pacing between calls to the brokerage) and the cash-flow / net-contributed-capital calculation MUST be preserved exactly as today.
- **FR-015**: The existing "/advise" assistant flow used outside the dashboard MUST continue to work and MUST NOT be regressed by this refactor.
- **FR-016**: PLN MUST remain the primary display currency throughout the dashboard and analysis output, unchanged by this work.

### Key Entities *(include if feature involves data)*

- **Position**: A current holding in the user's brokerage account. Identified by ticker. Carries quantity, average price, current price, current value, and unrealised P&L percentage. Already produced by the existing sync flow.
- **Stock Metadata**: A reference classification record per ticker. Attributes: ticker (key), sector, industry, asset type (ETF / Stock / Unknown), display long name, last fetched timestamp. Sourced from the external reference-data provider during sync. Persisted across syncs.
- **Enriched Position**: A view that joins a Position with its Stock Metadata at analysis time. Used both as input to the AI and as the basis for the positions table and allocation breakdowns. Not separately persisted.
- **Portfolio Snapshot**: The latest synced set of positions plus account summary. Already persisted. This refactor does not change its shape, only adds Stock Metadata alongside it.
- **Analysis Result**: The structured output returned by the AI. Carries narrative analysis fields plus a positions summary array and an allocation object (by asset type, by sector, by industry).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: When the user requests an AI analysis on a synced portfolio, streaming output appears within 3 seconds of the request in 95% of attempts.
- **SC-002**: Across two consecutive AI analysis runs on the same unchanged portfolio snapshot, the structural classification (asset type, sector, industry per ticker) and the allocation percentages are identical 100% of the time.
- **SC-003**: An AI analysis run causes zero outbound calls to the brokerage or the market-data reference source. Verifiable by inspecting network egress during analysis.
- **SC-004**: After a successful sync on a portfolio containing one or more ETFs and one or more stocks across at least three sectors, the dashboard shows an asset-type breakdown, a sector breakdown, and an industry breakdown, each with weights summing to within 1% of 100%.
- **SC-005**: After a sync, at least 90% of the user's holdings have a resolved sector and asset type on the first sync, assuming the reference-data source is available; the remainder are visibly labelled "Unknown" rather than blank.
- **SC-006**: A sync triggered while the reference-data source is unreachable still completes within the same order-of-magnitude duration as a normal sync, still updates holdings and cash data, and leaves previously cached classifications intact.
- **SC-007**: The positions table renders every holding from the latest snapshot with no missing rows and no blank required cells; missing classification data is shown as an explicit "Unknown" placeholder.
- **SC-008**: The existing assistant flow used outside the dashboard continues to produce a non-empty response on a representative portfolio with no behavioural changes attributable to this refactor.

## Assumptions

- The user's typical portfolio contains fewer than 100 distinct holdings, so the per-ticker enrichment fetch does not need pagination, caching beyond simple per-ticker rows, or parallelism beyond a small fixed bound.
- Classification (sector / industry / asset type) is treated as slow-changing reference data: refreshing it on each sync (rather than on every dashboard load) is acceptable and is preferable because it bounds upstream load.
- "Unknown" is an acceptable user-visible label for holdings the reference-data source cannot classify. The user prefers an explicit Unknown bucket to silently dropping such holdings.
- The brokerage already in use (Trading 212) remains the only source of truth for positions, cash, and P&L. The reference-data source supplies only classification fields, never prices or quantities.
- The dashboard's existing visual language (dark theme, existing chart component) is reused. No new visualisation library is introduced by this refactor.
- The structured AI output is validated against a known schema; malformed AI responses are treated as a degraded result the user can re-trigger, not as a silent failure.
- A single user runs this dashboard locally against their own brokerage account; no multi-tenant authorisation concerns apply.
- Holdings with zero or negative weight (data anomalies) are rare enough that excluding them from percentage breakdowns is acceptable and will not surprise the user.
