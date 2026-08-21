import { describe, it, expect } from "vitest";
import {
  MINI_GAMES, miniGameIds, miniGameById, pickMiniGame,
  breathPhaseAt, canTapAt, wordsNeeded, isWordGameComplete, wordList,
  pickStretch, stretchPhaseAt, pickBubblePrompts, bubblesNeeded, isBubbleGameComplete,
  pickDeed, pickScenario, isKindChoice, choiceOutcome,
} from "../src/engine/minigames.js";
import { seededRng } from "../src/engine/rng.js";
import { CONFIG } from "../src/engine/config.js";

const B = CONFIG.miniGames.breathing;
const W = CONFIG.miniGames.words;
const ST = CONFIG.miniGames.stretch;
const BU = CONFIG.miniGames.bubbles;
const DE = CONFIG.miniGames.deeds;
const CH = CONFIG.miniGames.choices;

// No strangers, no money, no leaving home — a good deed or a kind choice
// should always be something a child can safely do right where they are.
const BANNED = /\bstranger|\$|\bmoney\b|leave (the )?house|leave home/i;

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

describe("pickStretch", () => {
  it("only ever returns a listed stretch", () => {
    const rng = seededRng(3);
    const ids = ST.list.map(s => s.id);
    for (let i = 0; i < 50; i++) expect(ids).toContain(pickStretch(rng).id);
  });

  it("is deterministic for a given roll", () => {
    expect(pickStretch(() => 0)).toBe(ST.list[0]);
  });

  it("never asks the player to push harder or count anything", () => {
    // gentle tone only — this is a mindful break, not a workout
    for (const s of ST.list) {
      expect(s.text).not.toMatch(/burn|calor|push harder|reps?\b|workout|exercise/i);
    }
  });

  it("has no duplicate stretches", () => {
    expect(new Set(ST.list.map(s => s.id)).size).toBe(ST.list.length);
  });
});

describe("stretchPhaseAt", () => {
  it("starts at no progress", () => {
    expect(stretchPhaseAt(0).progress).toBe(0);
    expect(stretchPhaseAt(0).done).toBe(false);
  });

  it("tracks progress toward the total", () => {
    expect(stretchPhaseAt(ST.totalMs / 2).progress).toBeCloseTo(0.5);
  });

  it("is done only once the total has elapsed", () => {
    expect(stretchPhaseAt(ST.totalMs - 1).done).toBe(false);
    expect(stretchPhaseAt(ST.totalMs).done).toBe(true);
    expect(stretchPhaseAt(ST.totalMs).progress).toBe(1);
  });

  it("counts down the seconds left", () => {
    expect(stretchPhaseAt(0).secondsLeft).toBe(ST.totalMs / 1000);
    expect(stretchPhaseAt(ST.totalMs).secondsLeft).toBe(0);
  });

  it("treats a negative elapsed time as zero rather than throwing", () => {
    expect(() => stretchPhaseAt(-100)).not.toThrow();
    expect(stretchPhaseAt(-100).progress).toBe(0);
  });

  // The whole point: nothing here needs a camera, a motion sensor, or any
  // device API at all — it's a complete result from two plain numbers.
  it("needs nothing but elapsed time to produce a complete result", () => {
    const r = stretchPhaseAt(1000);
    expect(r).toMatchObject({
      progress: expect.any(Number), secondsLeft: expect.any(Number), done: expect.any(Boolean),
    });
  });
});

describe("pickBubblePrompts", () => {
  it("returns the number asked for, all distinct", () => {
    const picked = pickBubblePrompts(seededRng(5), 3);
    expect(picked).toHaveLength(3);
    expect(new Set(picked).size).toBe(3);
  });

  it("only ever returns listed prompts", () => {
    const picked = pickBubblePrompts(seededRng(9), BU.onScreen);
    for (const p of picked) expect(BU.list).toContain(p);
  });

  it("caps at the list length rather than looping or duplicating", () => {
    const picked = pickBubblePrompts(seededRng(1), BU.list.length + 10);
    expect(picked).toHaveLength(BU.list.length);
    expect(new Set(picked).size).toBe(BU.list.length);
  });

  it("returns nothing for a non-positive or missing count", () => {
    expect(pickBubblePrompts(seededRng(1), 0)).toEqual([]);
    expect(pickBubblePrompts(seededRng(1), -3)).toEqual([]);
    expect(pickBubblePrompts(seededRng(1), undefined)).toEqual([]);
  });
});

describe("bubblesNeeded / isBubbleGameComplete", () => {
  it("agrees on how many bubbles finish the exercise", () => {
    expect(isBubbleGameComplete(bubblesNeeded() - 1)).toBe(false);
    expect(isBubbleGameComplete(bubblesNeeded())).toBe(true);
  });

  it("treats a missing tap count as zero, not complete", () => {
    expect(isBubbleGameComplete(undefined)).toBe(false);
  });

  // The calmest activity of the four has no cooldown to wait out — nothing
  // here should ever ask a player to pause between taps.
  it("has no tap cooldown, unlike the words game", () => {
    expect(CONFIG.miniGames.bubbles.tapCooldownMs).toBeUndefined();
  });
});

describe("pickDeed", () => {
  it("only ever returns a listed deed", () => {
    const rng = seededRng(2);
    const ids = DE.list.map(d => d.id);
    for (let i = 0; i < 50; i++) expect(ids).toContain(pickDeed(rng, null).id);
  });

  it("never returns the excluded deed once there is another to give", () => {
    const rng = seededRng(4);
    const first = DE.list[0];
    for (let i = 0; i < 50; i++) expect(pickDeed(rng, first.id).id).not.toBe(first.id);
  });

  it("does not hang when only one deed is left to exclude", () => {
    const only = [{ id: "solo", text: "The only deed" }];
    expect(() => pickDeed(() => 0, only[0].id)).not.toThrow();
  });

  it("content guard: no strangers, no money, no leaving home", () => {
    for (const d of DE.list) expect(d.text).not.toMatch(BANNED);
  });
});

describe("pickScenario / isKindChoice / choiceOutcome", () => {
  it("only ever returns a listed scenario", () => {
    const rng = seededRng(6);
    const ids = CH.list.map(s => s.id);
    for (let i = 0; i < 50; i++) expect(ids).toContain(pickScenario(rng).id);
  });

  it("gives every scenario exactly one kind option, so none is unwinnable", () => {
    for (const s of CH.list) {
      expect(s.options.filter(o => o.kind === true)).toHaveLength(1);
    }
  });

  it("identifies the kind option by index", () => {
    const s = CH.list[0];
    const kindIndex = s.options.findIndex(o => o.kind);
    expect(isKindChoice(s, kindIndex)).toBe(true);
    expect(isKindChoice(s, (kindIndex + 1) % s.options.length)).toBe(false);
  });

  it("completes and replies kindly on the kind option, with no points field", () => {
    const s = CH.list[0];
    const kindIndex = s.options.findIndex(o => o.kind);
    const outcome = choiceOutcome(s, kindIndex);
    expect(outcome).toEqual({ kind: true, message: CH.kindReply, complete: true });
    expect(outcome.points).toBeUndefined();
    expect(outcome.score).toBeUndefined();
    expect(outcome.penalty).toBeUndefined();
  });

  it("nudges without completing or costing anything on any other option", () => {
    const s = CH.list[0];
    const unkindIndex = s.options.findIndex(o => !o.kind);
    const outcome = choiceOutcome(s, unkindIndex);
    expect(outcome).toEqual({ kind: false, message: CH.nudge, complete: false });
    expect(outcome.points).toBeUndefined();
  });

  it("treats an out-of-range index as unkind rather than throwing", () => {
    const s = CH.list[0];
    expect(() => choiceOutcome(s, 999)).not.toThrow();
    expect(choiceOutcome(s, 999).complete).toBe(false);
    expect(choiceOutcome(s, -1).complete).toBe(false);
  });

  it("content guard: no strangers, no money, no leaving home", () => {
    for (const s of CH.list) {
      expect(s.prompt).not.toMatch(BANNED);
      for (const o of s.options) expect(o.text).not.toMatch(BANNED);
    }
  });
});
