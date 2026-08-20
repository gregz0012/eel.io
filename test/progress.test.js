import { describe, it, expect } from "vitest";
import { addPlayTime, miniGameDue, recordMiniGameReward } from "../src/engine/progress.js";
import { CONFIG } from "../src/engine/config.js";

const EVERY = CONFIG.miniGames.everyMs;

describe("addPlayTime", () => {
  it("accumulates across dives", () => {
    let state = { playedMs: 0, lastRewardAtMs: 0 };
    state = addPlayTime(state, 1000);
    state = addPlayTime(state, 2000);
    expect(state.playedMs).toBe(3000);
  });

  it("starts from nothing when no state exists yet", () => {
    expect(addPlayTime(undefined, 500).playedMs).toBe(500);
  });

  it("ignores a negative duration rather than going backwards", () => {
    expect(addPlayTime({ playedMs: 1000, lastRewardAtMs: 0 }, -500).playedMs).toBe(1000);
  });

  it("does not mutate the state it is given", () => {
    const before = { playedMs: 100, lastRewardAtMs: 0 };
    addPlayTime(before, 500);
    expect(before).toEqual({ playedMs: 100, lastRewardAtMs: 0 });
  });
});

describe("miniGameDue", () => {
  it("is not due before enough play has accumulated", () => {
    expect(miniGameDue({ playedMs: EVERY - 1, lastRewardAtMs: 0 })).toBe(false);
  });

  it("becomes due the instant enough play has accumulated", () => {
    expect(miniGameDue({ playedMs: EVERY, lastRewardAtMs: 0 })).toBe(true);
  });

  it("is due again a full interval after the last reward, not from zero", () => {
    const state = { playedMs: EVERY * 2, lastRewardAtMs: EVERY };
    expect(miniGameDue(state)).toBe(true);
  });

  it("is not due again until a full interval has passed since the last reward", () => {
    const state = { playedMs: EVERY * 2 - 1, lastRewardAtMs: EVERY };
    expect(miniGameDue(state)).toBe(false);
  });

  it("treats missing state as never having played", () => {
    expect(miniGameDue(undefined)).toBe(false);
  });
});

describe("recordMiniGameReward", () => {
  it("resets the timer to right now", () => {
    const after = recordMiniGameReward({ playedMs: EVERY, lastRewardAtMs: 0 });
    expect(after.lastRewardAtMs).toBe(EVERY);
    expect(miniGameDue(after)).toBe(false);
  });

  it("leaves the played total untouched", () => {
    expect(recordMiniGameReward({ playedMs: EVERY, lastRewardAtMs: 0 }).playedMs).toBe(EVERY);
  });

  it("is the only thing that resets the timer — merely playing on does not", () => {
    let state = { playedMs: 0, lastRewardAtMs: 0 };
    state = addPlayTime(state, EVERY);
    expect(miniGameDue(state)).toBe(true);
    state = addPlayTime(state, 1000);       // more play, no reward taken
    expect(miniGameDue(state)).toBe(true);  // still due — nothing reset it
  });

  it("cannot be earned twice from the same block of play", () => {
    let state = { playedMs: EVERY, lastRewardAtMs: 0 };
    state = recordMiniGameReward(state);
    expect(miniGameDue(state)).toBe(false);
  });
});
