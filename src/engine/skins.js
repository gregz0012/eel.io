// Eel skins: one you start with, the rest you buy.
//
// A skin is bought once out of the bank and owned forever — the balance goes
// down, ownership never does. Nothing can take a skin away, which is the same
// promise the level rules make.
//
// This catalogue is the tunable surface for skins: prices and colours live here
// together, because a balance change should touch one file, not two.
//
// Three optional flags tell the renderer to do something beyond a flat colour.
// All of them are data, not drawing: the engine only says what a skin *is*,
// and how that gets drawn is entirely the shell's business (drawEelBody and
// drawPreviewEel in src/index.html).
//
//   gem: true   a rarer, showier finish — a travelling sparkle and a faceted
//               glint on the head.
//   sheen: n    0..1, how hard the light catches the skin. Drives a bright
//               specular streak down one flank and a dark rim down the other,
//               which is what reads as a curved, lit surface rather than flat
//               colour. Across the metals it is the whole ladder from dull
//               iron to mirror platinum, so there it rises with price; a low
//               value also serves as a wet gloss on something like tar.
//   accent: {}  a second colour, banded along the body, for two-tone skins.
//   accentRatio how much of each band cycle the accent takes, 0..1, default
//               half. Low values give thin streaks on a dominant base — which
//               is what keeps Symbiote mostly black rather than half white.
//   mark: "…"   a flourish drawn over the skin, or a list of them: "web" for
//               crosshatched strands, "ears" for a pointed cowl masked through
//               the eyes, "patch" for black mask panels with small eye holes,
//               "swords" for crossed katanas on the back, "emblem" for a
//               spider spread across the back, "stare" for a pair of wide
//               pupil-less eyes.
//   fx: "…"     a themed finish — ripples, cracks, arcs, that sort of thing —
//               drawn by the matching function in the shell's SKIN_FX table.
//               Like gem and sheen, a skin only ever wears one finish; fx is
//               exclusive with those two but may sit alongside accent/mark,
//               the same way a hero's banding and flourish already do.

/**
 * Colours are HSL parts the renderer assembles, so a skin can be a metal
 * (low saturation, bright head) and not just a hue.
 */
export const SKINS = [
  // yours from the start
  { id: "volt", tier: "standard",     name: "Volt",     hue: 165, sat: 70, bodyLight: 38, headLight: 58, price: 0 },

  // plain colours — an early, easy first purchase, all one price
  { id: "coral", tier: "standard",    name: "Coral",    hue: 14,  sat: 78, bodyLight: 40, headLight: 60, price: 250 },
  { id: "orchid", tier: "standard",   name: "Orchid",   hue: 292, sat: 62, bodyLight: 40, headLight: 60, price: 250 },
  { id: "sky", tier: "standard",      name: "Sky",      hue: 205, sat: 74, bodyLight: 40, headLight: 60, price: 250 },
  { id: "lime", tier: "standard",     name: "Lime",     hue: 95,  sat: 62, bodyLight: 36, headLight: 56, price: 250 },

  // the metals — sheen climbs with price, so the ladder is visible at a glance
  { id: "copper", tier: "metallic",   name: "Copper",   hue: 24,  sat: 62, bodyLight: 32, headLight: 54, price: 500,  sheen: 0.32 },
  { id: "iron", tier: "metallic",     name: "Iron",     hue: 210, sat: 10, bodyLight: 38, headLight: 64, price: 1000, sheen: 0.52 },
  { id: "gold", tier: "metallic",     name: "Gold",     hue: 45,  sat: 78, bodyLight: 40, headLight: 66, price: 2000, sheen: 0.78 },
  { id: "platinum", tier: "metallic", name: "Platinum", hue: 205, sat: 14, bodyLight: 56, headLight: 90, price: 5000, sheen: 1 },

  // the elements — each its own price and its own depth, deepening as the
  // element gets more dramatic to look at rather than climbing a flat ladder
  { id: "water", tier: "element", name: "Water", hue: 195, sat: 70, bodyLight: 30, headLight: 52, price: 3000,
    minLevel: 4, fx: "ripple" },
  { id: "air", tier: "element", name: "Air", hue: 200, sat: 20, bodyLight: 62, headLight: 86, price: 4000,
    minLevel: 5, fx: "vortex" },
  { id: "earth", tier: "element", name: "Earth", hue: 28, sat: 35, bodyLight: 22, headLight: 34, price: 5000,
    minLevel: 6, fx: "cracks" },
  { id: "fire", tier: "element", name: "Fire", hue: 8, sat: 55, bodyLight: 16, headLight: 24, price: 6000,
    minLevel: 7, fx: "ember" },
  { id: "lightning", tier: "element", name: "Lightning", hue: 192, sat: 90, bodyLight: 42, headLight: 68, price: 7500,
    minLevel: 8, fx: "arc" },

  // the gems — all one price, all shimmering
  { id: "emerald", tier: "gemstone",  name: "Emerald",  hue: 150, sat: 85, bodyLight: 34, headLight: 60, price: 7500, gem: true },
  { id: "ruby", tier: "gemstone",     name: "Ruby",     hue: 350, sat: 82, bodyLight: 36, headLight: 60, price: 7500, gem: true },
  { id: "diamond", tier: "gemstone",  name: "Diamond",  hue: 190, sat: 45, bodyLight: 58, headLight: 82, price: 7500, gem: true },

  // the special finishes — the four here are each a variant of an Elements
  // effect (biolume from Water's dots, toxic from its bubble trail, frost
  // from the gems' twinkle, lava from Earth's cracks), priced and gated the
  // same theme-first way the Elements are
  { id: "biolume", tier: "special", name: "Bioluminescent", hue: 178, sat: 75, bodyLight: 10, headLight: 18, price: 6000,
    minLevel: 6, fx: "spots" },
  { id: "toxic", tier: "special", name: "Toxic", hue: 82, sat: 70, bodyLight: 26, headLight: 40, price: 7000,
    minLevel: 7, fx: "slime" },
  { id: "frost", tier: "special", name: "Frost", hue: 198, sat: 40, bodyLight: 62, headLight: 90, price: 7500,
    minLevel: 8, fx: "sparkle" },
  // the signature skin: a skeleton that glows brighter with the live zap
  // charge and flares on a fresh zap — see chargeGlow below. Needs no
  // gameplay state of its own beyond what the shell already tracks, so it
  // stays a normal catalogue row; only the fx wiring is bespoke.
  { id: "xray", tier: "special", name: "X-Ray", hue: 190, sat: 55, bodyLight: 12, headLight: 20, price: 8000,
    minLevel: 8, fx: "xray" },
  // the remaining four special finishes change the body-drawing pass itself
  // rather than layering an effect on top of it — fade dims the stroke
  // toward the tail, iridescent drifts its hue — so a bug here disfigures
  // the eel, not just a stray sparkle; afterimage and stars still overlay,
  // but are grouped here since they were built alongside the two that don't
  { id: "abyss", tier: "special", name: "Abyss", hue: 220, sat: 35, bodyLight: 7, headLight: 13, price: 8500,
    minLevel: 9, fx: "fade" },
  { id: "lava", tier: "special", name: "Lava", hue: 14, sat: 60, bodyLight: 10, headLight: 16, price: 9000,
    minLevel: 9, fx: "molten" },
  { id: "ghost", tier: "special", name: "Ghost", hue: 195, sat: 12, bodyLight: 72, headLight: 94, price: 10000,
    minLevel: 10, fx: "afterimage" },
  { id: "prism", tier: "special", name: "Prism", hue: 0, sat: 70, bodyLight: 55, headLight: 80, price: 12500,
    minLevel: 10, fx: "iridescent" },
  { id: "void", tier: "special", name: "Void", hue: 260, sat: 25, bodyLight: 4, headLight: 9, price: 12500,
    minLevel: 12, fx: "stars" },

  // two-tone heroes — the top of the shop. Each opens at its own depth now
  // (see `minLevel` below `levelFor`) rather than sharing the hero tier's
  // one Level 15 gate, so reaching the top of the shop is a ladder, not a
  // single distant step.
  { id: "spider", tier: "hero",   name: "Spider",   hue: 352, sat: 84, bodyLight: 41, headLight: 49, price: 10000,
    minLevel: 9, accent: { hue: 222, sat: 80, light: 31 }, accentRatio: 0.3, mark: "web" },
  { id: "eelwolf", tier: "hero",  name: "Eel-wolf", hue: 47,  sat: 94, bodyLight: 48, headLight: 62, price: 10000,
    minLevel: 10, accent: { hue: 226, sat: 72, light: 20 }, accentRatio: 0.42, mark: "ears" },
  // no banding: its white is the spider, the grin and the stare, and a banded
  // ring would only compete with them. Barely any saturation either — the body
  // taper adds up to 18% lightness towards the head, so a saturated hue turns
  // visibly purple there instead of staying tar-black. A little sheen gives it
  // the wet gloss tar has.
  { id: "symbiote", tier: "hero", name: "Eel-symbiote", hue: 250, sat: 9, bodyLight: 5, headLight: 8, price: 10000,
    minLevel: 11, sheen: 0.3, mark: ["emblem", "stare"] },
  { id: "eelpool", tier: "hero",  name: "Eel-pool", hue: 354, sat: 82, bodyLight: 38, headLight: 46, price: 10000,
    minLevel: 8, accent: { hue: 0,   sat: 0,  light: 9 },  accentRatio: 0.3, mark: ["patch", "swords"] },
];

export const DEFAULT_SKIN_ID = "volt";

/**
 * The shop's sections, in the order they are shown. `tier` is stored on each
 * skin rather than worked out from its flags: Eel-symbiote carries `sheen` for
 * its wet gloss but belongs with the heroes, so inferring "metallic" from that
 * flag would file it in the wrong section.
 *
 * `minLevel` is a section's *default* depth requirement — the one a skin in
 * it falls back to if it does not name its own. Points alone are no longer
 * enough: the shop is a reason to go deeper, not just to grind fish in the
 * shallows.
 */
export const TIERS = [
  { id: "standard", label: "Standard", minLevel: 2 },
  { id: "metallic", label: "Metallic", minLevel: 5 },
  { id: "element",  label: "Elements", minLevel: 4 },
  { id: "gemstone", label: "Gemstone", minLevel: 10 },
  { id: "special",  label: "Special",  minLevel: 6 },
  { id: "hero",     label: "Heroes",   minLevel: 15 },
];

export function skinsByTier(tier) {
  return SKINS.filter(s => s.tier === tier);
}

/**
 * The deepest level a player needs before this skin can be bought. A skin's
 * own `minLevel` wins when it has one (the four heroes each open at their
 * own depth now); otherwise it falls back to its section's default.
 */
export function levelFor(skin) {
  return skin?.minLevel ?? TIERS.find(t => t.id === skin?.tier)?.minLevel ?? 1;
}

/**
 * Is this skin's section open to a player who has reached `bestLevel`?
 *
 * The free starting skin is exempt, and that exemption is the whole point:
 * Volt sits in the "standard" section, so a level gate applied blindly would
 * lock a brand-new player out of their own eel. The gate is on *buying*, never
 * on wearing — see `wearableSkin`, which stays level-blind so nothing a player
 * already owns can ever be taken away from them.
 */
export function meetsLevel(skin, bestLevel) {
  if (!skin) return false;
  if (skin.price === 0) return true;
  return Math.max(1, bestLevel ?? 1) >= levelFor(skin);
}

export function skinById(id) {
  return SKINS.find(s => s.id === id) ?? SKINS.find(s => s.id === DEFAULT_SKIN_ID);
}

/** The one free skin needs no purchase; the rest must have been bought. */
export function isOwned(id, owned) {
  const skin = SKINS.find(s => s.id === id);
  if (!skin) return false;
  return skin.price === 0 || (owned ?? []).includes(skin.id);
}

export function ownedSkins(owned) {
  return SKINS.filter(s => isOwned(s.id, owned));
}

export function canAfford(skin, banked) {
  return Math.max(0, banked ?? 0) >= skin.price;
}

/**
 * Buy a skin out of the bank.
 * @param {{banked:number, owned:string[], bestLevel?:number}} wallet
 * @returns {{banked:number, owned:string[], bought:boolean, reason?:string}}
 *          The wallet is returned unchanged when the purchase cannot happen.
 */
export function buySkin(wallet, id) {
  const owned = [...(wallet?.owned ?? [])];
  const banked = Math.max(0, wallet?.banked ?? 0);
  const bestLevel = Math.max(1, wallet?.bestLevel ?? 1);
  const skin = SKINS.find(s => s.id === id);

  // A wallet goes in and a wallet comes out, bestLevel included: the result is
  // a legal input to the next call. Dropping the level here would mean a second
  // buy chained off the first silently saw a level 1 player and sealed the shop.
  const refuse = reason => ({ banked, owned, bestLevel, bought: false, reason });

  if (!skin) return refuse("no such skin");
  if (isOwned(skin.id, owned)) return refuse("already yours");
  // Depth before money: the level is the slower half to fix, so say so first.
  if (!meetsLevel(skin, bestLevel)) return refuse(`reach level ${levelFor(skin)} first`);
  if (!canAfford(skin, banked)) return refuse(`${skin.price - banked} more points needed`);

  return { banked: banked - skin.price, owned: [...owned, skin.id], bestLevel, bought: true };
}

/**
 * The skin the player may wear, falling back to the default when they ask for
 * one they do not own. This is what stops an edited store wearing platinum.
 */
export function wearableSkin(id, owned) {
  return isOwned(id, owned) ? skinById(id) : skinById(DEFAULT_SKIN_ID);
}

/**
 * The cheapest skin the player could actually go and buy next, and what it
 * still costs. Skins whose section is still shut are skipped: dangling
 * "1,250 more for Emerald" in front of a level 3 player is a lie, because
 * points are not what is stopping them.
 */
export function nextSkinToBuy(banked, owned, bestLevel) {
  const affordableSoon = SKINS
    .filter(s => !isOwned(s.id, owned) && meetsLevel(s, bestLevel))
    .sort((a, b) => a.price - b.price)[0];
  const skin = affordableSoon
    ?? SKINS.filter(s => !isOwned(s.id, owned)).sort((a, b) => a.price - b.price)[0];
  if (!skin) return null;
  return {
    skin,
    pointsToGo: Math.max(0, skin.price - Math.max(0, banked ?? 0)),
    locked: !meetsLevel(skin, bestLevel),
    needsLevel: levelFor(skin),
  };
}

/** Turn a bare hue (rival eels) into a skin the renderer can use. */
export function skinFromHue(hue) {
  return { id: "rival", name: "Rival", hue, sat: 70, bodyLight: 38, headLight: 58, price: 0 };
}

/**
 * Which of five states a skin is in for a given player — what the shop's
 * preview panel should say about whatever is currently being browsed:
 * "worn" (currently equipped), "owned" (bought, not worn), "affordable" (not
 * owned, but the bank covers it), "sealed" (the section has not opened yet) or
 * "locked" (open, but not yet affordable).
 *
 * A skin can be both too deep and too dear at once. "sealed" wins, because
 * points are the half a player can fix this afternoon — telling them the price
 * when the real obstacle is the level would send them grinding at something
 * that cannot work.
 */
export function skinStatus(skin, { wornId, owned, banked, bestLevel } = {}) {
  if (skin.id === wornId) return "worn";
  if (isOwned(skin.id, owned)) return "owned";
  if (!meetsLevel(skin, bestLevel)) return "sealed";
  return canAfford(skin, banked) ? "affordable" : "locked";
}

/**
 * X-Ray's skeleton brightness, 0..1: dim at rest, brighter the more the zap
 * meter has charged, and flaring toward full while a fresh zap's flash timer
 * is still running down. `flashT` is expected already normalised 0..1 (1 the
 * instant a zap fires, decaying to 0) — the shell owns that timer, this stays
 * a pure function of two numbers. Garbage input clamps rather than throws, so
 * a stray NaN never turns the skeleton invisible or blinding.
 */
export function chargeGlow(charge, flashT) {
  const clamp01 = n => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0);
  const c = clamp01(Number(charge));
  const base = 0.15 + 0.55 * c;          // dim at rest, brighter as charge climbs
  const flare = clamp01(Number(flashT));
  return base + (1 - base) * flare;      // flares toward 1, decays back to base
}
