import { CONFIG } from "./config.js";

// Scoring and levelling. Pure: no globals, no clock, no randomness.
//
// Two ways up, and only two. Score carries a player as far as
// CONFIG.scoreLevelCap — one level, enough to grow a little and learn the
// controls. Past that the only way up is killing the boss guarding the level
// you are on, which is `completeLevel`. Points never stop mattering (they are
// the bank and the leaderboard); they just stop buying levels.
//
// A level-up has consequences elsewhere in the world — more predators, the next
// boss. A pure function cannot spawn those, so both routes report the levels
// crossed in the same `levelsGained` shape and the caller applies them. That
// keeps the boss rule testable instead of hiding it in a side effect.

/**
 * @param {{score:number, level:number}} state
 * @param {number} n  points to add; may be negative
 * @returns {{score:number, level:number, levelsGained:number[]}}
 */
export function addScore(state, n) {
  const score = Math.max(0, state.score + n);
  const earned = 1 + Math.floor(score / CONFIG.pointsPerLevel);
  // Never past the cap, and never downwards: a level, once reached, is kept.
  const level = Math.max(state.level, Math.min(earned, CONFIG.scoreLevelCap));
  const levelsGained = [];
  for (let L = state.level + 1; L <= level; L++) levelsGained.push(L);
  return { score, level, levelsGained };
}

/**
 * The boss guarding this level is dead: pass through to the next one.
 *
 * Deliberately the same return shape as addScore, so the shell applies a level
 * won by combat through exactly the same path as one won by points — one set
 * of side effects, not two that can drift apart.
 *
 * @param {{score:number, level:number}} state
 * @returns {{score:number, level:number, levelsGained:number[]}}
 */
export function completeLevel(state) {
  const level = state.level + 1;
  return { score: state.score, level, levelsGained: [level] };
}

/**
 * How many hits the boss guarding a level takes: the level number itself.
 * Level 2 is two hits, level 15 is fifteen — the whole difficulty curve.
 */
export function bossHits(level) {
  return Math.max(1, level);
}

/** How many predators should be hunting at this level. */
export function predatorTarget(level) {
  return CONFIG.predatorsBase + Math.floor(level / CONFIG.levelsPerPredator);
}

/** Is this level guarded by a boss? Every level from the first one on. */
export function isBossLevel(level) {
  return level >= CONFIG.boss.firstLevel;
}

/** Speed multiplier earned by reaching this level. */
export function levelSpeed(level) {
  return Math.min(1 + (level - 1) * CONFIG.levelSpeedPerLevel, CONFIG.levelSpeedMax);
}
