// Lifetime stats, across every dive a player has ever taken. Pure: the shell
// increments a named counter as something happens and persists the result;
// this module only knows how to fold one event into the running totals.
//
// Deliberately a small generic pair rather than one named function per stat —
// there are close to twenty countable events (see the shell's call sites),
// and twenty near-identical one-line wrappers would be worse to read than the
// two functions below plus a self-explanatory string key at each call site.

/** Add `amount` (default 1) to a named counter. Never goes backwards. */
export function recordEvent(stats, key, amount = 1) {
  const next = { ...(stats ?? {}) };
  next[key] = (next[key] ?? 0) + Math.max(0, amount ?? 0);
  return next;
}

/** Track a running maximum under a named key (e.g. the longest the eel has ever grown). */
export function recordMax(stats, key, value) {
  const next = { ...(stats ?? {}) };
  next[key] = Math.max(next[key] ?? 0, value ?? 0);
  return next;
}

/** Read a counter, defending against a missing key or an edited store. */
export function statValue(stats, key) {
  return Math.max(0, Number(stats?.[key]) || 0);
}
