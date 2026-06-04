---
description: Update the known-instruments seed data in the app from the local wiki notes (etfs.md and stocks.md). Run this whenever notes change.
triggers:
  - update instruments
  - sync instruments
  - refresh known instruments
  - update known etfs
  - update known stocks
---

# Update Known Instruments

Read the two source-of-truth note files:
- ~/Desktop/dev/ai-notes/Finances/Trading/strategy/etfs.md
- ~/Desktop/dev/ai-notes/Finances/Trading/strategy/stocks.md

Then rewrite `src/server/data/known-instruments.ts` so that the `KNOWN_INSTRUMENTS` array reflects every instrument catalogued in both notes.

Rules:
1. ETFs from etfs.md → `type: 'ETF'`; Bonds (AGGH, IEAG) → `type: 'Bond'`
2. Stocks from stocks.md → `type: 'Stock'`
3. `baseTicker` = the plain ticker from the notes (VWCE, BRKS, JD, etc.)
4. Use the market, sector, industry, and index columns from each note's Quick Reference table directly
5. Do NOT remove instruments that are in the current seed file but absent from the notes — ask the user first
6. After updating the file, remind the user to restart the app so the DB is re-seeded: `npm run dev:server`
