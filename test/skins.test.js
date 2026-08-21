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

  it("sells the rest: colours, then metals, then elements, then gems, then heroes", () => {
    expect(paid.map(s => s.id)).toEqual([
      "coral", "orchid", "sky", "lime",
      "copper", "iron", "gold", "platinum",
      "water", "air", "earth", "fire", "lightning",
      "emerald", "ruby", "diamond",
      "spider", "eelwolf", "symbiote", "eelpool",
    ]);
  });

  it("marks exactly the gem tier for the shimmer treatment", () => {
    expect(SKINS.filter(s => s.gem).map(s => s.id)).toEqual(["emerald", "ruby", "diamond"]);
  });

  it("charges one price per tier — for the tiers that still share one", () => {
    // Elements and Special price per skin instead (each is its own theme,
    // priced and gated by how dramatic it is to look at, not by a shared
    // ladder position) — see the Elements-specific price/level tests below.
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
    // fx joins gem/sheen/accent as a fourth mutually-exclusive finish; a skin
    // wears exactly one of them (mark is a flourish layered on top, not a
    // finish, so it's allowed to coexist with any of these)
    for (const s of SKINS) {
      expect([s.gem, s.sheen > 0, !!s.accent, !!s.fx].filter(Boolean).length).toBeLessThanOrEqual(1);
    }
  });

  it("only ever names an fx the renderer knows how to draw", () => {
    for (const s of SKINS) {
      if (s.fx === undefined) continue;
      expect(["ripple", "vortex", "cracks", "ember", "arc"]).toContain(s.fx);
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
    expect(skinsByTier("element").map(s => s.id))
      .toEqual(["water", "air", "earth", "fire", "lightning"]);
    expect(skinsByTier("gemstone").map(s => s.id))
      .toEqual(["emerald", "ruby", "diamond"]);
    expect(skinsByTier("hero").map(s => s.id))
      .toEqual(["spider", "eelwolf", "symbiote", "eelpool"]);
  });

  it("lists the shop's sections in the order a player browses them", () => {
    expect(TIERS.map(t => t.id))
      .toEqual(["standard", "metallic", "element", "gemstone", "hero"]);
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

  it("prices ascend within each section, in listing order", () => {
    // no longer true of the whole shop at once — Water (element, 3,000) sits
    // below Platinum (metallic, 5,000) — but within any one section, the
    // skin listed second never costs less than the one listed first
    for (const tier of TIERS) {
      const prices = skinsByTier(tier.id).map(s => s.price);
      expect([...prices].sort((a, b) => a - b)).toEqual(prices);
    }
  });

  it("deepens each element as it gets more dramatic to look at", () => {
    // price and level ascend together within the section, same shape as the
    // per-section price test above, but for the depth requirement
    const levels = skinsByTier("element").map(s => s.minLevel);
    expect([...levels].sort((a, b) => a - b)).toEqual(levels);
    for (const s of skinsByTier("element")) expect(s.minLevel).toEqual(expect.any(Number));
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

describe("per-skin level gating", () => {
  it("lets a skin's own minLevel override its section's default", () => {
    expect(skinById("eelpool").minLevel).toBe(8);
    expect(levelFor(skinById("eelpool"))).toBe(8);
    // the hero tier's own default (15) is still there for a skin that
    // doesn't name its own, just not exercised by any hero any more
    expect(TIERS.find(t => t.id === "hero").minLevel).toBe(15);
  });

  it("falls back to the section's default when a skin names no minLevel of its own", () => {
    const gold = skinById("gold");
    expect(gold.minLevel).toBeUndefined();
    expect(levelFor(gold)).toBe(TIERS.find(t => t.id === "metallic").minLevel);
  });

  it("opens each hero at its own depth, not the shared tier level", () => {
    expect(levelFor(skinById("eelpool"))).toBe(8);
    expect(levelFor(skinById("spider"))).toBe(9);
    expect(levelFor(skinById("eelwolf"))).toBe(10);
    expect(levelFor(skinById("symbiote"))).toBe(11);
  });

  it("refuses a hero below its own level and quotes that level, not 15", () => {
    const r = buySkin({ banked: 1e9, owned: [], bestLevel: 7 }, "eelpool");
    expect(r.bought).toBe(false);
    expect(r.reason).toContain("level 8");
  });

  it("sells a hero the moment its own level is reached", () => {
    const eelpool = skinById("eelpool");
    const r = buySkin({ banked: eelpool.price, owned: [], bestLevel: 8 }, "eelpool");
    expect(r.bought).toBe(true);
  });

  it("a different hero stays sealed even once the first one opens", () => {
    // level 8 opens Eel-pool but not Spider (9), Eel-wolf (10) or Eel-symbiote (11)
    const r = buySkin({ banked: 1e9, owned: [], bestLevel: 8 }, "symbiote");
    expect(r.bought).toBe(false);
    expect(r.reason).toContain("level 11");
  });

  it("an owned hero stays wearable below its own level — buying gates, wearing never does", () => {
    expect(wearableSkin("symbiote", ["symbiote"]).id).toBe("symbiote");
    expect(meetsLevel(skinById("symbiote"), 1)).toBe(false); // couldn't buy it at level 1...
    expect(wearableSkin("symbiote", ["symbiote"]).id).toBe("symbiote"); // ...but still wears it
  });

  it("opens each element at its own depth", () => {
    expect(levelFor(skinById("water"))).toBe(4);
    expect(levelFor(skinById("air"))).toBe(5);
    expect(levelFor(skinById("earth"))).toBe(6);
    expect(levelFor(skinById("fire"))).toBe(7);
    expect(levelFor(skinById("lightning"))).toBe(8);
  });

  it("refuses Lightning below level 8 and quotes its own level", () => {
    const r = buySkin({ banked: 1e9, owned: [], bestLevel: 7 }, "lightning");
    expect(r.bought).toBe(false);
    expect(r.reason).toContain("level 8");
  });

  it("sells Water the moment level 4 is reached, well below the metallic tier's own gate", () => {
    const water = skinById("water");
    const r = buySkin({ banked: water.price, owned: [], bestLevel: 4 }, "water");
    expect(r.bought).toBe(true);
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
