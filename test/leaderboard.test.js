import { describe, it, expect } from "vitest";
import { validateSubmission, bestOf, rankOf, topRows, clampTopLimit, rivalProfiles } from "../src/engine/leaderboard.js";
import { CONFIG } from "../src/engine/config.js";
import { tagFor, shortTagFor } from "../src/engine/identity.js";

const L = CONFIG.leaderboard;
const run = (over) => ({ score: 500, level: 3, durationMs: 120000, ...over });

describe("validateSubmission", () => {
  it("accepts an ordinary good run", () => {
    expect(validateSubmission(run()).ok).toBe(true);
  });

  it("rejects an absurd score outright", () => {
    expect(validateSubmission(run({ score: 999999999 })).ok).toBe(false);
  });

  it("rejects a score earned impossibly fast", () => {
    const tooFast = Math.ceil(L.maxPointsPerSecond * 60) + 1;
    expect(validateSubmission(run({ score: tooFast, durationMs: 60000 })).ok).toBe(false);
  });

  it("allows a great run right up to the rate cap", () => {
    const atCap = Math.floor(L.maxPointsPerSecond * 60);
    expect(validateSubmission(run({ score: atCap, durationMs: 60000 })).ok).toBe(true);
  });

  it("rejects runs too short to have earned anything", () => {
    expect(validateSubmission(run({ durationMs: L.minRunMs - 1 })).ok).toBe(false);
  });

  it("rejects non-integer, negative and non-numeric scores", () => {
    expect(validateSubmission(run({ score: 12.5 })).ok).toBe(false);
    expect(validateSubmission(run({ score: -5 })).ok).toBe(false);
    expect(validateSubmission(run({ score: "9999" })).ok).toBe(false);
    expect(validateSubmission(run({ score: NaN })).ok).toBe(false);
  });

  it("rejects a missing or malformed duration", () => {
    expect(validateSubmission({ score: 100, level: 1 }).ok).toBe(false);
    expect(validateSubmission(run({ durationMs: Infinity })).ok).toBe(false);
  });

  it("rejects an absurd level outright", () => {
    expect(validateSubmission(run({ level: 999999 })).ok).toBe(false);
  });

  it("allows a level right up to the cap", () => {
    expect(validateSubmission(run({ level: L.maxLevel })).ok).toBe(true);
  });

  it("rejects non-integer, sub-1 and non-numeric levels", () => {
    expect(validateSubmission(run({ level: 2.5 })).ok).toBe(false);
    expect(validateSubmission(run({ level: 0 })).ok).toBe(false);
    expect(validateSubmission(run({ level: "5" })).ok).toBe(false);
    expect(validateSubmission(run({ level: NaN })).ok).toBe(false);
  });

  it("rejects a missing level — every real submission has one", () => {
    expect(validateSubmission({ score: 500, durationMs: 120000 }).ok).toBe(false);
  });

  it("survives a junk body without throwing", () => {
    expect(validateSubmission(undefined).ok).toBe(false);
    expect(validateSubmission(null).ok).toBe(false);
  });

  it("explains why it said no", () => {
    const v = validateSubmission(run({ score: 999999999 }));
    expect(v.ok).toBe(false);
    expect(v.reason).toBeTruthy();
  });
});

describe("bestOf", () => {
  it("keeps the higher score", () => {
    expect(bestOf(300, 500)).toBe(500);
    expect(bestOf(500, 300)).toBe(500);
  });

  it("treats a first-ever run as the best", () => {
    expect(bestOf(undefined, 120)).toBe(120);
  });
});

describe("rankOf", () => {
  it("puts the highest score first", () => {
    expect(rankOf([900, 700, 100], 900)).toBe(1);
  });

  it("shares a rank between ties", () => {
    expect(rankOf([900, 700, 700, 100], 700)).toBe(2);
  });

  it("ranks a score below everything last", () => {
    expect(rankOf([900, 700, 100], 50)).toBe(4);
  });
});

describe("topRows", () => {
  const rows = [
    { tag: "A-0001", score: 10, level: 8 }, { tag: "B-0002", score: 90, level: 2 },
    { tag: "C-0003", score: 50, level: 5 }, { tag: "D-0004", score: 90, level: 1 },
  ];

  it("sorts by score, highest first, by default", () => {
    expect(topRows(rows).map(r => r.score)).toEqual([90, 90, 50, 10]);
  });

  it("sorts by level instead when asked — a different order entirely", () => {
    expect(topRows(rows, undefined, "level").map(r => r.level)).toEqual([8, 5, 2, 1]);
  });

  it("every row keeps both metrics regardless of which one is sorting", () => {
    const byLevel = topRows(rows, undefined, "level");
    expect(byLevel[0]).toEqual({ tag: "A-0001", score: 10, level: 8 });
  });

  it("breaks ties stably by tag so the board does not shuffle on refresh", () => {
    expect(topRows(rows).slice(0, 2).map(r => r.tag)).toEqual(["B-0002", "D-0004"]);
  });

  it("honours the limit", () => {
    expect(topRows(rows, 2)).toHaveLength(2);
  });

  it("does not mutate the rows it is given", () => {
    const before = rows.map(r => r.tag);
    topRows(rows);
    expect(rows.map(r => r.tag)).toEqual(before);
  });
});

describe("clampTopLimit", () => {
  it("defaults to topLimit when nothing is requested", () => {
    expect(clampTopLimit(undefined)).toBe(L.topLimit);
  });

  it("passes through a reasonable request", () => {
    expect(clampTopLimit(25)).toBe(25);
  });

  it("never exceeds maxTopLimit, however much is requested", () => {
    expect(clampTopLimit(999999)).toBe(L.maxTopLimit);
  });

  it("falls back to the default for zero, negative or non-numeric junk", () => {
    expect(clampTopLimit(0)).toBe(L.topLimit);
    expect(clampTopLimit(-5)).toBe(L.topLimit);
    expect(clampTopLimit("banana")).toBe(L.topLimit);
    expect(clampTopLimit(null)).toBe(L.topLimit);
    expect(clampTopLimit(undefined)).toBe(L.topLimit);
  });

  it("floors a fractional request rather than rejecting it", () => {
    expect(clampTopLimit(5.9)).toBe(5);
  });
});

describe("rivalProfiles", () => {
  const id = "3f2a9c14-0000-4000-8000-000000000001";

  it("uses a real player's anonymous name and latest skin", () => {
    expect(rivalProfiles([{ tag: tagFor(id), skinId: "copper" }]))
      .toEqual([{ name: shortTagFor(id), skinId: "copper" }]);
  });

  it("drops malformed public rows and duplicate short names", () => {
    const row = { tag: tagFor(id), skinId: "gold" };
    expect(rivalProfiles([row, row, { tag: "<script>", skinId: "volt" }, null]))
      .toEqual([{ name: shortTagFor(id), skinId: "gold" }]);
  });

  it("does not spawn the local player as their own rival", () => {
    expect(rivalProfiles([{ tag: tagFor(id), skinId: "volt" }], shortTagFor(id))).toEqual([]);
  });

  it("is empty for offline or malformed responses", () => {
    expect(rivalProfiles(null)).toEqual([]);
  });
});
