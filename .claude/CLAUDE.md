# Bubbly Cosmos — Project Reference

## What This Is
A personal portfolio dashboard that aggregates Trading 212 (stocks) and Binance (crypto, not yet implemented) into one local web UI. Runs at `http://localhost:7788`. Started with the `cosmos` fish shell function.

## Architecture

```
Browser (React 19 + Vite)
    ↕  REST + SSE
Fastify server (Node.js + TypeScript, tsx)
    ↕
  ├── SQLite cache (better-sqlite3, ~/.local/share/bubbly-cosmos/portfolio.db)
  ├── Trading 212 REST API (live.trading212.com)
  ├── Binance connector (STUB — not implemented)
  └── claude CLI subprocess (stream-json SSE → browser)
```

## Key Directories

| Path | Purpose |
|------|---------|
| `src/server/` | Fastify backend — routes, connectors, DB |
| `src/server/prompts/index.ts` | **All AI prompt text lives here** — edit this to tune analysis |
| `src/server/connectors/` | Trading 212 fetcher + Binance stub |
| `src/client/api/` | Frontend service layer (mirrors AnySkinCosmetics pattern) |
| `src/client/store/appStore.ts` | Zustand — UI state only (panel, loading flags) |
| `src/client/styles/` | SCSS — always use `$variables`, never hardcode hex |
| `.claude/commands/` | `/sync` and `/advise` slash commands |

## Dev Commands

```bash
npm run dev:server   # Fastify with hot-reload (tsx watch)
npm run dev:client   # Vite dev server on :5173 (proxies /api → :7788)
npm run build        # Vite build → dist/client/
npm start            # Production: Fastify serves dist/client/ on :7788
npm run lint         # Biome check
npm run format       # Biome format --write
```

## Starting the App (Production)

```bash
npm run build   # only needed after frontend changes
cosmos          # builds and starts, opens browser
```

## Configuration

Config file: `~/.config/bubbly-cosmos/config.toml` (copy from `config.example.toml`).

```toml
[trading212]
api_key = "..."       # bare token — sent as Authorization: <key>

[ai]
model  = "claude-sonnet-4-6"
effort = "high"       # low | medium | high | xhigh | max
```

## Updating AI Prompts

Open `src/server/prompts/index.ts`. All prompt templates are exported from `PROMPTS`. Edit the `advise` function to change how Claude analyzes the portfolio. No other file needs touching.

## Trading 212 API

- Base URL: `https://live.trading212.com/api/v0`
- Auth: `Authorization: <api_key>` (bare token, not Basic)
- Rate limits: account summary 1req/5s, positions 1req/1s → connector sleeps 1100ms between calls
- Key endpoints: `GET /equity/account/summary`, `GET /equity/positions`

## Binance Connector

Currently a stub — returns `{ assets: [], totalUsd: 0, note: "Not implemented" }`. Implement `src/server/connectors/binance.ts` when ready.

## SSE / AI Streaming

Route `GET /api/analyze/stream` spawns `claude -p <prompt> --output-format stream-json --verbose` and pipes events as SSE to the browser. The browser receives `text` events (full accumulated response — replace, not append) and a final `done` event with cost + duration.

## Code Style

- **Biome** for linting and formatting (not ESLint/Prettier). Run `npm run lint` before committing.
- **SCSS variables** from `_variables.scss` — no hardcoded hex in component files.
- **Service layer pattern**: all fetch calls go through `src/client/api/*.service.ts` classes.
- **Zustand** for UI state only; **React Query** for server/async state.
- No inline `any` casts in the client — use the types in `src/client/support/types.ts`.

## Smoke Tests

```bash
# Config loads
npx tsx -e "import { loadConfig } from './src/server/config.ts'; console.log(loadConfig())"

# DB creates
npx tsx -e "import { getDb } from './src/server/database.ts'; getDb(); console.log('DB OK')"

# Trading 212 connector
npx tsx src/server/connectors/trading212.ts

# Raw SSE stream
curl -N http://localhost:7788/api/analyze/stream
```
