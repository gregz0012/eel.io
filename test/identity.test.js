import { describe, it, expect } from "vitest";
import { tagFor, shortTagFor, rivalTag, isWellFormedTag, tagSpaceSize } from "../src/engine/identity.js";
import { seededRng } from "../src/engine/rng.js";

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

describe("shortTagFor", () => {
  it("drops the number, keeping the name", () => {
    expect(shortTagFor("abc")).toBe(tagFor("abc").replace(/-\d+$/, ""));
    expect(shortTagFor("abc")).not.toMatch(/\d/);
  });

  it("is still deterministic — a rival keeps its name for the whole dive", () => {
    expect(shortTagFor("rival-7")).toBe(shortTagFor("rival-7"));
  });

  it("stays short enough to float over a swimming eel", () => {
    for (let i = 0; i < 300; i++) {
      expect(shortTagFor("eel" + i).length).toBeLessThanOrEqual(22);
    }
  });

  it("gives different rivals different names", () => {
    const names = new Set();
    for (let i = 0; i < 200; i++) names.add(shortTagFor("eel" + i));
    expect(names.size).toBeGreaterThan(150);
  });
});

describe("rivalTag", () => {
  it("never hands a rival the player's own name", () => {
    // Force the collision: an rng that always returns the same value would,
    // without the guard, produce the excluded tag every single time.
    const collidingSeed = 0.5;
    const excluded = shortTagFor(String(collidingSeed));
    expect(rivalTag(() => collidingSeed, excluded)).not.toBe(excluded);
  });

  it("never collides across a long dive's worth of respawns", () => {
    const rng = seededRng(11);
    const excluded = shortTagFor("player-id");
    for (let i = 0; i < 5000; i++) {
      expect(rivalTag(rng, excluded)).not.toBe(excluded);
    }
  });

  it("still returns ordinary names when there is no collision", () => {
    const rng = seededRng(3);
    const tag = rivalTag(rng, "NotAnyRealTag");
    expect(tag).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+$/);
  });

  it("terminates and falls back when literally every roll collides", () => {
    // An rng frozen on one value, with that value's own tag excluded: every
    // one of the ten tries collides, so this only returns at all if the loop
    // is bounded. The caller is an unconditional respawn loop — a spin here
    // would hang the game.
    const stuck = 0.4242;
    const excluded = shortTagFor(String(stuck));
    const tag = rivalTag(() => stuck, excluded);
    expect(tag).not.toBe(excluded);
    expect(tag).toBeTruthy();
  });

  it("gives rivals varied names, not one repeated", () => {
    const rng = seededRng(5);
    const names = new Set();
    for (let i = 0; i < 200; i++) names.add(rivalTag(rng, "Excluded"));
    expect(names.size).toBeGreaterThan(100);
  });
});
