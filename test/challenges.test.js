import { describe, it, expect } from "vitest";
import {
  CHALLENGE_POOL, challengeForDate, challengeProgress, isChallengeComplete,
} from "../src/engine/challenges.js";

describe("CHALLENGE_POOL", () => {
  it("has no duplicate ids", () => {
    const ids = CHALLENGE_POOL.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every challenge names a positive target and reward", () => {
    for (const c of CHALLENGE_POOL) {
      expect(c.target).toBeGreaterThan(0);
      expect(c.reward).toBeGreaterThan(0);
    }
  });
});

describe("challengeForDate", () => {
  it("is deterministic: the same date always picks the same challenge", () => {
    expect(challengeForDate("2026-08-21")).toEqual(challengeForDate("2026-08-21"));
  });

  it("different dates can pick different challenges", () => {
    const picks = new Set();
    for (let d = 1; d <= 28; d++) {
      picks.add(challengeForDate(`2026-01-${String(d).padStart(2, "0")}`).id);
    }
    expect(picks.size).toBeGreaterThan(1);
  });

  it("always picks a real entry from the pool", () => {
    for (let d = 1; d <= 28; d++) {
      const c = challengeForDate(`2026-03-${String(d).padStart(2, "0")}`);
      expect(CHALLENGE_POOL.map(x => x.id)).toContain(c.id);
    }
  });
});

describe("challengeProgress", () => {
  const c = { stat: "fishEaten", target: 50 };

  it("is the rise since the baseline, not the lifetime total", () => {
    expect(challengeProgress(c, { fishEaten: 130 }, { fishEaten: 100 })).toBe(30);
  });

  it("is zero when nothing has changed since the baseline", () => {
    expect(challengeProgress(c, { fishEaten: 100 }, { fishEaten: 100 })).toBe(0);
  });

  it("never goes negative, even against an edited store", () => {
    expect(challengeProgress(c, { fishEaten: 10 }, { fishEaten: 100 })).toBe(0);
  });

  it("treats a missing baseline as zero, so progress is the full lifetime count", () => {
    expect(challengeProgress(c, { fishEaten: 40 }, undefined)).toBe(40);
  });
});

describe("isChallengeComplete", () => {
  const c = { stat: "fishEaten", target: 50 };

  it("is not complete below the target", () => {
    expect(isChallengeComplete(c, { fishEaten: 149 }, { fishEaten: 100 })).toBe(false);
  });

  it("is complete the instant the target is reached", () => {
    expect(isChallengeComplete(c, { fishEaten: 150 }, { fishEaten: 100 })).toBe(true);
  });

  it("stays complete well past the target", () => {
    expect(isChallengeComplete(c, { fishEaten: 500 }, { fishEaten: 100 })).toBe(true);
  });
});
