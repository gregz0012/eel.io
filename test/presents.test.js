import { describe, it, expect } from "vitest";
import { rollPresent, PRESENT_KINDS, isKindGift } from "../src/engine/presents.js";
import { seededRng } from "../src/engine/rng.js";
import { CONFIG } from "../src/engine/config.js";

const roll = (seed) => rollPresent(seededRng(seed));

describe("rollPresent", () => {
  it("is deterministic for a given seed", () => {
    expect(roll(123)).toEqual(roll(123));
  });

  it("only ever produces a kind the shell knows about", () => {
    const rng = seededRng(1);
    for (let i = 0; i < 2000; i++) expect(PRESENT_KINDS).toContain(rollPresent(rng).kind);
  });

  it("can produce every kind", () => {
    const rng = seededRng(4), seen = new Set();
    for (let i = 0; i < 5000; i++) seen.add(rollPresent(rng).kind);
    expect([...seen].sort()).toEqual([...PRESENT_KINDS].sort());
  });

  it("keeps point amounts inside the configured range", () => {
    const rng = seededRng(8);
    const ranges = Object.fromEntries(CONFIG.presents.effects.map(e => [e.kind, e]));
    for (let i = 0; i < 5000; i++) {
      const { kind, amount } = rollPresent(rng);
      const spec = ranges[kind];
      if (spec.min == null) expect(amount).toBe(0);
      else {
        expect(amount).toBeGreaterThanOrEqual(spec.min);
        expect(amount).toBeLessThanOrEqual(spec.max);
      }
    }
  });

  it("is kind more often than it is cruel", () => {
    // A present should feel like a treat you sometimes regret, not a coin flip.
    const rng = seededRng(2);
    let good = 0;
    for (let i = 0; i < 10000; i++) if (isKindGift(rollPresent(rng).kind)) good++;
    expect(good / 10000).toBeGreaterThan(0.6);
  });

  it("never hands out a nasty surprise more often than points", () => {
    const rng = seededRng(6), counts = {};
    for (let i = 0; i < 20000; i++) {
      const { kind } = rollPresent(rng);
      counts[kind] = (counts[kind] ?? 0) + 1;
    }
    for (const kind of ["levelDown", "predator", "pointsLost"]) {
      expect(counts[kind]).toBeLessThan(counts.points);
    }
  });

  it("makes losing a level the rarest outcome", () => {
    const weights = Object.fromEntries(CONFIG.presents.effects.map(e => [e.kind, e.weight]));
    for (const [kind, w] of Object.entries(weights)) {
      if (kind !== "levelDown") expect(w).toBeGreaterThan(weights.levelDown);
    }
  });
});
