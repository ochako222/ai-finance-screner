# Phase 0 Research: Decoupled AI Analysis

**Feature**: `003-decouple-ai-analysis`
**Date**: 2026-06-04

This document resolves every open technical question implied by the spec and the plan's Technical Context. There are no `NEEDS CLARIFICATION` markers; the user input was prescriptive enough to settle most choices. Items below record the *why* so reviewers and future contributors can challenge specific decisions without re-deriving them.

---

## R1. Reference-data provider: Yahoo Finance via `yahoo-finance2`

- **Decision**: Use the `yahoo-finance2` npm package (already present in `node_modules/`, must be added to `package.json` `dependencies`) and call `quoteSummary(symbol, { modules: ['assetProfile', 'price'] })` per ticker.
- **Rationale**:
    - Free, unauthenticated, well-maintained TS-typed wrapper around Yahoo's public endpoints.
    - `assetProfile.sector` and `assetProfile.industry` are exactly the fields the spec needs.
    - `price.quoteType` returns `"ETF"` / `"EQUITY"` / etc., which the spec calls out as the canonical asset-type signal.
    - `price.longName` / `shortName` gives a human-friendly display name for the new positions table (FR-012) without a separate request.
- **Alternatives considered**:
    - **Trading 212 `get_instruments`** — the source of today's inconsistent sector data; explicitly out per the spec problem statement.
    - **Finnhub / Polygon / IEX** — require API keys, paid tiers for sector data, or restrictive rate limits. Overkill for a single-user local dashboard.
    - **Manual sector mapping table** — works for known core holdings but breaks the moment the user opens a new position. Defeats the goal.

## R2. T212 → Yahoo ticker mapping

- **Decision**: Implement a pure `t212ToYahoo(t212Ticker: string): string` mapper:
    1. Split on `_`, take the first segment as the base symbol (e.g. `AAPL_US_EQ` → `AAPL`, `VWCE_GY_ETF` → `VWCE`).
    2. Inspect the second segment (the country/exchange code) and map to a Yahoo exchange suffix:

        | T212 country segment | Yahoo suffix |
        |----------------------|--------------|
        | `US` *(or absent)*   | *(none — bare ticker)* |
        | `DE`                 | `.DE` |
        | `GB`, `UK`           | `.L` |
        | `FR`                 | `.PA` |
        | `NL`                 | `.AS` |
        | `IT`                 | `.MI` |
        | `ES`                 | `.MC` |
        | `GY` *(Xetra alt code seen in `VWCE_GY_ETF`)* | `.DE` |

    3. Unknown country segments → fall back to the bare base symbol (Yahoo often resolves US-listed equivalents); the failure to resolve is then handled in R4.
- **Rationale**: T212 instrument tickers are stable and lexically predictable across the user's holdings (per `Finances/Trading/strategy/etfs.md` reference list: VWCE, CSPX, MEUD, AGGH, …). A pure string rewrite avoids needing a maintained lookup. Mapping `_GY_` to `.DE` covers the common Xetra-listed UCITS ETF case.
- **Alternatives considered**:
    - **Round-trip via Yahoo search** — adds an extra network call per ticker and introduces ambiguity (multiple matches).
    - **Hardcoded JSON map of ticker → Yahoo symbol** — accurate but rots; requires a code change for every new holding.

## R3. Concurrency and pacing for Yahoo fetches

- **Decision**: Process tickers in fixed-size batches of 5, await `Promise.allSettled` per batch, then `setTimeout(..., 300)` between batches.
- **Rationale**:
    - Spec explicitly requests `concurrency=5, 300ms delay between batches`.
    - Yahoo's public endpoints throttle aggressively under burst load. Batch size 5 is a known safe value in the `yahoo-finance2` issue tracker for `quoteSummary`.
    - `allSettled` makes per-ticker failures non-fatal — required by FR-004/FR-005.
    - For ≤100 holdings the worst case is 20 batches × ~600 ms each ≈ 12 s; in practice the live mean is well under 6 s. Within the same order of magnitude as today's T212 fetch (spec SC-006).
- **Alternatives considered**:
    - **`Promise.all` over all tickers at once** — risks 429s on portfolios with many EU-listed names.
    - **Sequential, single-ticker calls** — too slow for a 50-position portfolio.

## R4. Failure semantics

- **Decision**: Layered fallbacks:
    1. **Per-ticker failure** (timeout, 404, missing `assetProfile`): log `warn`, **do not write** a `stock_metadata` row for that ticker on this sync. Existing cached row (if any) is left intact. At merge time, unresolved tickers default to `asset_type = "Unknown"` with `sector = null`, `industry = null`.
    2. **Whole-provider failure** (network down, all batches reject): log a single warning (`"Yahoo enrichment skipped"`); proceed with the rest of sync (T212 snapshot, cash flows, FX, history). Existing `stock_metadata` rows are preserved.
    3. **Empty positions** (no held tickers): skip Yahoo step entirely.
- **Rationale**: Spec FR-004 is explicit: "preserve previously cached classification for that ticker rather than overwriting it with blanks". This rules out a destructive `DELETE FROM stock_metadata` followed by reinserts. An upsert keyed on `ticker` with non-failed rows only delivers that semantic naturally.
- **Alternatives considered**:
    - **Hard-fail the whole sync if any Yahoo call fails** — wrecks the user's primary write path for a non-critical enrichment.
    - **Mark unresolved tickers with sentinel rows (`sector="__error__"`)** — pollutes display; harder to retry on next sync.

## R5. SQLite schema and idempotency

- **Decision**: New table:

    ```sql
    CREATE TABLE IF NOT EXISTS stock_metadata (
        ticker      TEXT PRIMARY KEY,
        sector      TEXT,
        industry    TEXT,
        asset_type  TEXT NOT NULL DEFAULT 'Unknown',
        long_name   TEXT,
        fetched_at  TEXT NOT NULL
    );
    ```

    Upsert via `INSERT INTO stock_metadata (...) VALUES (?,?,?,?,?,?) ON CONFLICT(ticker) DO UPDATE SET ...` (better-sqlite3 supports `ON CONFLICT`). `asset_type` is constrained at the application layer to `'ETF' | 'Stock' | 'Unknown'` — no CHECK constraint, because adding/removing categories should be a one-line app change.

- **Rationale**:
    - PK on `ticker` gives natural idempotency.
    - `NOT NULL DEFAULT 'Unknown'` for `asset_type` is the only invariant we need for safe rendering (FR-013).
    - `fetched_at` lets us reason about staleness later (out of scope for this feature).
    - No FK to `snapshots` — metadata outlives any particular snapshot, and stale rows are explicitly tolerated by spec Edge Cases.
- **Alternatives considered**:
    - **JSON column on `snapshots`** — couples reference data to a specific snapshot row; loses the cross-sync cache and complicates the "Yahoo down → keep old labels" path.
    - **`INSERT OR REPLACE`** — works, but rewrites unchanged rows and bumps `fetched_at` even on no-op upserts. The `ON CONFLICT DO UPDATE` form is explicit about which columns are refreshed.

## R6. Claude invocation: remove MCP, embed JSON

- **Decision**: In `src/server/routes/analyze.ts`:
    1. Build `payload = { account_summary, positions: enrichedPositions, captured_at, invested_pln, pnl_pln }` from `loadLatestSnapshot()` + `loadStockMetadata(tickers)`.
    2. Spawn `claude` with **only**: `-p <prompt>`, `--model`, `--effort`, `--output-format stream-json`, `--verbose`, `--json-schema <ANALYSIS_SCHEMA>`. **Remove** `--strict-mcp-config`, `--mcp-config`, `--allowedTools`.
    3. The prompt is built by `PROMPTS.analyzeWithData(payload)` and contains the data as a fenced ```json block plus the explicit instruction `"Do not make any API calls. Analyze only the data provided below."`.
- **Rationale**: Satisfies FR-007 / SC-003 (zero outbound calls during analysis). Removing MCP also drops the dependency on `trading212.api_secret` and `trading212.mcp_path` in the analyze code path — those config fields can stay (used elsewhere or future-proofing) without blocking analysis.
- **Alternatives considered**:
    - **Keep MCP but tell Claude not to call** — relies on prompt compliance; FR-007 makes hard isolation a MUST.
    - **POST payload over an MCP tool the agent must call to "get_data"** — still uses MCP, still requires `--allowedTools`, still leaks complexity. Direct prompt embedding is simpler.

## R7. Prompt design (`PROMPTS.analyzeWithData`)

- **Decision**: One new exported function on `PROMPTS`:

    ```ts
    analyzeWithData: (payload: AnalyzePayload): string => `
    You are a personal finance advisor analyzing a real portfolio.
    Do not make any API calls. Analyze only the data provided below.

    Return a structured analysis matching the provided JSON schema.

    Cover:
      - Overview: total value, stocks vs crypto split, currency, narrative summary
      - Performance: top 3 winners and up to 3 losers (include sector, industry, asset_type)
      - Risk: concentration of top position, top sector weights, brief notes
      - Recommendations: exactly 3, each with action ∈ {buy,sell,hold,rebalance,watch}
      - Watchlist: tickers to monitor with sector + reason
      - positions_summary: every held ticker with asset_type, sector, industry, weight_pct, pnl_pct
      - allocation: by_asset_type, by_sector, by_industry — each an array of {label, weight_pct}

    All percentages 0–100 (not 0–1). PLN is the primary currency.

    \`\`\`json
    ${JSON.stringify(payload, null, 2)}
    \`\`\`
    `.trim()
    ```

- **Rationale**:
    - All prompt text remains in `src/server/prompts/index.ts` (constitution V).
    - `PROMPTS.advise()` is left byte-for-byte unchanged (FR-015).
    - Schema-driven output keeps the client renderer dumb.
- **Alternatives considered**:
    - **Two prompts: one for the narrative, one for the structured allocation** — doubles cost and latency.
    - **Templating with handlebars** — overkill for one consumer.

## R8. ANALYSIS_SCHEMA extensions

- **Decision**: Extend the existing schema additively:
    - In `$defs.PositionPerf`: add `industry: { type: ['string', 'null'] }` and `asset_type: { type: 'string', enum: ['ETF', 'Stock', 'Unknown'] }`. Both required so the renderer never sees `undefined`.
    - Top-level new required field `positions_summary`: array of `{ ticker, asset_type, sector | null, industry | null, weight_pct, pnl_pct }`.
    - Top-level new required field `allocation`: object with `by_asset_type`, `by_sector`, `by_industry`. Each is an array of `{ label, weight_pct }` (using `label` consistently so the client can render any of the three with one component; `by_asset_type.label` will hold `"ETF" | "Stock" | "Unknown"`).
- **Rationale**: Additive + required means the client can render unconditionally without `??` guards. Using `label` everywhere lets `AllocationChart` accept any of the three arrays without typing gymnastics. The spec's example used `type` for `by_asset_type` — `label` is a deliberate consistency improvement, documented in `contracts/analysis-schema.json`.
- **Alternatives considered**:
    - **Keep `type` / `sector` / `industry` per-bucket** — three nearly-identical-but-not-quite shapes complicate the renderer.
    - **Make new fields optional** — defeats the renderer simplicity goal and reopens "what do we show if missing?" each time.

## R9. Frontend changes — minimal surface area

- **Decision**:
    - `AllocationChart`: keep the "by position" donut as today (driven by `PortfolioSnapshot`). Replace the "by instrument" donut with two donuts powered by `analysisResult.allocation.by_asset_type` and `analysisResult.allocation.by_sector` (top 6 + "Other" bucket). If `analysisResult` is absent, render today's snapshot-derived fallback unchanged.
    - New `PositionsTable.tsx` rendered inside `AiPanel` below `Watchlist`. Columns: ticker, long_name (fall back to ticker), asset_type, sector, industry, weight %, P&L %. Sort by weight_pct descending. Rows for `asset_type === 'Unknown'` are rendered with a muted style but NOT hidden (FR-013).
- **Rationale**: The "by position" donut already uses cached snapshot data and works without an analysis run — keeping it preserves the dashboard's perceived completeness before/without AI analysis. The new allocation views are gated on having a result and degrade cleanly when one isn't loaded.
- **Alternatives considered**:
    - **Replace `AllocationChart` outright** — would leave the donut empty until an analysis runs.
    - **Render positions table on the main dashboard** — adds a fourth large block; the AI panel is the natural home because it owns the structured analysis result.

## R10. Config and secret handling

- **Decision**: No new config keys. `trading212.api_secret` and `trading212.mcp_path` become unused by the analyze route but stay defined in `config.ts` and `config.example.toml` (already there). A short comment is added in `config.example.toml` noting they are no longer required for analysis, only for the optional `/advise` flow if it is wired to MCP elsewhere.
- **Rationale**: Removing config fields breaks existing user installs. Leaving them as optional / unused is harmless and reversible.

## R11. Testing strategy

- **Decision**: Spec did not request tests as MUST. Recommended unit tests (Vitest, fast, no network):
    1. `t212ToYahoo()` — 12 cases covering each suffix in R2 plus an `_EQ`-only US case and an unmapped country.
    2. `mergePositionsWithMetadata()` — verifies (a) unknown-ticker fallback, (b) weight_pct sums within rounding, (c) zero-value positions excluded from breakdowns but kept in table.
    3. `upsertStockMetadata()` — round-trip insert and conflict-update, asserting `fetched_at` advances and non-failing fields are preserved.
- **Rationale**: These three pure-ish units are the regression-rich part. The Yahoo HTTP layer and the Claude spawn are integration concerns that the quickstart's smoke tests cover.

---

## Open items (not blockers)

- Adding `yahoo-finance2` to `package.json` `dependencies` is a one-line edit but must not be forgotten. The quickstart includes `npm install yahoo-finance2` as an explicit step.
- A future feature could surface a "data freshness" indicator on the positions table using `stock_metadata.fetched_at`. Out of scope for this work.
- A future feature could add a `/api/portfolio/positions` endpoint that returns the merged enriched list independent of analysis. The current plan keeps the merged view inside the analysis pipeline only.
