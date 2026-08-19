// Eel skins: five to start with, six more unlocked by playing.
//
// Unlocks are thresholds against *lifetime* points — the running total of
// everything ever scored, which only goes up. Nothing is spent and nothing can
// be lost, the same promise the level rules make. A skin, once earned, is
// earned.
//
// This catalogue is the tunable surface for skins: costs and colours both live
// here rather than being split between two files.

/**
 * Colours are HSL parts the renderer assembles, so a skin can be a metal
 * (low saturation, bright head) and not just a hue.
 */
export const SKINS = [
  // the five you start with
  { id: "volt",     name: "Volt",     hue: 165, sat: 70, bodyLight: 38, headLight: 58, unlockAt: 0 },
  { id: "coral",    name: "Coral",    hue: 14,  sat: 78, bodyLight: 40, headLight: 60, unlockAt: 0 },
  { id: "orchid",   name: "Orchid",   hue: 292, sat: 62, bodyLight: 40, headLight: 60, unlockAt: 0 },
  { id: "sky",      name: "Sky",      hue: 205, sat: 74, bodyLight: 40, headLight: 60, unlockAt: 0 },
  { id: "lime",     name: "Lime",     hue: 95,  sat: 62, bodyLight: 36, headLight: 56, unlockAt: 0 },

  // earned, cheapest first
  { id: "copper",   name: "Copper",   hue: 22,  sat: 58, bodyLight: 36, headLight: 54, unlockAt: 500 },
  { id: "iron",     name: "Iron",     hue: 210, sat: 10, bodyLight: 34, headLight: 56, unlockAt: 1500 },
  { id: "gold",     name: "Gold",     hue: 45,  sat: 80, bodyLight: 42, headLight: 62, unlockAt: 4000 },
  { id: "emerald",  name: "Emerald",  hue: 150, sat: 72, bodyLight: 32, headLight: 54, unlockAt: 9000 },
  { id: "diamond",  name: "Diamond",  hue: 190, sat: 45, bodyLight: 55, headLight: 78, unlockAt: 20000 },
  { id: "platinum", name: "Platinum", hue: 220, sat: 8,  bodyLight: 58, headLight: 82, unlockAt: 40000 },
];

export const DEFAULT_SKIN_ID = "volt";

export function skinById(id) {
  return SKINS.find(s => s.id === id) ?? SKINS.find(s => s.id === DEFAULT_SKIN_ID);
}

export function isSkinUnlocked(skin, lifetimePoints) {
  return (lifetimePoints ?? 0) >= skin.unlockAt;
}

export function unlockedSkins(lifetimePoints) {
  return SKINS.filter(s => isSkinUnlocked(s, lifetimePoints));
}

/**
 * The skin a player can select, falling back to the default if they have not
 * earned the one they asked for. Guards against a stale stored choice, and
 * against anyone editing their own storage to wear platinum.
 */
export function wearableSkin(id, lifetimePoints) {
  const skin = skinById(id);
  return isSkinUnlocked(skin, lifetimePoints) ? skin : skinById(DEFAULT_SKIN_ID);
}

/** The next skin to work towards, with how far off it is. */
export function nextUnlock(lifetimePoints) {
  const points = lifetimePoints ?? 0;
  const skin = SKINS.filter(s => s.unlockAt > points).sort((a, b) => a.unlockAt - b.unlockAt)[0];
  return skin ? { skin, pointsToGo: skin.unlockAt - points } : null;
}

/** Skins unlocked by crossing from one lifetime total to another. */
export function skinsUnlockedBy(before, after) {
  return SKINS.filter(s => s.unlockAt > 0 && s.unlockAt > (before ?? 0) && s.unlockAt <= (after ?? 0));
}

/** Turn a bare hue (rival eels) into a skin the renderer can use. */
export function skinFromHue(hue) {
  return { id: "rival", name: "Rival", hue, sat: 70, bodyLight: 38, headLight: 58, unlockAt: 0 };
}
