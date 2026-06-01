<!--
SYNC IMPACT REPORT
==================
Version change: [TEMPLATE] → 1.0.0
Modified principles: none (initial fill from template)
Added sections:
  - I. Code Quality & Type Safety
  - II. Testing Standards
  - III. User Experience Consistency
  - IV. Performance & Reliability
  - V. Layered Architecture
  - Tech Stack Constraints
  - Development Workflow
  - Governance
Removed sections: none (initial)
Templates updated:
  - ✅ .specify/templates/plan-template.md — Constitution Check gates aligned
  - ✅ .specify/templates/spec-template.md — no structural changes required
  - ✅ .specify/templates/tasks-template.md — no structural changes required
Deferred TODOs: none
-->

# Bubbly Cosmos Constitution

## Core Principles

### I. Code Quality & Type Safety

All TypeScript code MUST compile with zero errors under `tsc --noEmit`. No inline `any`
casts are permitted in client code — every value crossing a module boundary MUST be
typed using the shared type definitions in `src/client/support/types.ts` (client) or
equivalent server-side interfaces. Server code MUST use typed Fastify route schemas so
request/response shapes are validated at the boundary, not assumed internally.

Biome (`npm run lint`) MUST pass with zero errors before a commit merges. Auto-formatting
via `npm run format` is the single source of formatting truth — no manual style debates.

Code MUST follow the patterns established in the AnySkinCosmetics reference codebase:
- Service layer pattern: all fetch/API calls go through `src/client/api/*.service.ts`
  classes — never raw `fetch` in components.
- SCSS variables from `src/client/styles/_variables.scss` for ALL color values — no
  hardcoded hex in component files. New colors MUST be added to `_variables.scss` first.
- State separation: Zustand handles UI-only state; React Query handles all async/server
  state. Never mix them.
- Structured logging on the server side (same pattern as AnySkinCosmetics
  `logging_config.py` equivalent) — unstructured `console.log` in production paths is
  not permitted.

**Rationale**: Type safety and consistent patterns eliminate entire classes of runtime
errors and make the codebase navigable as new connectors (Binance, future exchanges) are
added.

### II. Testing Standards

Unit tests MUST be written with **Vitest + React Testing Library**. Tests are OPTIONAL
per feature — but when they are requested in a spec, they MUST be written before
implementation (TDD: Red → Green → Refactor).

Integration tests MUST cover each external API connector (Trading 212, Binance once
implemented). Connectors MUST be testable in isolation via a recorded/mocked HTTP layer
so tests run without live credentials.

Page components with heavy dependencies (router, store, API) SHOULD be covered by
Playwright E2E tests rather than unit tests (mirrors AnySkinCosmetics pattern). Unit
tests focus on services, utilities, and data transformations.

Pre-commit: `npm run lint` MUST pass. If a test suite exists, `npm run test -- --run`
MUST pass before merge.

**Rationale**: Trading and financial data pipelines require high confidence. A failing
connector MUST be caught in CI, not discovered live when a user's portfolio is stale.

### III. User Experience Consistency

All UI components MUST follow the existing dark-theme visual language defined in
`src/client/styles/`. No component may introduce a new color, spacing unit, or typography
scale without first adding it to `_variables.scss`.

Loading, error, and empty states MUST be handled explicitly for every data-fetching
component — a blank screen is never acceptable. Use React Query's `isLoading`, `isError`,
and empty-data guards consistently.

SSE streaming responses (AI analysis) MUST display incremental progress to the user —
the replace-not-append pattern established in the existing stream handler MUST be
preserved. Users MUST receive a visible cost + duration summary after each analysis.

Financial figures MUST always display with explicit currency symbols and locale-formatted
numbers (e.g., `$1,234.56`, `€1.234,56`). Raw unformatted numbers are not permitted in
the UI.

**Rationale**: Inconsistent feedback on a financial dashboard erodes trust. Users watching
their portfolio need clear, predictable visual patterns.

### IV. Performance & Reliability

API connector calls to Trading 212 MUST respect documented rate limits: account summary
≤ 1 req/5 s, positions ≤ 1 req/1 s. The connector MUST sleep 1100 ms between position
calls. Violating rate limits and getting banned is a production outage.

SQLite cache MUST be used as the primary read path for the UI. Live API calls MUST only
be triggered explicitly (sync action) or on a scheduled interval — never on every page
load.

The Fastify server MUST respond to health-check requests within 200 ms. AI analysis
streaming MUST begin emitting tokens within 3 s of the request (first SSE event).

The Binance connector stub MUST remain a proper stub (returns `{ assets: [], totalUsd: 0,
note: "Not implemented" }`) — it MUST NOT make real network calls until fully implemented.

**Rationale**: Rate-limit violations lock the user out of live data. Cache-first ensures
the dashboard is usable even when external APIs are degraded.

### V. Layered Architecture

The architecture MUST remain in three layers:

1. **Browser (React 19 + Vite)** — presentation only; no direct DB or API access.
2. **Fastify server (Node.js + TypeScript)** — all business logic, caching, AI
   orchestration, and connector coordination.
3. **External connectors** — Trading 212, Binance (future), claude CLI subprocess.

New features MUST be placed in the correct layer. Adding a new exchange connector means
adding a file in `src/server/connectors/` and a route in `src/server/`; it MUST NOT
bypass the server layer by calling external APIs from the browser.

All AI prompt text MUST live in `src/server/prompts/index.ts`. No prompt strings are
permitted elsewhere.

**Rationale**: Clear layer separation ensures the browser never holds API keys and allows
the server to enforce rate limits and caching centrally.

## Tech Stack Constraints

- **Runtime**: Node.js (current LTS). The `better-sqlite3` native module requires the
  Node ABI to match the installed binary — always run `npm install` after a Node version
  change.
- **Linter/Formatter**: Biome only. ESLint and Prettier MUST NOT be added.
- **CSS**: SCSS with Sass. No CSS-in-JS libraries (Emotion, styled-components, etc.).
- **State**: Zustand (UI) + React Query (server). No Redux, MobX, or Context API for
  state management.
- **HTTP client (server side)**: `undici`. No `axios` or `node-fetch`.
- **Config**: `~/.config/bubbly-cosmos/config.toml` via `smol-toml`. API keys MUST
  NOT be committed to the repository or hardcoded.
- **Database**: SQLite via `better-sqlite3` at `~/.local/share/bubbly-cosmos/portfolio.db`.
  No ORM. Raw SQL with typed wrappers.

## Development Workflow

- **Dev server**: `npm run dev:server` (Fastify, hot-reload) + `npm run dev:client`
  (Vite on :5173 proxying /api → :7788). Both MUST be running for local development.
- **Production**: `npm run build` then `cosmos` (or `npm start`). Never serve the Vite
  dev server in production.
- **Before committing**: `npm run lint` MUST pass. Run smoke tests from CLAUDE.md when
  touching connectors or the database layer.
- **Branch strategy**: feature branches off `master`; PR to `master`. No direct pushes
  to `master`.
- **Commit granularity**: one logical change per commit. Do not bundle unrelated fixes.

## Governance

This constitution supersedes all other conventions documented elsewhere. Any practice
that contradicts a principle here is invalid until the constitution is amended.

**Amendment procedure**:
1. Propose the change with rationale in a PR description.
2. Increment `CONSTITUTION_VERSION` per semantic versioning rules.
3. Update `LAST_AMENDED_DATE` to the amendment date.
4. Propagate changes to dependent templates (plan, spec, tasks) in the same PR.

**Compliance review**: Every feature PR MUST include a Constitution Check section in its
`plan.md` that explicitly gates on all five principles. A plan that omits this section
MUST be rejected.

**Versioning policy**:
- MAJOR: removing or redefining a principle.
- MINOR: new principle or materially expanded guidance.
- PATCH: clarifications, wording, typo fixes.

Use `CLAUDE.md` and `.specify/memory/` files for runtime development guidance. This
constitution is the authoritative governance document.

**Version**: 1.0.0 | **Ratified**: 2026-06-01 | **Last Amended**: 2026-06-01
