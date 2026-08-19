// Eel skins: one you start with, the rest you buy.
//
// A skin is bought once out of the bank and owned forever — the balance goes
// down, ownership never does. Nothing can take a skin away, which is the same
// promise the level rules make.
//
// This catalogue is the tunable surface for skins: prices and colours live here
// together, because a balance change should touch one file, not two. The top
// tier (copper through platinum) is named for the sea rather than the metal —
// things a diver actually finds down there — while staying priced and coloured
// like the rarity ladder it is.

/**
 * Colours are HSL parts the renderer assembles, so a skin can be a metal
 * (low saturation, bright head) and not just a hue.
 */
export const SKINS = [
  // yours from the start
  { id: "volt",     name: "Volt",            hue: 165, sat: 70, bodyLight: 38, headLight: 58, price: 0 },

  // cheap recolours — an early, easy first purchase
  { id: "coral",    name: "Coral",           hue: 14,  sat: 78, bodyLight: 40, headLight: 60, price: 100 },
  { id: "orchid",   name: "Orchid",          hue: 292, sat: 62, bodyLight: 40, headLight: 60, price: 200 },
  { id: "sky",      name: "Sky",             hue: 205, sat: 74, bodyLight: 40, headLight: 60, price: 300 },
  { id: "lime",     name: "Lime",            hue: 95,  sat: 62, bodyLight: 36, headLight: 56, price: 400 },

  // the nautical tier, cheapest first
  { id: "copper",   name: "Copper Hull",     hue: 22,  sat: 58, bodyLight: 36, headLight: 54, price: 500 },
  { id: "iron",     name: "Iron Anchor",     hue: 210, sat: 10, bodyLight: 34, headLight: 56, price: 1500 },
  { id: "gold",     name: "Gold Doubloon",   hue: 45,  sat: 80, bodyLight: 42, headLight: 62, price: 4000 },
  { id: "diamond",  name: "Diamond Reef",    hue: 190, sat: 45, bodyLight: 55, headLight: 78, price: 10000 },
  { id: "platinum", name: "Platinum Compass",hue: 220, sat: 8,  bodyLight: 58, headLight: 82, price: 25000 },
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
