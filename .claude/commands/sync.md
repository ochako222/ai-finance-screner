---
description: Trigger a portfolio sync from Trading 212 and Binance, then show a summary
---

Run POST /api/sync against the local bubbly-cosmos server (http://localhost:7788/api/sync).

Print a concise sync summary: how many positions were fetched, total portfolio value in USD, and any connector errors.

If the server is not running, remind the user to start it with `cosmos`.
