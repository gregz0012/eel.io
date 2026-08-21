-- One-off migration for the leaderboard split (#39).
--
-- schema.sql's CREATE TABLE IF NOT EXISTS is a no-op against a database that
-- already has the scores table — which the live one does, from before `level`
-- existed. This file is what actually adds the column there. Run it once, by
-- hand, against the live D1 database:
--
--   cd worker
--   npx wrangler d1 execute eelio --remote --file=./migrations/0001_add_level.sql
--
-- Safe to run more than once on a fresh database (schema.sql's CREATE TABLE
-- already includes `level`, so ADD COLUMN would fail there) — this migration
-- is only for a database that predates it.

ALTER TABLE scores ADD COLUMN level INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS scores_by_level ON scores (level DESC);
