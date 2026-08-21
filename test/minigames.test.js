import { describe, it, expect } from "vitest";
import {
  MINI_GAMES, miniGameIds, miniGameById, pickMiniGame,
  breathPhaseAt, canTapAt, wordsNeeded, isWordGameComplete, wordList,
} from "../src/engine/minigames.js";
import { seededRng } from "../src/engine/rng.js";
import { CONFIG } from "../src/engine/config.js";

const B = CONFIG.miniGames.breathing;
const W = CONFIG.miniGames.words;

describe("MINI_GAMES", () => {
  it("gives every activity a unique id, a title, a subtitle and a positive weight", () => {
    expect(new Set(miniGameIds()).size).toBe(MINI_GAMES.length);
    for (const g of MINI_GAMES) {
      expect(g.id).toEqual(expect.any(String));
      expect(g.title).toEqual(expect.any(String));
      expect(g.sub).toEqual(expect.any(String));
      expect(g.weight).toBeGreaterThan(0);
    }
  });

  it("declares no reward of its own — CONFIG.miniGames.reward is the one source of truth", () => {
    for (const g of MINI_GAMES) expect(g.reward).toBeUndefined();
  });

  it("looks an activity up by id, falling back to the first for an unknown one", () => {
    expect(miniGameById("words").id).toBe("words");
    expect(miniGameById("nonexistent")).toBe(MINI_GAMES[0]);
  });
});

describe("pickMiniGame", () => {
  it("only ever picks a registered activity", () => {
    const rng = seededRng(1);
    for (let i = 0; i < 50; i++) expect(miniGameIds()).toContain(pickMiniGame(rng));
  });

  it("is deterministic for a given roll — the lowest roll picks the first activity", () => {
    expect(pickMiniGame(() => 0)).toBe(MINI_GAMES[0].id);
  });

  it("picks every registered activity, given enough rolls", () => {
    const rng = seededRng(7);
    const seen = new Set();
    for (let i = 0; i < 200; i++) seen.add(pickMiniGame(rng));
    expect(seen.size).toBe(MINI_GAMES.length);
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
