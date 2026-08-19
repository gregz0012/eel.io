-- Voltfin leaderboard.
--
-- Deliberately minimal. We store a random id the player's browser generated,
-- their best score, and when it happened. No IP addresses, no user agents, no
-- names typed by a human, nothing that identifies a person or a device.
-- The display tag is derived from the id on read, never stored or submitted.

CREATE TABLE IF NOT EXISTS scores (
  id             TEXT PRIMARY KEY,   -- random UUID from the player's browser
  score          INTEGER NOT NULL,
  duration_ms    INTEGER NOT NULL,
  created_at     INTEGER NOT NULL,   -- ms since epoch, first submission
  updated_at     INTEGER NOT NULL    -- ms since epoch, last accepted submission
);

CREATE INDEX IF NOT EXISTS scores_by_score ON scores (score DESC);
