import { describe, it, expect } from "vitest";
import { recordEvent, recordMax, statValue } from "../src/engine/stats.js";

describe("recordEvent", () => {
  it("starts a new counter at the given amount", () => {
    expect(recordEvent({}, "fishEaten").fishEaten).toBe(1);
  });

  it("accumulates across calls", () => {
    let stats = {};
    stats = recordEvent(stats, "fishEaten");
    stats = recordEvent(stats, "fishEaten");
    stats = recordEvent(stats, "fishEaten", 3);
    expect(stats.fishEaten).toBe(5);
  });

  it("starts from nothing when no stats exist yet", () => {
    expect(recordEvent(undefined, "dives").dives).toBe(1);
  });

  it("leaves every other counter untouched", () => {
    const stats = recordEvent({ fishEaten: 4 }, "bossesKilled");
    expect(stats).toEqual({ fishEaten: 4, bossesKilled: 1 });
  });

  it("ignores a negative amount rather than going backwards", () => {
    expect(recordEvent({ fishEaten: 10 }, "fishEaten", -5).fishEaten).toBe(10);
  });

  it("does not mutate the state it is given", () => {
    const before = { fishEaten: 4 };
    recordEvent(before, "fishEaten");
    expect(before).toEqual({ fishEaten: 4 });
  });
});

describe("recordMax", () => {
  it("starts a new max at the given value", () => {
    expect(recordMax({}, "maxLength", 42).maxLength).toBe(42);
  });

  it("rises to meet a bigger value", () => {
    expect(recordMax({ maxLength: 42 }, "maxLength", 90).maxLength).toBe(90);
  });

  it("holds when the new value is smaller", () => {
    expect(recordMax({ maxLength: 90 }, "maxLength", 42).maxLength).toBe(90);
  });

  it("starts from nothing when no stats exist yet", () => {
    expect(recordMax(undefined, "maxLength", 10).maxLength).toBe(10);
  });

  it("does not mutate the state it is given", () => {
    const before = { maxLength: 90 };
    recordMax(before, "maxLength", 42);
    expect(before).toEqual({ maxLength: 90 });
  });
});

describe("statValue", () => {
  it("reads back a recorded value", () => {
    expect(statValue({ fishEaten: 7 }, "fishEaten")).toBe(7);
  });

  it("treats a missing key as zero", () => {
    expect(statValue({}, "fishEaten")).toBe(0);
  });

  it("treats missing stats entirely as zero", () => {
    expect(statValue(undefined, "fishEaten")).toBe(0);
  });

  it("never returns a negative number, however the store was edited", () => {
    expect(statValue({ fishEaten: -50 }, "fishEaten")).toBe(0);
  });

  it("treats a non-numeric edited value as zero rather than NaN", () => {
    expect(statValue({ fishEaten: "not a number" }, "fishEaten")).toBe(0);
  });
});
