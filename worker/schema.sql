-- Voltfin leaderboard.
--
-- Deliberately minimal. We store a random id the player's browser generated,
-- their best score, their best level, latest catalogue skin, and when it
-- happened. No IP addresses, no user agents, no names typed by a human,
-- nothing that identifies a person or a device. The display tag is derived
-- from the id on read, never stored or submitted.
--
-- CREATE TABLE IF NOT EXISTS only helps a fresh database — it is a no-op
-- against the live one, which already existed before `level` did. That one
-- needs worker/migrations/0001_add_level.sql run once by hand; see CLAUDE.md
-- §7 for the command. This file just keeps a fresh deploy correct from the
-- start.

CREATE TABLE IF NOT EXISTS scores (
  id             TEXT PRIMARY KEY,   -- random UUID from the player's browser
  score          INTEGER NOT NULL,
  level          INTEGER NOT NULL DEFAULT 1,
  duration_ms    INTEGER NOT NULL,
  created_at     INTEGER NOT NULL,   -- ms since epoch, first submission
  updated_at     INTEGER NOT NULL    -- ms since epoch, last accepted submission
);

CREATE INDEX IF NOT EXISTS scores_by_score ON scores (score DESC);
CREATE INDEX IF NOT EXISTS scores_by_level ON scores (level DESC);

-- Public rival appearance is deliberately separate from scores so this can
-- be added idempotently to the existing D1 database. The Worker returns only
-- a derived anonymous tag and a catalogue skin id; it never returns this id.
CREATE TABLE IF NOT EXISTS profiles (
  id             TEXT PRIMARY KEY,
  skin_id        TEXT NOT NULL DEFAULT 'volt',
  updated_at     INTEGER NOT NULL
);
