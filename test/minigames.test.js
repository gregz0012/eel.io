import { describe, it, expect } from "vitest";
import {
  pickMiniGame, breathPhaseAt, canTapAt, wordsNeeded, isWordGameComplete, wordList,
} from "../src/engine/minigames.js";
import { seededRng } from "../src/engine/rng.js";
import { CONFIG } from "../src/engine/config.js";

const B = CONFIG.miniGames.breathing;
const W = CONFIG.miniGames.words;

describe("pickMiniGame", () => {
  it("only ever picks a known exercise", () => {
    const rng = seededRng(1);
    for (let i = 0; i < 50; i++) expect(["breathing", "words"]).toContain(pickMiniGame(rng));
  });

  it("is deterministic for a given roll", () => {
    expect(pickMiniGame(() => 0)).toBe("breathing");
    expect(pickMiniGame(() => 0.99)).toBe("words");
  });

  it("picks both, given enough rolls", () => {
    const rng = seededRng(7);
    const seen = new Set();
    for (let i = 0; i < 50; i++) seen.add(pickMiniGame(rng));
    expect(seen.size).toBe(2);
  });
});

describe("breathPhaseAt", () => {
  it("starts on the in-breath", () => {
    expect(breathPhaseAt(0).phase).toBe("in");
    expect(breathPhaseAt(0).round).toBe(1);
  });

  it("moves through in, hold-in, out, hold-out in order", () => {
    const phases = [0, B.phaseMs, B.phaseMs * 2, B.phaseMs * 3]
      .map(ms => breathPhaseAt(ms).phase);
    expect(phases).toEqual(["in", "holdIn", "out", "holdOut"]);
  });

  it("advances the round after a full cycle", () => {
    expect(breathPhaseAt(B.phaseMs * 4).round).toBe(2);
  });

  it("is done only once every round has completed", () => {
    const total = B.phaseMs * 4 * B.rounds;
    expect(breathPhaseAt(total - 1).done).toBe(false);
    expect(breathPhaseAt(total).done).toBe(true);
  });

  it("never reports a round past the total", () => {
    expect(breathPhaseAt(B.phaseMs * 4 * B.rounds).round).toBe(B.rounds);
  });

  it("tracks progress through the current phase", () => {
    expect(breathPhaseAt(0).progress).toBe(0);
    expect(breathPhaseAt(B.phaseMs / 2).progress).toBeCloseTo(0.5);
  });

  it("counts down the seconds left in the phase", () => {
    expect(breathPhaseAt(0).secondsLeft).toBe(B.phaseMs / 1000);
  });

  it("treats a negative elapsed time as zero rather than throwing", () => {
    expect(() => breathPhaseAt(-100)).not.toThrow();
    expect(breathPhaseAt(-100).phase).toBe("in");
  });
});

describe("canTapAt", () => {
  it("allows the very first tap", () => {
    expect(canTapAt(null, 1000)).toBe(true);
    expect(canTapAt(undefined, 1000)).toBe(true);
  });

  it("blocks a tap inside the cooldown", () => {
    expect(canTapAt(1000, 1000 + W.tapCooldownMs - 1)).toBe(false);
  });

  it("allows a tap once the cooldown has fully elapsed", () => {
    expect(canTapAt(1000, 1000 + W.tapCooldownMs)).toBe(true);
  });
});

describe("wordsNeeded / isWordGameComplete", () => {
  it("agrees on how many words finish the exercise", () => {
    expect(isWordGameComplete(wordsNeeded() - 1)).toBe(false);
    expect(isWordGameComplete(wordsNeeded())).toBe(true);
  });

  it("treats a missing tap count as zero, not complete", () => {
    expect(isWordGameComplete(undefined)).toBe(false);
  });

  it("stays complete past the requirement", () => {
    expect(isWordGameComplete(wordsNeeded() + 5)).toBe(true);
  });
});

describe("wordList", () => {
  it("offers only kind, unique, lower-case words", () => {
    const list = wordList();
    expect(list.length).toBeGreaterThanOrEqual(wordsNeeded());
    expect(new Set(list).size).toBe(list.length);
    for (const w of list) expect(w).toMatch(/^[a-z]+$/);
  });
});
