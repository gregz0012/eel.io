import { describe, it, expect } from "vitest";
import { addScore, predatorTarget, isBossLevel, levelSpeed } from "../src/engine/scoring.js";
import { CONFIG } from "../src/engine/config.js";

describe("addScore", () => {
  it("levels up once per pointsPerLevel", () => {
    const s = addScore({ score: 0, level: 1 }, CONFIG.pointsPerLevel);
    expect(s.level).toBe(2);
  });

  it("does not level up a point short", () => {
    const s = addScore({ score: 0, level: 1 }, CONFIG.pointsPerLevel - 1);
    expect(s.level).toBe(1);
    expect(s.levelsGained).toEqual([]);
  });

  it("never lowers the level when points are lost", () => {
    const s = addScore({ score: 240, level: 3 }, -200);
    expect(s.level).toBe(3);   // sticky
    expect(s.score).toBe(40);
  });

  it("clamps the score at zero", () => {
    expect(addScore({ score: 10, level: 1 }, -999).score).toBe(0);
  });

  it("reports every level crossed when a big score lands at once", () => {
    const s = addScore({ score: 0, level: 1 }, CONFIG.pointsPerLevel * 3);
    expect(s.level).toBe(4);
    expect(s.levelsGained).toEqual([2, 3, 4]);
  });

  it("does not mutate the state it is given", () => {
    const before = { score: 0, level: 1 };
    addScore(before, 500);
    expect(before).toEqual({ score: 0, level: 1 });
  });
});

describe("difficulty ramp", () => {
  it("adds a predator every two levels", () => {
    expect(predatorTarget(1)).toBe(CONFIG.predatorsBase);
    expect(predatorTarget(2)).toBe(CONFIG.predatorsBase + 1);
    expect(predatorTarget(3)).toBe(CONFIG.predatorsBase + 1);
    expect(predatorTarget(10)).toBe(CONFIG.predatorsBase + 5);
  });

  it("unleashes a boss every tenth level and no other", () => {
    const bossLevels = [];
    for (let L = 1; L <= 30; L++) if (isBossLevel(L)) bossLevels.push(L);
    expect(bossLevels).toEqual([10, 20, 30]);
  });

  it("never treats level zero as a boss level", () => {
    expect(isBossLevel(0)).toBe(false);
  });
});

describe("levelSpeed", () => {
  it("gives no bonus at level 1", () => {
    expect(levelSpeed(1)).toBe(1);
  });

  it("rises gently with level", () => {
    expect(levelSpeed(11)).toBeCloseTo(1 + 10 * CONFIG.levelSpeedPerLevel);
  });

  it("stays capped so the eel remains controllable", () => {
    expect(levelSpeed(500)).toBe(CONFIG.levelSpeedMax);
  });
});
