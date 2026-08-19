import { CONFIG } from "./config.js";

// Scoring and levelling. Pure: no globals, no clock, no randomness.
//
// A level-up has consequences elsewhere in the world (more predators, a boss on
// every tenth level). A pure function cannot spawn those, so addScore reports
// the levels crossed and the caller applies them. That keeps the boss rule
// testable instead of hiding it in a side effect.

/**
 * @param {{score:number, level:number}} state
 * @param {number} n  points to add; may be negative
 * @returns {{score:number, level:number, levelsGained:number[]}}
 */
export function addScore(state, n) {
  const score = Math.max(0, state.score + n);
  const level = Math.max(state.level, 1 + Math.floor(score / CONFIG.pointsPerLevel));
  const levelsGained = [];
  for (let L = state.level + 1; L <= level; L++) levelsGained.push(L);
  return { score, level, levelsGained };
}

/**
 * Take a level away — the one thing that can lower it.
 *
 * Levels are sticky against *losing points*, so dropping the level alone would
 * be undone by the next fish the player ate: addScore would recompute the level
 * from the score and put it straight back. So a deduction drops the score to
 * the floor of the level below, keeping the two consistent. This is only
 * reachable from a present (see engine/presents.js); nothing else may call it.
 */
export function deductLevel(state) {
  const level = Math.max(1, state.level - 1);
  if (level === state.level) return { score: state.score, level };
  return { score: Math.min(state.score, (level - 1) * CONFIG.pointsPerLevel), level };
}

/** How many predators should be hunting at this level. */
export function predatorTarget(level) {
  return CONFIG.predatorsBase + Math.floor(level / CONFIG.levelsPerPredator);
}

/** Does reaching this level unleash a boss? */
export function isBossLevel(level) {
  return level > 0 && level % CONFIG.bossEveryLevels === 0;
}

/** Speed multiplier earned by reaching this level. */
export function levelSpeed(level) {
  return Math.min(1 + (level - 1) * CONFIG.levelSpeedPerLevel, CONFIG.levelSpeedMax);
}
