-- Contract: stock_metadata table
-- Added to src/server/database.ts inside getDb()'s _db.exec block.
-- Idempotent (IF NOT EXISTS) so existing installs auto-migrate on next server start.

CREATE TABLE IF NOT EXISTS stock_metadata (
    ticker      TEXT PRIMARY KEY,
    sector      TEXT,
    industry    TEXT,
    asset_type  TEXT NOT NULL DEFAULT 'Unknown',
    long_name   TEXT,
    fetched_at  TEXT NOT NULL
);

-- Upsert form used by upsertStockMetadata():
--   INSERT INTO stock_metadata (ticker, sector, industry, asset_type, long_name, fetched_at)
--   VALUES (?, ?, ?, ?, ?, ?)
--   ON CONFLICT(ticker) DO UPDATE SET
--       sector     = excluded.sector,
--       industry   = excluded.industry,
--       asset_type = excluded.asset_type,
--       long_name  = excluded.long_name,
--       fetched_at = excluded.fetched_at;

-- Read form used by loadStockMetadata(tickers):
--   SELECT ticker, sector, industry, asset_type, long_name, fetched_at
--   FROM stock_metadata
--   WHERE ticker IN (?, ?, ...);
