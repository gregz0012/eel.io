import { CONFIG } from "./config.js";

// Cumulative playtime, and the rule for when a calming mini-game is due.
// Pure: playtime enters as milliseconds already elapsed (the shell computes
// that from its own clock), never read from a clock in here.

const M = CONFIG.miniGames;

/**
 * Add a dive's duration to the running total.
 * @param {{playedMs:number, lastRewardAtMs:number}} state
 * @param {number} ms
 */
export function addPlayTime(state, ms) {
  return {
    playedMs: Math.max(0, (state?.playedMs ?? 0) + Math.max(0, ms ?? 0)),
    lastRewardAtMs: state?.lastRewardAtMs ?? 0,
  };
}

/**
 * Is a mini-game due? True once CONFIG.miniGames.everyMs of cumulative play
 * has passed since the last one was actually completed. Merely opening and
 * skipping one does not reset this — only finishing it does, so the offer
 * keeps coming back until a player actually takes the break.
 */
export function miniGameDue(state) {
  const playedMs = state?.playedMs ?? 0;
  const lastRewardAtMs = state?.lastRewardAtMs ?? 0;
  return playedMs - lastRewardAtMs >= M.everyMs;
}

/** Record that a mini-game was completed just now, resetting the timer. */
export function recordMiniGameReward(state) {
  return { playedMs: state?.playedMs ?? 0, lastRewardAtMs: state?.playedMs ?? 0 };
}
