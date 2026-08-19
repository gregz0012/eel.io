import { describe, it, expect } from "vitest";
import { tagFor, isWellFormedTag, tagSpaceSize } from "../src/engine/identity.js";

const uuid = (n) => `0000${n}`.slice(-4) + "0000-0000-4000-8000-000000000000";

describe("tagFor", () => {
  it("is stable: the same id always yields the same tag", () => {
    expect(tagFor("abc-123")).toBe(tagFor("abc-123"));
  });

  it("produces a well-formed tag", () => {
    expect(isWellFormedTag(tagFor("abc-123"))).toBe(true);
  });

  it("gives different ids different tags", () => {
    expect(tagFor("abc-123")).not.toBe(tagFor("abc-124"));
  });

  it("never contains free text a player chose", () => {
    // Whatever a client sends, the tag is a function of the id alone.
    expect(tagFor("<script>alert(1)</script>")).toMatch(/^[A-Za-z]+-\d{4}$/);
    expect(tagFor("Rude Word Here")).toMatch(/^[A-Za-z]+-\d{4}$/);
  });

  it("spreads ids across the space without obvious clustering", () => {
    const tags = new Set();
    for (let i = 0; i < 2000; i++) tags.add(tagFor(uuid(i)));
    // A handful of collisions is fine; a hash that ignores its input is not.
    expect(tags.size).toBeGreaterThan(1990);
  });

  it("offers enough tags that collisions stay rare at hobby scale", () => {
    expect(tagSpaceSize()).toBeGreaterThan(1e7);
  });
});

describe("isWellFormedTag", () => {
  it("rejects anything that is not a generated tag", () => {
    expect(isWellFormedTag("Steve")).toBe(false);
    expect(isWellFormedTag("AmberLantern-42")).toBe(false);
    expect(isWellFormedTag("")).toBe(false);
    expect(isWellFormedTag(null)).toBe(false);
  });
});
