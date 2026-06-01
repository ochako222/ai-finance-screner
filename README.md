# Alex Financial Screener ✦

A personal portfolio dashboard that aggregates Trading 212 (stocks) and Binance (crypto, stub) into a single dark-themed local web app running at `http://localhost:7788`.

## Prerequisites

- Node.js 22+
- [Claude Code CLI](https://docs.anthropic.com/claude-code) installed and authenticated (`claude` must be on PATH — used for AI analysis)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure API keys

```bash
cp config.example.toml config.toml
```

Edit `config.toml` and fill in your credentials:

```toml
[trading212]
api_key = "your-trading212-api-key"   # Settings → API in the T212 app

[binance]
api_key    = "your-binance-api-key"   # not used yet (stub)
api_secret = "your-binance-secret"

[app]
port = 7788

[ai]
model  = "claude-sonnet-4-6"
effort = "high"   # low | medium | high | max
```

The Trading 212 API key is a bare token — find it in the T212 app under **Settings → API**.

## Launch

### Production (recommended)

```bash
npm run build
npm start
```

Or use the `cosmos` fish function (added automatically during setup):

```fish
cosmos   # builds frontend, starts server, opens browser
```

The browser opens automatically at `http://localhost:7788`.

### Development (hot reload)

Run the server and client in two separate terminals:

```bash
# Terminal 1 — Fastify server with hot-reload
npm run dev:server

# Terminal 2 — Vite dev server on :5173 (proxies /api to :7788)
npm run dev:client
```

Then open `http://localhost:5173`.

## Usage

| Action | How |
|--------|-----|
| Fetch live data | Click **Synchronize** — fetches Trading 212 positions and saves a snapshot |
| AI analysis | Click **Advise** — streams a portfolio analysis via Claude |
| Close AI panel | Click **×**, press **Escape**, or click the backdrop |

Data is cached in SQLite at `~/.local/share/alex-financial-screener/portfolio.db`. Each sync appends a new snapshot; the dashboard always shows the latest.

## Project Structure

```
src/
├── server/
│   ├── connectors/      # Trading 212 fetcher, Binance stub
│   ├── prompts/         # AI prompt templates (edit here to tune analysis)
│   ├── routes/          # /api/portfolio  /api/sync  /api/analyze/stream
│   ├── config.ts        # Loads config.toml from project root
│   ├── database.ts      # SQLite snapshot store
│   └── index.ts         # Fastify server entry point
└── client/
    ├── api/             # Service layer (typed fetch wrappers)
    ├── components/      # Header, SummaryCards, StocksTable, CryptoTable, AllocationChart, AiPanel
    ├── hooks/           # usePortfolio, useSync
    ├── pages/           # DashboardPage
    ├── store/           # Zustand UI state
    └── styles/          # SCSS with design tokens
```

## Tuning the AI Prompt

All prompt text lives in `src/server/prompts/index.ts`. Edit the `advise` function there — no other file needs changing.

## Scripts

```bash
npm run dev:server   # Fastify with tsx watch
npm run dev:client   # Vite dev server
npm run build        # Production frontend build
npm start            # Production server (serves dist/client/)
npm run lint         # Biome check
npm run format       # Biome format --write
```
