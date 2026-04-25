-- Cache for live flight data from AeroDataBox / fallbacks.
-- Shared across all users and serverless instances.
-- One row per (flight_key, iso_date), refreshed at most once every 3 hours.

CREATE TABLE IF NOT EXISTS flight_live_cache (
  flight_key  TEXT        NOT NULL,          -- e.g. "AA900"
  iso_date    TEXT        NOT NULL,          -- e.g. "2026-04-25"
  data        JSONB       NOT NULL,
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (flight_key, iso_date)
);

-- Auto-purge rows older than 3 days (only today/tomorrow are ever queried)
CREATE INDEX IF NOT EXISTS flight_live_cache_fetched_at_idx
  ON flight_live_cache (fetched_at);

-- Service role only — no RLS needed (accessed only from route handler)
ALTER TABLE flight_live_cache DISABLE ROW LEVEL SECURITY;
