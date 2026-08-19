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
