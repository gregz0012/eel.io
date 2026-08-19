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
