// Eel skins: five you start with, six you buy.
//
// A skin is bought once out of the bank and owned forever — the balance goes
// down, ownership never does. Nothing can take a skin away, which is the same
// promise the level rules make.
//
// This catalogue is the tunable surface for skins: prices and colours live here
// together, because a balance change should touch one file, not two.

/**
 * Colours are HSL parts the renderer assembles, so a skin can be a metal
 * (low saturation, bright head) and not just a hue.
 */
export const SKINS = [
  // yours from the start
  { id: "volt",     name: "Volt",     hue: 165, sat: 70, bodyLight: 38, headLight: 58, price: 0 },
  { id: "coral",    name: "Coral",    hue: 14,  sat: 78, bodyLight: 40, headLight: 60, price: 0 },
  { id: "orchid",   name: "Orchid",   hue: 292, sat: 62, bodyLight: 40, headLight: 60, price: 0 },
  { id: "sky",      name: "Sky",      hue: 205, sat: 74, bodyLight: 40, headLight: 60, price: 0 },
  { id: "lime",     name: "Lime",     hue: 95,  sat: 62, bodyLight: 36, headLight: 56, price: 0 },

  // bought, cheapest first
  { id: "copper",   name: "Copper",   hue: 22,  sat: 58, bodyLight: 36, headLight: 54, price: 500 },
  { id: "iron",     name: "Iron",     hue: 210, sat: 10, bodyLight: 34, headLight: 56, price: 1500 },
  { id: "gold",     name: "Gold",     hue: 45,  sat: 80, bodyLight: 42, headLight: 62, price: 4000 },
  { id: "emerald",  name: "Emerald",  hue: 150, sat: 72, bodyLight: 32, headLight: 54, price: 9000 },
  { id: "diamond",  name: "Diamond",  hue: 190, sat: 45, bodyLight: 55, headLight: 78, price: 20000 },
  { id: "platinum", name: "Platinum", hue: 220, sat: 8,  bodyLight: 58, headLight: 82, price: 40000 },
];

export const DEFAULT_SKIN_ID = "volt";

export function skinById(id) {
  return SKINS.find(s => s.id === id) ?? SKINS.find(s => s.id === DEFAULT_SKIN_ID);
}

/** The five free skins need no purchase; the rest must have been bought. */
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
