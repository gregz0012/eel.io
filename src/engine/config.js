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

  // the bank: points earned in a dive are banked, and spent on skins
  bank: {
    diveCost: 10,   // charged per dive; a player who cannot afford it dives free
  },

  // leaderboard limits. The game client and the Worker both import these, so a
  // cap only has to be changed in one place to hold on both sides.
  leaderboard: {
    topLimit: 10,           // rows shown on the board
    maxScore: 1000000,      // nothing above this is a real run
    maxPointsPerSecond: 60, // generous: a great run stays under it, score=9e9 does not
    minRunMs: 3000,         // a run shorter than this cannot have earned anything
    submitCooldownMs: 5000, // per player, server-enforced
  },
};
