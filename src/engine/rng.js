// Seeded randomness.
//
// The engine may not reach for Math.random — that is ambient nondeterminism and
// it makes a test meaningless. Anything random takes an `rng` argument instead:
// a function returning a number in [0, 1), exactly like Math.random.
//
// Tests seed one of these so a roll is repeatable. The shell passes Math.random,
// because real randomness is a side effect and side effects live in the shell.

/**
 * mulberry32 — small, fast, and good enough for a game. Same seed, same stream.
 * @param {number} seed
 * @returns {() => number} values in [0, 1)
 */
export function seededRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** An integer in [min, max], inclusive. */
export function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/**
 * Pick one entry from `[{weight, ...}]`, proportional to weight.
 * Entries with no weight, or a weight of zero, are never picked.
 */
export function weightedPick(rng, entries) {
  const total = entries.reduce((n, e) => n + Math.max(0, e.weight ?? 0), 0);
  if (total <= 0) return null;
  let roll = rng() * total;
  for (const entry of entries) {
    roll -= Math.max(0, entry.weight ?? 0);
    if (roll < 0) return entry;
  }
  return entries[entries.length - 1];      // only reachable on floating point slop
}

// FNV-1a, 32-bit. Small, fast and deterministic — not a security hash, and it
// does not need to be. Used to turn an arbitrary string (a player id, a date)
// into a seed; the string is the secret or the calendar, this is only a mix.
export function hash32(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * A seed derived from a calendar date, so every player computing the same
 * date gets the same seed — and so the same daily challenge — without any
 * server involved. Pass a UTC date key (e.g. "2026-08-21"), never a
 * locale-sensitive date string: two players in different timezones must
 * agree on which day it is for "the same challenge, everywhere" to hold.
 */
export function seedFromDate(isoDate) {
  return hash32(String(isoDate));
}
