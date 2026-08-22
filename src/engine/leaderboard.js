import { CONFIG } from "./config.js";
import { isWellFormedTag } from "./identity.js";

// Leaderboard rules. Pure, so the same code runs in the browser and in the
// Cloudflare Worker — the client uses it to avoid pointless requests, the
// server uses it as the actual gate. The server never trusts the client.
//
// These caps stop casual tampering (a forged score in devtools), not a
// determined attacker: without replaying the run there is no way to prove a
// score was earned. Once world.step is pure and seeded, a submission can carry
// its seed and input trace and be re-simulated server-side, which closes that
// hole properly. The payload is shaped to allow that later without a migration.

const L = CONFIG.leaderboard;

/**
 * Is this submission plausible enough to store?
 * @param {{score:unknown, durationMs:unknown, level:unknown}} submission
 * @returns {{ok:true} | {ok:false, reason:string}}
 */
export function validateSubmission(submission) {
  const { score, durationMs, level } = submission ?? {};

  if (!Number.isInteger(score)) return { ok: false, reason: "score must be a whole number" };
  if (score < 0) return { ok: false, reason: "score cannot be negative" };
  if (score > L.maxScore) return { ok: false, reason: "score above the plausible maximum" };

  if (!Number.isFinite(durationMs)) return { ok: false, reason: "durationMs must be a number" };
  if (durationMs < L.minRunMs) return { ok: false, reason: "run too short to have earned a score" };

  const perSecond = score / (durationMs / 1000);
  if (perSecond > L.maxPointsPerSecond) return { ok: false, reason: "scored faster than is possible" };

  if (!Number.isInteger(level)) return { ok: false, reason: "level must be a whole number" };
  if (level < 1) return { ok: false, reason: "level cannot be below 1" };
  if (level > L.maxLevel) return { ok: false, reason: "level above the plausible maximum" };

  return { ok: true };
}

/** Leaderboards keep a player's best run, never their latest. */
export function bestOf(existingScore, incomingScore) {
  return Math.max(existingScore ?? 0, incomingScore);
}

/** 1-based position of a score on a board sorted high to low. */
export function rankOf(sortedScores, score) {
  let rank = 1;
  for (const s of sortedScores) {
    if (s > score) rank++;
    else break;
  }
  return rank;
}

/**
 * Rows the board should display, highest first.
 * @param {string} metric  "score" or "level" — which column ranks the board.
 *   Rows carry both; this only decides the sort, so client and Worker share
 *   the one rule for both the Points and the Level board.
 */
export function topRows(rows, limit = L.topLimit, metric = "score") {
  return [...rows]
    .sort((a, b) => b[metric] - a[metric] || String(a.tag).localeCompare(String(b.tag)))
    .slice(0, limit);
}

/**
 * A safe row count for /top, from whatever a caller asked for.
 *
 * Shared by the client (a "Top 25" screen wants more rows than the home
 * screen's preview) and the Worker (which must never trust a query string
 * outright) — one cap, so the two cannot drift apart. Garbage in gets the
 * default, not an error: a malformed `?limit=` is not worth a 400 over.
 */
export function clampTopLimit(requested) {
  const n = Math.floor(Number(requested));
  if (!Number.isFinite(n) || n <= 0) return L.topLimit;
  return Math.min(n, L.maxTopLimit);
}
/**
 * Turn the Worker's public rival rows into safe in-game profiles.
 * Player ids never enter this shape. Malformed rows and duplicate short names
 * are dropped, and the local player's own name is never spawned as a rival.
 */
export function rivalProfiles(rows, excludedTag = "", limit = 14) {
  const requested = Math.floor(Number(limit));
  const cap = Number.isFinite(requested) ? Math.max(0, requested) : 14;
  if (cap === 0) return [];
  const profiles = [];
  const seen = new Set();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!isWellFormedTag(row?.tag) || typeof row?.skinId !== "string") continue;
    const name = row.tag.replace(/-\d+$/, "");
    if (name === excludedTag || seen.has(name)) continue;
    seen.add(name);
    profiles.push({ name, skinId: row.skinId });
    if (profiles.length >= cap) break;
  }
  return profiles;
}
