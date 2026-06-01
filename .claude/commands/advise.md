---
description: Fetch the latest portfolio snapshot and produce a detailed financial analysis with actionable recommendations
---

1. Fetch the current portfolio via GET http://localhost:7788/api/portfolio.
2. Analyze the full portfolio data including:
   - Overall portfolio health and total value breakdown (stocks vs crypto)
   - Top 3 performers and any significant losers (by P&L %)
   - Concentration and sector risk
   - 3 specific, actionable recommendations grounded in the numbers
   - Any positions that warrant near-term monitoring
3. Format the response with clear markdown sections.
4. Be direct and data-driven — cite actual figures from the portfolio.

If the server is not running or no data exists, instruct the user to run `cosmos` and click Synchronize first.
