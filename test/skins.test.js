import { describe, it, expect } from "vitest";
import {
  SKINS, DEFAULT_SKIN_ID, skinById, isSkinUnlocked, unlockedSkins,
  wearableSkin, nextUnlock, skinsUnlockedBy, skinFromHue,
} from "../src/engine/skins.js";

const free = SKINS.filter(s => s.unlockAt === 0);
const earned = SKINS.filter(s => s.unlockAt > 0);

describe("the catalogue", () => {
  it("starts everyone with five colours", () => {
    expect(free).toHaveLength(5);
  });

  it("offers the six earnable skins", () => {
    expect(earned.map(s => s.id))
      .toEqual(["copper", "iron", "gold", "emerald", "diamond", "platinum"]);
  });

  it("prices them in the order they are listed", () => {
    const costs = earned.map(s => s.unlockAt);
    expect([...costs].sort((a, b) => a - b)).toEqual(costs);
  });

  it("has no duplicate ids", () => {
    expect(new Set(SKINS.map(s => s.id)).size).toBe(SKINS.length);
  });

  it("gives every skin the parts the renderer needs", () => {
    for (const s of SKINS) {
      expect(s).toMatchObject({
        id: expect.any(String), name: expect.any(String), hue: expect.any(Number),
        sat: expect.any(Number), bodyLight: expect.any(Number), headLight: expect.any(Number),
      });
    }
  });
});

describe("unlocking", () => {
  it("a new player has the five standard colours and nothing else", () => {
    expect(unlockedSkins(0).map(s => s.id)).toEqual(free.map(s => s.id));
  });

  it("unlocks a skin once lifetime points reach its cost", () => {
    const copper = skinById("copper");
    expect(isSkinUnlocked(copper, copper.unlockAt - 1)).toBe(false);
    expect(isSkinUnlocked(copper, copper.unlockAt)).toBe(true);
  });

  it("keeps everything unlocked as the total grows", () => {
    expect(unlockedSkins(1e9)).toHaveLength(SKINS.length);
  });

  it("reports what to work towards next", () => {
    const { skin, pointsToGo } = nextUnlock(0);
    expect(skin.id).toBe("copper");
    expect(pointsToGo).toBe(skin.unlockAt);
  });

  it("has nothing left to work towards once everything is earned", () => {
    expect(nextUnlock(1e9)).toBeNull();
  });

  it("names the skins a run just earned", () => {
    const copper = skinById("copper"), iron = skinById("iron");
    expect(skinsUnlockedBy(copper.unlockAt - 1, iron.unlockAt).map(s => s.id))
      .toEqual(["copper", "iron"]);
  });

  it("earns nothing twice", () => {
    expect(skinsUnlockedBy(50000, 60000)).toEqual([]);
  });

  it("treats a missing lifetime total as zero", () => {
    expect(unlockedSkins(undefined).map(s => s.id)).toEqual(free.map(s => s.id));
    expect(skinsUnlockedBy(undefined, 600).map(s => s.id)).toEqual(["copper"]);
  });
});

describe("wearableSkin", () => {
  it("wears the skin the player chose when they have earned it", () => {
    expect(wearableSkin("gold", 99999).id).toBe("gold");
  });

  it("falls back to the default when they have not", () => {
    expect(wearableSkin("platinum", 0).id).toBe(DEFAULT_SKIN_ID);
  });

  it("falls back for a skin that does not exist", () => {
    expect(wearableSkin("unicorn", 1e9).id).toBe(DEFAULT_SKIN_ID);
  });
});

describe("skinFromHue", () => {
  it("dresses a rival eel in its own hue", () => {
    expect(skinFromHue(210).hue).toBe(210);
  });
});
