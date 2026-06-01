# API Contracts: Currency Fix, USD Conversion & Dashboard Layout

Base URL: `http://localhost:7788`

---

## Existing Endpoints (modified responses)

### GET /api/portfolio

Returns the latest portfolio snapshot. Response shape is updated.

**Response** `200 OK`:
```json
{
  "trading212": {
    "summary": { "cash": 123.45, "invested": 40000.00, "total": 45320.00, "result": 5320.00, "currency": "PLN" },
    "positions": [
      { "ticker": "AAPL_US_EQ", "quantity": 5, "averagePrice": 150.00, "currentPrice": 175.00, "ppl": 125.00, "value": 875.00 }
    ]
  },
  "binance": { "assets": [], "totalUsd": 0, "note": "Not implemented" },
  "totalPln": 45320.00,
  "totalUsd": 11330.50,
  "exchangeRate": 4.0,
  "capturedAt": "2026-06-01T10:00:00.000Z"
}
```

**Note**: `totalUsd` and `exchangeRate` may be `null` if the exchange rate was unavailable during the last sync.

**Response** `404 Not Found`:
```json
{ "error": "No data yet. Click Synchronize." }
```

---

### POST /api/sync

Triggers a full sync: fetches T212 + Binance + PLN/USD exchange rate, stores snapshot and history row.

**Response** `200 OK`:
```json
{
  "ok": true,
  "positions": 12,
  "totalPln": 45320.00,
  "totalUsd": 11330.50,
  "exchangeRate": 4.0,
  "errors": {
    "trading212": null,
    "binance": null,
    "exchangeRate": null
  }
}
```

**Note**: `exchangeRate` error is non-fatal — `ok` may still be `true` even if the rate fetch failed. `totalUsd` will be `null` in that case.

---

## New Endpoints

### GET /api/portfolio/history

Returns all portfolio history data points for the dynamics chart, ordered oldest-first.

**Response** `200 OK`:
```json
[
  { "capturedAt": "2026-05-15T09:00:00.000Z", "totalPln": 40000.00, "totalUsd": 9900.00, "exchangeRate": 4.04 },
  { "capturedAt": "2026-06-01T10:00:00.000Z", "totalPln": 45320.00, "totalUsd": 11330.50, "exchangeRate": 4.00 }
]
```

**Response** `200 OK` (no history yet):
```json
[]
```
