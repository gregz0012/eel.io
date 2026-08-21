import { describe, it, expect } from "vitest";
import { ACHIEVEMENTS, isEarned, achievementById, checkAchievements } from "../src/engine/achievements.js";

describe("ACHIEVEMENTS", () => {
  it("has no duplicate ids", () => {
    const ids = ACHIEVEMENTS.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every achievement names a positive threshold on a real stat key", () => {
    for (const a of ACHIEVEMENTS) {
      expect(typeof a.stat).toBe("string");
      expect(a.threshold).toBeGreaterThan(0);
    }
  });
});

describe("isEarned", () => {
  it("is not earned below the threshold", () => {
    const a = { stat: "fishEaten", threshold: 100 };
    expect(isEarned(a, { fishEaten: 99 })).toBe(false);
  });

  it("is earned the instant the threshold is met", () => {
    const a = { stat: "fishEaten", threshold: 100 };
    expect(isEarned(a, { fishEaten: 100 })).toBe(true);
  });

  it("stays earned well past the threshold", () => {
    const a = { stat: "fishEaten", threshold: 100 };
    expect(isEarned(a, { fishEaten: 5000 })).toBe(true);
  });

  it("treats missing stats as zero, so nothing starts pre-earned", () => {
    const a = { stat: "fishEaten", threshold: 1 };
    expect(isEarned(a, undefined)).toBe(false);
  });
});

describe("achievementById", () => {
  it("finds a real achievement", () => {
    expect(achievementById("firstDive")?.name).toBe("First Dive");
  });

  it("returns undefined for an id an edited store invented", () => {
    expect(achievementById("not-a-real-id")).toBeUndefined();
  });
});

describe("checkAchievements", () => {
  it("unlocks nothing from an empty run", () => {
    const result = checkAchievements({}, []);
    expect(result.newlyUnlocked).toEqual([]);
    expect(result.unlockedIds).toEqual([]);
  });

  it("reports a newly crossed threshold", () => {
    const result = checkAchievements({ dives: 1 }, []);
    expect(result.newlyUnlocked).toContain("firstDive");
    expect(result.unlockedIds).toContain("firstDive");
  });

  it("does not re-report something already unlocked", () => {
    const result = checkAchievements({ dives: 1 }, ["firstDive"]);
    expect(result.newlyUnlocked).toEqual([]);
    expect(result.unlockedIds).toEqual(["firstDive"]);
  });

  it("can report several new unlocks in one call", () => {
    const result = checkAchievements({ dives: 1, fishEaten: 100 }, []);
    expect(result.newlyUnlocked.sort()).toEqual(["fish100", "firstDive"].sort());
  });

  it("preserves ids already unlocked even if the stats that earned them regressed", () => {
    // stats never actually go down, but the unlock record must not depend on
    // that — once earned, always earned, even against an edited store
    const result = checkAchievements({ dives: 0 }, ["firstDive"]);
    expect(result.unlockedIds).toEqual(["firstDive"]);
    expect(result.newlyUnlocked).toEqual([]);
  });

  it("treats missing state as never having played", () => {
    const result = checkAchievements(undefined, undefined);
    expect(result.newlyUnlocked).toEqual([]);
    expect(result.unlockedIds).toEqual([]);
  });
});
