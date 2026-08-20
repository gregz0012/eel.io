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
//   sheen: n    0..1, how hard the light catches a metal. Drives a bright
//               specular streak down one flank and a dark rim down the other,
//               which is what reads as curved metal rather than flat colour.
//               This is the whole ladder from dull iron to mirror platinum,
//               so it rises with price.
//   accent: {}  a second colour, banded along the body, for two-tone skins.
//   accentRatio how much of each band cycle the accent takes, 0..1, default
//               half. Low values give thin streaks on a dominant base — which
//               is what keeps Symbiote mostly black rather than half white.
//   mark: "…"   a flourish drawn over the skin, or a list of them: "web" for
//               crosshatched strands, "ears" for a pointed cowl, "patch" for
//               black mask panels with small eye holes, "swords" for crossed
//               katanas on the back.

/**
 * Colours are HSL parts the renderer assembles, so a skin can be a metal
 * (low saturation, bright head) and not just a hue.
 */
export const SKINS = [
  // yours from the start
  { id: "volt",     name: "Volt",     hue: 165, sat: 70, bodyLight: 38, headLight: 58, price: 0 },

  // plain colours — an early, easy first purchase, all one price
  { id: "coral",    name: "Coral",    hue: 14,  sat: 78, bodyLight: 40, headLight: 60, price: 250 },
  { id: "orchid",   name: "Orchid",   hue: 292, sat: 62, bodyLight: 40, headLight: 60, price: 250 },
  { id: "sky",      name: "Sky",      hue: 205, sat: 74, bodyLight: 40, headLight: 60, price: 250 },
  { id: "lime",     name: "Lime",     hue: 95,  sat: 62, bodyLight: 36, headLight: 56, price: 250 },

  // the metals — sheen climbs with price, so the ladder is visible at a glance
  { id: "copper",   name: "Copper",   hue: 24,  sat: 62, bodyLight: 32, headLight: 54, price: 500,  sheen: 0.32 },
  { id: "iron",     name: "Iron",     hue: 210, sat: 10, bodyLight: 38, headLight: 64, price: 1000, sheen: 0.52 },
  { id: "gold",     name: "Gold",     hue: 45,  sat: 78, bodyLight: 40, headLight: 66, price: 2000, sheen: 0.78 },
  { id: "platinum", name: "Platinum", hue: 205, sat: 14, bodyLight: 56, headLight: 90, price: 5000, sheen: 1 },

  // the gems — all one price, all shimmering
  { id: "emerald",  name: "Emerald",  hue: 150, sat: 85, bodyLight: 34, headLight: 60, price: 7500, gem: true },
  { id: "ruby",     name: "Ruby",     hue: 350, sat: 82, bodyLight: 36, headLight: 60, price: 7500, gem: true },
  { id: "diamond",  name: "Diamond",  hue: 190, sat: 45, bodyLight: 58, headLight: 82, price: 7500, gem: true },

  // two-tone heroes — the top of the shop
  { id: "spider",   name: "Spider",   hue: 352, sat: 84, bodyLight: 41, headLight: 49, price: 10000,
    accent: { hue: 222, sat: 80, light: 31 }, accentRatio: 0.3, mark: "web" },
  { id: "wolfey",   name: "Wolfey",   hue: 47,  sat: 94, bodyLight: 48, headLight: 62, price: 10000,
    accent: { hue: 226, sat: 72, light: 20 }, accentRatio: 0.42, mark: "ears" },
  { id: "symbiote", name: "Symbiote", hue: 265, sat: 26, bodyLight: 10, headLight: 15, price: 10000,
    accent: { hue: 0,   sat: 0,  light: 95 }, accentRatio: 0.18, mark: "web" },
  { id: "eelpool",  name: "Eel-pool", hue: 354, sat: 82, bodyLight: 38, headLight: 46, price: 10000,
    accent: { hue: 0,   sat: 0,  light: 9 },  accentRatio: 0.3, mark: ["patch", "swords"] },
];

export const DEFAULT_SKIN_ID = "volt";

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
 * @param {{banked:number, owned:string[]}} wallet
 * @returns {{banked:number, owned:string[], bought:boolean, reason?:string}}
 *          The wallet is returned unchanged when the purchase cannot happen.
 */
export function buySkin(wallet, id) {
  const owned = [...(wallet?.owned ?? [])];
  const banked = Math.max(0, wallet?.banked ?? 0);
  const skin = SKINS.find(s => s.id === id);

  if (!skin) return { banked, owned, bought: false, reason: "no such skin" };
  if (isOwned(skin.id, owned)) return { banked, owned, bought: false, reason: "already yours" };
  if (!canAfford(skin, banked)) {
    return { banked, owned, bought: false, reason: `${skin.price - banked} more points needed` };
  }
  return { banked: banked - skin.price, owned: [...owned, skin.id], bought: true };
}

/**
 * The skin the player may wear, falling back to the default when they ask for
 * one they do not own. This is what stops an edited store wearing platinum.
 */
export function wearableSkin(id, owned) {
  return isOwned(id, owned) ? skinById(id) : skinById(DEFAULT_SKIN_ID);
}

/** The cheapest skin not yet owned, and what it still costs. */
export function nextSkinToBuy(banked, owned) {
  const skin = SKINS
    .filter(s => !isOwned(s.id, owned))
    .sort((a, b) => a.price - b.price)[0];
  return skin ? { skin, pointsToGo: Math.max(0, skin.price - Math.max(0, banked ?? 0)) } : null;
}

/** Turn a bare hue (rival eels) into a skin the renderer can use. */
export function skinFromHue(hue) {
  return { id: "rival", name: "Rival", hue, sat: 70, bodyLight: 38, headLight: 58, price: 0 };
}

/**
 * Which of four states a skin is in for a given player — what the shop's
 * preview panel should say about whatever is currently being browsed:
 * "worn" (currently equipped), "owned" (bought, not worn), "affordable" (not
 * owned, but the bank covers it), or "locked" (not owned, not yet affordable).
 */
export function skinStatus(skin, { wornId, owned, banked } = {}) {
  if (skin.id === wornId) return "worn";
  if (isOwned(skin.id, owned)) return "owned";
  return canAfford(skin, banked) ? "affordable" : "locked";
}
