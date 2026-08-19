// Tunables for the pure game core. Balance changes happen here, never as magic
// numbers inside logic, so tests can pin them and playtesting can move them.
//
// Only the scoring/levelling slice has been migrated so far. Spawn counts and
// entity tunables still live in the shell and move here with their own slice.
export const CONFIG = {
  // scoring & levels
  pointsPerLevel: 120,      // score needed per level; levels are sticky (never fall)

  // difficulty ramp
  predatorsBase: 3,         // predators in the sea at level 1
  levelsPerPredator: 2,     // +1 predator every N levels
  bossEveryLevels: 10,      // a boss is unleashed every N levels

  // per-level speed reward, capped so the eel stays controllable
  levelSpeedPerLevel: 0.015,
  levelSpeedMax: 1.4,
};
