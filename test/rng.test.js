import { describe, it, expect } from "vitest";
import { seededRng, randInt, weightedPick, hash32, seedFromDate } from "../src/engine/rng.js";

describe("seededRng", () => {
  it("gives the same stream for the same seed", () => {
    const a = seededRng(42), b = seededRng(42);
    expect(Array.from({ length: 20 }, a)).toEqual(Array.from({ length: 20 }, b));
  });

  it("gives different streams for different seeds", () => {
    expect(seededRng(1)()).not.toBe(seededRng(2)());
  });

  it("stays inside [0, 1)", () => {
    const rng = seededRng(9);
    for (let i = 0; i < 5000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("spreads across the range rather than clustering", () => {
    const rng = seededRng(3), buckets = new Array(10).fill(0);
    for (let i = 0; i < 10000; i++) buckets[Math.floor(rng() * 10)]++;
    for (const n of buckets) expect(n).toBeGreaterThan(700);   // ~1000 expected
  });
});

describe("randInt", () => {
  it("includes both ends", () => {
    const rng = seededRng(11), seen = new Set();
    for (let i = 0; i < 500; i++) seen.add(randInt(rng, 1, 3));
    expect([...seen].sort()).toEqual([1, 2, 3]);
  });

  it("returns the only value in a single-value range", () => {
    expect(randInt(seededRng(1), 7, 7)).toBe(7);
  });
});

describe("weightedPick", () => {
  const table = [{ kind: "common", weight: 90 }, { kind: "rare", weight: 10 }];

  it("picks proportionally to weight", () => {
    const rng = seededRng(5);
    let rare = 0;
    for (let i = 0; i < 10000; i++) if (weightedPick(rng, table).kind === "rare") rare++;
    expect(rare).toBeGreaterThan(700);
    expect(rare).toBeLessThan(1300);          // ~1000 expected
  });

  it("never picks a zero-weight entry", () => {
    const rng = seededRng(5);
    const withZero = [{ kind: "yes", weight: 1 }, { kind: "never", weight: 0 }];
    for (let i = 0; i < 500; i++) expect(weightedPick(rng, withZero).kind).toBe("yes");
  });

  it("returns null when nothing has any weight", () => {
    expect(weightedPick(seededRng(1), [{ kind: "a", weight: 0 }])).toBeNull();
    expect(weightedPick(seededRng(1), [])).toBeNull();
  });
});

describe("hash32", () => {
  it("is stable: the same string always hashes the same", () => {
    expect(hash32("hello")).toBe(hash32("hello"));
  });

  it("gives different strings different hashes", () => {
    expect(hash32("hello")).not.toBe(hash32("hullo"));
  });

  it("always returns a non-negative 32-bit integer", () => {
    for (const s of ["", "a", "2026-08-21", "a very long string indeed"]) {
      const h = hash32(s);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(2 ** 32);
    }
  });
});

describe("seedFromDate", () => {
  it("is stable: the same date always seeds the same", () => {
    expect(seedFromDate("2026-08-21")).toBe(seedFromDate("2026-08-21"));
  });

  it("gives different dates different seeds", () => {
    expect(seedFromDate("2026-08-21")).not.toBe(seedFromDate("2026-08-22"));
  });

  it("feeds seededRng into a real, usable stream", () => {
    const rng = seededRng(seedFromDate("2026-08-21"));
    const v = rng();
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });
});
