import { describe, it, expect } from "vitest";
import {
  SKINS, DEFAULT_SKIN_ID, TIERS, skinsByTier, skinById, isOwned, ownedSkins,
  canAfford, buySkin, wearableSkin, nextSkinToBuy, skinFromHue, skinStatus,
  levelFor, meetsLevel,
} from "../src/engine/skins.js";

const free = SKINS.filter(s => s.price === 0);
const paid = SKINS.filter(s => s.price > 0);

// Deep enough that the level gate never fires: these tests are about money.
const DEEP = 99;

describe("the catalogue", () => {
  it("gives everyone exactly one colour to start with", () => {
    expect(free).toHaveLength(1);
    expect(free[0].id).toBe(DEFAULT_SKIN_ID);
  });

  it("sells the rest: colours, then metals, then gems, then heroes", () => {
    expect(paid.map(s => s.id)).toEqual([
      "coral", "orchid", "sky", "lime",
      "copper", "iron", "gold", "platinum",
      "emerald", "ruby", "diamond",
      "spider", "eelwolf", "symbiote", "eelpool",
    ]);
  });

  it("marks exactly the gem tier for the shimmer treatment", () => {
    expect(SKINS.filter(s => s.gem).map(s => s.id)).toEqual(["emerald", "ruby", "diamond"]);
  });

  it("charges one price per tier", () => {
    const priceOf = id => skinById(id).price;
    for (const id of ["coral", "orchid", "sky", "lime"]) expect(priceOf(id)).toBe(250);
    for (const id of ["emerald", "ruby", "diamond"]) expect(priceOf(id)).toBe(7500);
    for (const id of ["spider", "eelwolf", "symbiote", "eelpool"]) expect(priceOf(id)).toBe(10000);
  });

  it("climbs the metals in price", () => {
    expect(["copper", "iron", "gold", "platinum"].map(id => skinById(id).price))
      .toEqual([500, 1000, 2000, 5000]);
  });

  it("gives every metal a sheen that rises with its price", () => {
    // sheen is what makes a metal read as metal rather than flat colour, so
    // the dearer metal must always be the shinier one — platinum has to look
    // visibly better than iron, not merely cost more.
    // sheen is not metal-only any more — Eel-symbiote uses a little of it as a
    // wet gloss — so name the metals rather than inferring them from the flag
    const metals = ["copper", "iron", "gold", "platinum"].map(skinById);
    for (const m of metals) expect(m.sheen).toBeGreaterThan(0);

    const byPrice = [...metals].sort((a, b) => a.price - b.price);
    const sheens = byPrice.map(s => s.sheen);
    expect([...sheens].sort((a, b) => a - b)).toEqual(sheens);
    expect(skinById("platinum").sheen).toBeGreaterThan(skinById("iron").sheen);
  });

  it("gives every banded hero a second colour to band with", () => {
    // Eel-symbiote is deliberately unbanded — banding colours whole
    // cross-sections, so on a black skin it reads as white rings rather than
    // markings, and its white is carried by the spider and the face instead
    for (const id of ["spider", "eelwolf", "eelpool"]) {
      expect(skinById(id).accent).toMatchObject({
        hue: expect.any(Number), sat: expect.any(Number), light: expect.any(Number),
      });
    }
    expect(skinById("symbiote").accent).toBeUndefined();
  });

  it("keeps the finishes separate — no skin is two things at once", () => {
    for (const s of SKINS) {
      expect([s.gem, s.sheen > 0, !!s.accent].filter(Boolean).length).toBeLessThanOrEqual(1);
    }
  });

  it("files every skin under exactly one section of the shop", () => {
    const ids = TIERS.map(t => t.id);
    for (const s of SKINS) expect(ids).toContain(s.tier);
    const listed = TIERS.flatMap(t => skinsByTier(t.id));
    expect(listed).toHaveLength(SKINS.length);          // none missed, none twice
  });

  it("puts each skin in the section a player would look for it in", () => {
    expect(skinsByTier("standard").map(s => s.id))
      .toEqual(["volt", "coral", "orchid", "sky", "lime"]);
    expect(skinsByTier("metallic").map(s => s.id))
      .toEqual(["copper", "iron", "gold", "platinum"]);
    expect(skinsByTier("gemstone").map(s => s.id))
      .toEqual(["emerald", "ruby", "diamond"]);
    expect(skinsByTier("hero").map(s => s.id))
      .toEqual(["spider", "eelwolf", "symbiote", "eelpool"]);
  });

  it("keeps Eel-symbiote with the heroes despite its sheen", () => {
    // it carries sheen for a wet gloss, so a tier inferred from that flag
    // would file it under metallic
    expect(skinById("symbiote").sheen).toBeGreaterThan(0);
    expect(skinById("symbiote").tier).toBe("hero");
  });

  it("only ever asks for a mark the renderer knows how to draw", () => {
    for (const s of SKINS) {
      for (const mark of [].concat(s.mark ?? [])) {
        expect(["web", "ears", "patch", "swords", "emblem", "stare"]).toContain(mark);
      }
    }
  });

  it("gives Eel-pool both its mask and its swords", () => {
    expect([].concat(skinById("eelpool").mark)).toEqual(["patch", "swords"]);
  });

  it("keeps Eel-symbiote black, with nothing banded to lighten it", () => {
    // it was once half white, from a near-white accent banded down the body.
    // The white now comes from the spider and the face, so the body itself
    // has to stay black — guard both the darkness and the absence of banding
    const symbiote = skinById("symbiote");
    expect(symbiote.bodyLight).toBeLessThan(15);
    expect(symbiote.headLight).toBeLessThan(20);
    expect(symbiote.accent).toBeUndefined();
    expect(symbiote.accentRatio).toBeUndefined();
  });

  it("keeps every accentRatio a sane fraction", () => {
    for (const s of SKINS) {
      if (s.accentRatio === undefined) continue;
      expect(s.accentRatio).toBeGreaterThan(0);
      expect(s.accentRatio).toBeLessThan(1);
    }
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
  const wallet = (banked, owned = [], bestLevel = DEEP) => ({ banked, owned, bestLevel });

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
    expect(w).toEqual({ banked: 5000, owned: ["copper"], bestLevel: DEEP });
  });

  it("refuses a skin from a section the player has not reached, and takes nothing", () => {
    const r = buySkin(wallet(1e9, [], 1), "gold");
    expect(r.bought).toBe(false);
    expect(r.banked).toBe(1e9);
    expect(r.owned).toEqual([]);
    expect(r.reason).toContain(`level ${levelFor(skinById("gold"))}`);
  });

  it("names the level, not the price, when the player is short of both", () => {
    const r = buySkin(wallet(0, [], 1), "diamond");
    expect(r.reason).toContain("level");
  });

  it("sells once the player is deep enough", () => {
    const gold = skinById("gold");
    expect(buySkin(wallet(gold.price, [], levelFor(gold)), "gold").bought).toBe(true);
  });

  it("returns a wallet the next buy can chain off, level and all", () => {
    const after = buySkin(wallet(5000), "gold");
    expect(after.bestLevel).toBe(DEEP);
    expect(buySkin(after, "copper").bought).toBe(true);
  });

  it("cannot spend a balance into the negative across many buys", () => {
    let w = wallet(5000);
    for (const skin of paid) w = buySkin(w, skin.id);
    expect(w.banked).toBeGreaterThanOrEqual(0);
    // 4x250 + 500 + 1000 + 2000 = 4500 of the 5000 covers everything up to
    // gold; platinum (5000) and beyond are each too much on the 500 left
    expect(w.owned).toEqual(["coral", "orchid", "sky", "lime", "copper", "iron", "gold"]);
    expect(w.banked).toBe(500);
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
    expect(nextSkinToBuy(0, [], DEEP).skin.id).toBe("coral");
  });

  it("skips what is already owned", () => {
    expect(nextSkinToBuy(0, ["coral", "orchid", "sky", "lime"], DEEP).skin.id).toBe("copper");
  });

  it("says how much more is needed", () => {
    const coral = skinById("coral");
    expect(nextSkinToBuy(coral.price - 20, [], DEEP).pointsToGo).toBe(20);
  });

  it("needs nothing more once affordable", () => {
    expect(nextSkinToBuy(1e9, [], DEEP).pointsToGo).toBe(0);
  });

  it("has nothing left to suggest once everything is owned", () => {
    expect(nextSkinToBuy(1e9, paid.map(s => s.id), DEEP)).toBeNull();
  });

  it("points at a section the player can actually shop in", () => {
    // rich but shallow: do not dangle a gem it cannot buy
    const next = nextSkinToBuy(1e9, [], 2);
    expect(next.skin.tier).toBe("standard");
    expect(next.locked).toBe(false);
  });

  it("falls back to the cheapest locked skin when nothing is open yet, and says so", () => {
    const next = nextSkinToBuy(1e9, [], 1);
    expect(next.locked).toBe(true);
    expect(next.needsLevel).toBe(levelFor(next.skin));
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

describe("skinStatus", () => {
  const gold = skinById("gold");

  it("is worn when it is the one currently equipped", () => {
    expect(skinStatus(gold, { wornId: "gold", owned: [], banked: 0, bestLevel: DEEP })).toBe("worn");
  });

  it("is owned when bought but not currently worn", () => {
    expect(skinStatus(gold, { wornId: "volt", owned: ["gold"], banked: 0, bestLevel: DEEP })).toBe("owned");
  });

  it("is affordable when not owned but the bank covers it", () => {
    expect(skinStatus(gold, { wornId: "volt", owned: [], banked: gold.price, bestLevel: DEEP })).toBe("affordable");
  });

  it("is locked when not owned and not yet affordable", () => {
    expect(skinStatus(gold, { wornId: "volt", owned: [], banked: gold.price - 1, bestLevel: DEEP })).toBe("locked");
  });

  it("prefers worn over owned when they happen to coincide", () => {
    expect(skinStatus(gold, { wornId: "gold", owned: ["gold"], banked: 0 })).toBe("worn");
  });

  it("a free skin is always owned, never locked", () => {
    const volt = skinById("volt");
    expect(skinStatus(volt, { wornId: "gold", owned: [], banked: 0 })).toBe("owned");
  });
});
