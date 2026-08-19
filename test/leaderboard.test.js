import { describe, it, expect } from "vitest";
import { validateSubmission, bestOf, rankOf, topRows } from "../src/engine/leaderboard.js";
import { CONFIG } from "../src/engine/config.js";

const L = CONFIG.leaderboard;
const run = (over) => ({ score: 500, durationMs: 120000, ...over });

describe("validateSubmission", () => {
  it("accepts an ordinary good run", () => {
    expect(validateSubmission(run()).ok).toBe(true);
  });

  it("rejects an absurd score outright", () => {
    expect(validateSubmission(run({ score: 999999999 })).ok).toBe(false);
  });

  it("rejects a score earned impossibly fast", () => {
    const tooFast = Math.ceil(L.maxPointsPerSecond * 60) + 1;
    expect(validateSubmission({ score: tooFast, durationMs: 60000 }).ok).toBe(false);
  });

  it("allows a great run right up to the rate cap", () => {
    const atCap = Math.floor(L.maxPointsPerSecond * 60);
    expect(validateSubmission({ score: atCap, durationMs: 60000 }).ok).toBe(true);
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
    expect(validateSubmission({ score: 100 }).ok).toBe(false);
    expect(validateSubmission(run({ durationMs: Infinity })).ok).toBe(false);
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
    { tag: "A-0001", score: 10 }, { tag: "B-0002", score: 90 },
    { tag: "C-0003", score: 50 }, { tag: "D-0004", score: 90 },
  ];

  it("sorts highest first", () => {
    expect(topRows(rows).map(r => r.score)).toEqual([90, 90, 50, 10]);
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
