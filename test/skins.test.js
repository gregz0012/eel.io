import { describe, it, expect } from "vitest";
import {
  SKINS, DEFAULT_SKIN_ID, skinById, isOwned, ownedSkins, canAfford,
  buySkin, wearableSkin, nextSkinToBuy, skinFromHue,
} from "../src/engine/skins.js";

const free = SKINS.filter(s => s.price === 0);
const paid = SKINS.filter(s => s.price > 0);

describe("the catalogue", () => {
  it("gives everyone exactly one colour to start with", () => {
    expect(free).toHaveLength(1);
    expect(free[0].id).toBe(DEFAULT_SKIN_ID);
  });

  it("sells the rest, cheap recolours, then metals, then gems", () => {
    expect(paid.map(s => s.id)).toEqual([
      "coral", "orchid", "sky", "lime",
      "copper", "iron", "gold", "platinum",
      "emerald", "ruby", "diamond",
    ]);
  });

  it("names the nautical tier for the sea, not the metal", () => {
    for (const id of ["copper", "iron", "gold", "platinum"]) {
      expect(skinById(id).name).not.toBe(id[0].toUpperCase() + id.slice(1));
    }
  });

  it("names the gem tier for the gem, not the mineral", () => {
    for (const id of ["emerald", "ruby", "diamond"]) {
      expect(skinById(id).name).not.toBe(id[0].toUpperCase() + id.slice(1));
    }
  });

  it("marks exactly the gem tier for the shimmer treatment", () => {
    expect(SKINS.filter(s => s.gem).map(s => s.id)).toEqual(["emerald", "ruby", "diamond"]);
  });

  it("prices them in the order they are listed", () => {
    const prices = paid.map(s => s.price);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
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

describe("ownership", () => {
  it("a new player owns only the free colour", () => {
    expect(ownedSkins([]).map(s => s.id)).toEqual(free.map(s => s.id));
  });

  it("owns a skin that was bought", () => {
    expect(isOwned("gold", ["gold"])).toBe(true);
  });

  it("does not own one that was not", () => {
    expect(isOwned("gold", [])).toBe(false);
  });

  it("does not own a skin that does not exist", () => {
    expect(isOwned("unicorn", ["unicorn"])).toBe(false);
  });

  it("survives a missing owned list", () => {
    expect(isOwned("volt", undefined)).toBe(true);
    expect(isOwned("gold", undefined)).toBe(false);
  });
});

describe("buySkin", () => {
  const wallet = (banked, owned = []) => ({ banked, owned });

  it("deducts the price and hands over the skin", () => {
    const r = buySkin(wallet(5000), "gold");
    expect(r.bought).toBe(true);
    expect(r.banked).toBe(5000 - skinById("gold").price);
    expect(r.owned).toContain("gold");
  });

  it("buys at exactly the price", () => {
    const price = skinById("copper").price;
    const r = buySkin(wallet(price), "copper");
    expect(r.bought).toBe(true);
    expect(r.banked).toBe(0);
  });

  it("refuses when the bank is a point short, and takes nothing", () => {
    const price = skinById("copper").price;
    const r = buySkin(wallet(price - 1), "copper");
    expect(r.bought).toBe(false);
    expect(r.banked).toBe(price - 1);
    expect(r.owned).toEqual([]);
    expect(r.reason).toContain("1 more");
  });

  it("refuses to charge twice for a skin already owned", () => {
    const r = buySkin(wallet(9999, ["copper"]), "copper");
    expect(r.bought).toBe(false);
    expect(r.banked).toBe(9999);
  });

  it("refuses to charge for a free skin", () => {
    const r = buySkin(wallet(9999), "volt");
    expect(r.bought).toBe(false);
    expect(r.banked).toBe(9999);
  });

  it("refuses a skin that does not exist", () => {
    const r = buySkin(wallet(9999), "unicorn");
    expect(r.bought).toBe(false);
    expect(r.banked).toBe(9999);
  });

  it("does not mutate the wallet it was given", () => {
    const w = wallet(5000, ["copper"]);
    buySkin(w, "gold");
    expect(w).toEqual({ banked: 5000, owned: ["copper"] });
  });

  it("cannot spend a balance into the negative across many buys", () => {
    let w = wallet(5000);
    for (const skin of paid) w = buySkin(w, skin.id);
    expect(w.banked).toBeGreaterThanOrEqual(0);
    // 100+200+300+400+500+1500 = 3000 of the 5000 covers everything up to
    // iron; gold (4000) and beyond are each too much on what is left (2000)
    expect(w.owned).toEqual(["coral", "orchid", "sky", "lime", "copper", "iron"]);
    expect(w.banked).toBe(2000);
  });
});

describe("wearableSkin", () => {
  it("wears an owned skin", () => {
    expect(wearableSkin("gold", ["gold"]).id).toBe("gold");
  });

  it("falls back to the default for one that was never bought", () => {
    expect(wearableSkin("platinum", []).id).toBe(DEFAULT_SKIN_ID);
  });

  it("falls back for a skin that does not exist", () => {
    expect(wearableSkin("unicorn", ["unicorn"]).id).toBe(DEFAULT_SKIN_ID);
  });
});

describe("nextSkinToBuy", () => {
  it("points at the cheapest skin not yet owned", () => {
    expect(nextSkinToBuy(0, []).skin.id).toBe("coral");
  });

  it("skips what is already owned", () => {
    expect(nextSkinToBuy(0, ["coral", "orchid", "sky", "lime"]).skin.id).toBe("copper");
  });

  it("says how much more is needed", () => {
    const coral = skinById("coral");
    expect(nextSkinToBuy(coral.price - 20, []).pointsToGo).toBe(20);
  });

  it("needs nothing more once affordable", () => {
    expect(nextSkinToBuy(1e9, []).pointsToGo).toBe(0);
  });

  it("has nothing left to suggest once everything is owned", () => {
    expect(nextSkinToBuy(1e9, paid.map(s => s.id))).toBeNull();
  });
});

describe("canAfford", () => {
  it("compares the balance against the price", () => {
    expect(canAfford(skinById("gold"), skinById("gold").price)).toBe(true);
    expect(canAfford(skinById("gold"), 0)).toBe(false);
  });
});

describe("skinFromHue", () => {
  it("dresses a rival eel in its own hue", () => {
    expect(skinFromHue(210).hue).toBe(210);
  });
});
