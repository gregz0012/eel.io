import { describe, it, expect } from "vitest";
import {
  addScore, completeLevel, bossHits, deductLevel, predatorTarget, isBossLevel, levelSpeed,
} from "../src/engine/scoring.js";
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

  it("stops buying levels at the cap, however big the score", () => {
    const s = addScore({ score: 0, level: 1 }, CONFIG.pointsPerLevel * 40);
    expect(s.level).toBe(CONFIG.scoreLevelCap);
    expect(s.levelsGained).toEqual([CONFIG.scoreLevelCap]);
  });

  it("keeps counting points long after it stops handing out levels", () => {
    const s = addScore({ score: 5000, level: 9 }, 250);
    expect(s.score).toBe(5250);
    expect(s.level).toBe(9);          // won by killing bosses, not by points
    expect(s.levelsGained).toEqual([]);
  });

  it("does not mutate the state it is given", () => {
    const before = { score: 0, level: 1 };
    addScore(before, 500);
    expect(before).toEqual({ score: 0, level: 1 });
  });
});

describe("deductLevel", () => {
  it("takes one level", () => {
    expect(deductLevel({ score: 640, level: 6 }).level).toBe(5);
  });

  it("leaves the score alone above the cap, where points cannot buy levels back", () => {
    const after = deductLevel({ score: 640, level: 6 });
    expect(after.score).toBe(640);         // no reason to take the points too
    expect(addScore(after, 1).level).toBe(5);
  });

  it("drops the score below the cap, where the next fish would undo the loss", () => {
    const after = deductLevel({ score: 400, level: 2 });
    expect(after.level).toBe(1);
    expect(after.score).toBe(0);           // floor of level 1
    expect(addScore(after, 1).level).toBe(1);
  });

  it("cannot take a player below level one", () => {
    const after = deductLevel({ score: 50, level: 1 });
    expect(after).toEqual({ score: 50, level: 1 });
  });

  it("is the only thing that lowers a level — losing points still does not", () => {
    expect(addScore({ score: 640, level: 6 }, -640).level).toBe(6);
  });
});

describe("difficulty ramp", () => {
  it("adds a predator every two levels", () => {
    expect(predatorTarget(1)).toBe(CONFIG.predatorsBase);
    expect(predatorTarget(2)).toBe(CONFIG.predatorsBase + 1);
    expect(predatorTarget(3)).toBe(CONFIG.predatorsBase + 1);
    expect(predatorTarget(10)).toBe(CONFIG.predatorsBase + 5);
  });

  it("guards every level from the first boss level on", () => {
    expect(isBossLevel(CONFIG.boss.firstLevel - 1)).toBe(false);
    for (let L = CONFIG.boss.firstLevel; L <= 30; L++) expect(isBossLevel(L)).toBe(true);
  });

  it("leaves the opening level unguarded, so a new player can find their feet", () => {
    expect(isBossLevel(1)).toBe(false);
    expect(isBossLevel(0)).toBe(false);
  });
});

describe("completeLevel", () => {
  it("is the way past the cap that points cannot buy", () => {
    const capped = addScore({ score: 0, level: 1 }, CONFIG.pointsPerLevel * 40);
    expect(capped.level).toBe(CONFIG.scoreLevelCap);
    expect(completeLevel(capped).level).toBe(CONFIG.scoreLevelCap + 1);
  });

  it("reports the level gained, so the shell applies the same effects as a scored one", () => {
    expect(completeLevel({ score: 300, level: 4 }).levelsGained).toEqual([5]);
  });

  it("leaves the score untouched — the reward is the level, not points", () => {
    expect(completeLevel({ score: 300, level: 4 }).score).toBe(300);
  });

  it("does not mutate the state it is given", () => {
    const before = { score: 300, level: 4 };
    completeLevel(before);
    expect(before).toEqual({ score: 300, level: 4 });
  });
});

describe("bossHits", () => {
  it("takes as many hits as the level number", () => {
    expect(bossHits(2)).toBe(2);
    expect(bossHits(15)).toBe(15);
  });

  it("never asks for fewer than one hit", () => {
    expect(bossHits(0)).toBe(1);
    expect(bossHits(-3)).toBe(1);
  });

  it("rises by exactly one per level, so the ramp has no cliff", () => {
    for (let L = 2; L < 30; L++) expect(bossHits(L + 1) - bossHits(L)).toBe(1);
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
