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
//   material    what the eel's surface is *made from*, as opposed to fx,
//               which is the animated effect layered on top of it (Earth is
//               material:"stone" + fx:"cracks"; Gold is material:"brushedMetal"
//               + sheen:0.78; Water is material:"water" + fx:"ripple").
//               Unlike gem/sheen/accent/fx, which are mutually exclusive with
//               each other, material is orthogonal to all four and may
//               combine with any of them — a metal is still made of metal
//               whether or not it also sparkles. The full catalogue is
//               MATERIALS, below: organic (every Standard/Hero skin's
//               default — subtle, low-contrast surface variation), brushedMetal
//               (the Metallic tier), stone and charred (Earth/Lava and
//               Fire/Lava), crystal (the Gemstones plus Frost/Prism), water
//               and air (their Element and Special-tier variants), charged
//               (Lightning), liquid (Eel-symbiote, and reused at a higher
//               strength/scale by Voidbond — the extra "living surface"
//               detail Voidbond adds over Eel-symbiote's own restrained
//               look lives entirely in its fx, not in the material), chitin
//               (Orbweaver), scarred (Razorback) and worn (Red Rogue) — the
//               last three are the Legends tier's own materials, plated,
//               scarred/striped and battered/asymmetric respectively. A bare
//               string ("stone") or an object ({type, strength, scale}) are
//               both legal; see resolveMaterial below for what each field
//               means and what a skin gets when it names none or an unknown
//               one. Drawn by the shell's SKIN_MATERIAL table, the same
//               dispatch-by-name pattern SKIN_FX already uses — a new
//               material is a new table entry, never a new `if` keyed on a
//               skin id.

/**
 * Colours are HSL parts the renderer assembles, so a skin can be a metal
 * (low saturation, bright head) and not just a hue.
 */
export const SKINS = [
  // yours from the start
  { id: "volt", tier: "standard",     name: "Volt",     hue: 165, sat: 70, bodyLight: 38, headLight: 58, price: 0,
    material: "organic" },

  // plain colours — an early, easy first purchase, all one price. Named
  // explicitly here (every other skin defaults to it until its own PR gives
  // it something else) so the shop's most commonly seen skins are the first
  // proof the material system does anything at all.
  { id: "coral", tier: "standard",    name: "Coral",    hue: 14,  sat: 78, bodyLight: 40, headLight: 60, price: 250,
    material: "organic" },
  { id: "orchid", tier: "standard",   name: "Orchid",   hue: 292, sat: 62, bodyLight: 40, headLight: 60, price: 250,
    material: "organic" },
  { id: "sky", tier: "standard",      name: "Sky",      hue: 205, sat: 74, bodyLight: 40, headLight: 60, price: 250,
    material: "organic" },
  { id: "lime", tier: "standard",     name: "Lime",     hue: 95,  sat: 62, bodyLight: 36, headLight: 56, price: 250,
    material: "organic" },

  // the metals — sheen climbs with price, so the ladder is visible at a
  // glance; brushedMetal's own strength/scale tune each metal's grain
  // separately from that — coarser and wider-spread for a cheap oxidised
  // copper, tighter and richer as the price climbs, all but vanishing under
  // Platinum's near-mirror finish where sheen alone does the work
  { id: "copper", tier: "metallic",   name: "Copper",   hue: 24,  sat: 62, bodyLight: 32, headLight: 54, price: 500,  sheen: 0.32,
    material: { type: "brushedMetal", strength: 0.4, scale: 1.3 } },
  { id: "iron", tier: "metallic",     name: "Iron",     hue: 210, sat: 10, bodyLight: 38, headLight: 64, price: 1000, sheen: 0.52,
    material: { type: "brushedMetal", strength: 0.55, scale: 1.0 } },
  { id: "gold", tier: "metallic",     name: "Gold",     hue: 45,  sat: 78, bodyLight: 40, headLight: 66, price: 2000, sheen: 0.78,
    material: { type: "brushedMetal", strength: 0.7, scale: 0.85 } },
  { id: "platinum", tier: "metallic", name: "Platinum", hue: 205, sat: 14, bodyLight: 56, headLight: 90, price: 5000, sheen: 1,
    material: { type: "brushedMetal", strength: 0.3, scale: 0.6 } },

  // the elements — each its own price and its own depth, deepening as the
  // element gets more dramatic to look at rather than climbing a flat ladder
  { id: "water", tier: "element", name: "Water", hue: 195, sat: 70, bodyLight: 30, headLight: 52, price: 3000,
    minLevel: 4, fx: "ripple", material: { type: "water", strength: 0.6, scale: 1 } },
  { id: "air", tier: "element", name: "Air", hue: 200, sat: 20, bodyLight: 62, headLight: 86, price: 4000,
    minLevel: 5, fx: "vortex", material: { type: "air", strength: 0.4, scale: 1 } },
  { id: "earth", tier: "element", name: "Earth", hue: 28, sat: 35, bodyLight: 22, headLight: 34, price: 5000,
    minLevel: 6, fx: "cracks", material: { type: "stone", strength: 0.6, scale: 1 } },
  // charcoal exterior, not a red eel with orange lines — the heat is what
  // charred's under-glow and fxEmber add on top, not the base colour
  { id: "fire", tier: "element", name: "Fire", hue: 8, sat: 30, bodyLight: 9, headLight: 15, price: 6000,
    minLevel: 7, fx: "ember", material: { type: "charred", strength: 0.65, scale: 1 } },
  // dark navy/electric-blue base, not the bright cyan it was — the point is
  // that charged's veins and fxArc's strobing arcs are the electric part,
  // showing through a genuinely dark body rather than the whole eel already
  // reading as "electric" before either finish fires
  { id: "lightning", tier: "element", name: "Lightning", hue: 220, sat: 75, bodyLight: 14, headLight: 26, price: 7500,
    minLevel: 8, fx: "arc", material: { type: "charged", strength: 0.6, scale: 1 } },

  // the gems — all one price, all shimmering
  // material's facets and gem's own travelling twinkle are orthogonal, not
  // duplicate effects — facets are the fixed geometry, gem is what moves
  // over them. Diamond is tuned to the highest strength/scale of the three
  // (most facets, most visible dispersion glint), reading as the most
  // crystalline — the issue's own ask for it specifically.
  { id: "emerald", tier: "gemstone",  name: "Emerald",  hue: 150, sat: 85, bodyLight: 34, headLight: 60, price: 7500, gem: true,
    material: { type: "crystal", strength: 0.5, scale: 1.0 } },
  { id: "ruby", tier: "gemstone",     name: "Ruby",     hue: 350, sat: 82, bodyLight: 36, headLight: 60, price: 7500, gem: true,
    material: { type: "crystal", strength: 0.55, scale: 1.0 } },
  { id: "diamond", tier: "gemstone",  name: "Diamond",  hue: 190, sat: 45, bodyLight: 58, headLight: 82, price: 7500, gem: true,
    material: { type: "crystal", strength: 0.8, scale: 1.4 } },

  // the special finishes — the four here are each a variant of an Elements
  // effect (biolume from Water's dots, toxic from its bubble trail, frost
  // from the gems' twinkle, lava from Earth's cracks), priced and gated the
  // same theme-first way the Elements are
  { id: "biolume", tier: "special", name: "Bioluminescent", hue: 178, sat: 75, bodyLight: 10, headLight: 18, price: 6000,
    minLevel: 6, fx: "spots", material: "organic" },
  { id: "toxic", tier: "special", name: "Toxic", hue: 82, sat: 70, bodyLight: 26, headLight: 40, price: 7000,
    minLevel: 7, fx: "slime", material: "organic" },
  { id: "frost", tier: "special", name: "Frost", hue: 198, sat: 40, bodyLight: 62, headLight: 90, price: 7500,
    minLevel: 8, fx: "sparkle", material: { type: "crystal", strength: 0.5, scale: 1.0 } },
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
    minLevel: 9, fx: "fade", material: { type: "organic", strength: 0.25, scale: 1 } },
  { id: "lava", tier: "special", name: "Lava", hue: 14, sat: 60, bodyLight: 10, headLight: 16, price: 9000,
    minLevel: 9, fx: "molten", material: { type: "charred", strength: 0.65, scale: 1 } },
  { id: "ghost", tier: "special", name: "Ghost", hue: 195, sat: 12, bodyLight: 72, headLight: 94, price: 10000,
    minLevel: 10, fx: "afterimage", material: { type: "air", strength: 0.4, scale: 1 } },
  { id: "prism", tier: "special", name: "Prism", hue: 0, sat: 70, bodyLight: 55, headLight: 80, price: 12500,
    minLevel: 10, fx: "iridescent", material: { type: "crystal", strength: 0.3, scale: 1.0 } },
  { id: "void", tier: "special", name: "Void", hue: 260, sat: 25, bodyLight: 4, headLight: 9, price: 12500,
    minLevel: 12, fx: "stars", material: { type: "organic", strength: 0.25, scale: 1 } },

  // two-tone heroes — the top of the shop. Each opens at its own depth now
  // (see `minLevel` below `levelFor`) rather than sharing the hero tier's
  // one Level 15 gate, so reaching the top of the shop is a ladder, not a
  // single distant step.
  { id: "spider", tier: "hero",   name: "Spider",   hue: 352, sat: 84, bodyLight: 41, headLight: 49, price: 10000,
    minLevel: 9, accent: { hue: 222, sat: 80, light: 31 }, accentRatio: 0.3, mark: "web",
    material: { type: "organic", strength: 0.3, scale: 1 } },
  { id: "eelwolf", tier: "hero",  name: "Eel-wolf", hue: 47,  sat: 94, bodyLight: 48, headLight: 62, price: 10000,
    minLevel: 10, accent: { hue: 226, sat: 72, light: 20 }, accentRatio: 0.42, mark: "ears",
    material: { type: "organic", strength: 0.35, scale: 1.1 } },
  // no banding: its white is the spider, the grin and the stare, and a banded
  // ring would only compete with them. Barely any saturation either — the body
  // taper adds up to 18% lightness towards the head, so a saturated hue turns
  // visibly purple there instead of staying tar-black. A little sheen gives it
  // the wet gloss tar has; the liquid material (the one hero not tuned from
  // organic — see matLiquid in the shell) rides on top of that same gloss
  // with its own slow, restrained travelling highlight.
  { id: "symbiote", tier: "hero", name: "Eel-symbiote", hue: 250, sat: 9, bodyLight: 5, headLight: 8, price: 10000,
    minLevel: 11, sheen: 0.3, mark: ["emblem", "stare"],
    material: { type: "liquid", strength: 0.5, scale: 1 } },
  { id: "eelpool", tier: "hero",  name: "Eel-pool", hue: 354, sat: 82, bodyLight: 38, headLight: 46, price: 10000,
    minLevel: 8, accent: { hue: 0,   sat: 0,  light: 9 },  accentRatio: 0.3, mark: ["patch", "swords"],
    material: { type: "organic", strength: 0.6, scale: 1 } },

  // Legends — the top of the shop, above Heroes. Each has its own bespoke
  // material rather than a tuned organic, so the collection reads as a
  // deliberately different tier rather than four more colours. See the
  // `material:` doc paragraph above for the full catalogue; the four here
  // introduce chitin, scarred and worn, and reuse liquid (Eel-symbiote's own
  // material) rather than forking it — Voidbond's extra "living surface"
  // detail lives entirely in its fx, not in the material itself.
  //
  // A deep crimson/burgundy over charcoal, muted copper plating and silk —
  // deliberately not a bright-red-and-blue palette. hue/sat/bodyLight sit
  // darker and less saturated than Eel-pool's brighter red so the two never
  // read as the same colour with different marks.
  { id: "orbweaver", tier: "legend", name: "Orbweaver", hue: 350, sat: 58, bodyLight: 20, headLight: 28,
    price: 12500, minLevel: 10, material: { type: "chitin", strength: 0.5, scale: 1 },
    fx: "silk", mark: ["orbweave", "manyeyes"] },

  // Burnt amber/ochre over graphite/near-black — deliberately not a
  // yellow-and-blue palette. No accent: the small steel slash marks come
  // from the scarred material itself, not a second banded colour.
  { id: "razorback", tier: "legend", name: "Razorback", hue: 34, sat: 52, bodyLight: 22, headLight: 32,
    price: 13500, minLevel: 11, material: { type: "scarred", strength: 0.55, scale: 1 },
    fx: "feral", mark: ["finridge"] },

  // Rust red over dark charcoal/worn black, small off-white and muted-metal
  // details — deliberately not a clean symmetrical red/black costume. No
  // fx: this one is all material and marks, matching the issue's own
  // illustrative schema for it.
  { id: "redrogue", tier: "legend", name: "Red Rogue", hue: 12, sat: 48, bodyLight: 19, headLight: 27,
    price: 14000, minLevel: 12, material: { type: "worn", strength: 0.5, scale: 1 },
    mark: ["worneye", "gear"] },

  // Near-black deep indigo — reads as plain black at rest and only reveals
  // its colour when highlights move over it, which is the whole point of
  // reusing the liquid material (Eel-symbiote's own) at a higher
  // strength/scale rather than forking a new one: the "living surface"
  // detail (veins, iridescent channels, the rare tendril) all lives in the
  // tendril fx instead, so this material change can never regress
  // Eel-symbiote's already-shipped look.
  { id: "voidbond", tier: "legend", name: "Voidbond", hue: 255, sat: 40, bodyLight: 5, headLight: 11,
    price: 15000, minLevel: 13, material: { type: "liquid", strength: 0.85, scale: 1.4 },
    fx: "tendril", mark: ["sensory"] },
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
  { id: "legend",   label: "Legends",  minLevel: 10 },
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
  return { id: "rival", name: "Rival", hue, sat: 70, bodyLight: 38, headLight: 58, price: 0,
    material: "organic" };
}

/**
 * Canonical default parameters for each material, keyed by the same string
 * `skin.material`/its `type` field uses. Grows as later PRs add materials.
 * `strength` and `scale` are 0..1 richness/size knobs a skin's own object
 * form can override — see resolveMaterial.
 */
export const MATERIALS = {
  organic: { strength: 0.5, scale: 1 },
  brushedMetal: { strength: 0.5, scale: 1 },
  stone: { strength: 0.5, scale: 1 },
  charred: { strength: 0.5, scale: 1 },
  crystal: { strength: 0.5, scale: 1 },
  water: { strength: 0.5, scale: 1 },
  air: { strength: 0.5, scale: 1 },
  charged: { strength: 0.5, scale: 1 },
  liquid: { strength: 0.5, scale: 1 },
  chitin: { strength: 0.5, scale: 1 },
  scarred: { strength: 0.5, scale: 1 },
  worn: { strength: 0.5, scale: 1 },
};

const DEFAULT_MATERIAL = Object.freeze({ type: "organic", ...MATERIALS.organic });

/**
 * Normalise whatever a skin names as its material into `{type, strength,
 * scale}` the renderer can rely on unconditionally. `skin.material` may be
 * absent, a bare string ("stone"), or an object ({type, strength, scale}) —
 * all three are legal input shapes. Anything unrecognisable (a typo, a
 * future skin whose material hasn't shipped yet, garbage from a corrupted
 * save) falls back to the shared frozen `organic` default rather than
 * throwing or drawing nothing — the same "fail safely" rule fx and mark
 * already follow.
 */
export function resolveMaterial(skin) {
  const m = skin?.material;
  if (m == null) return DEFAULT_MATERIAL;
  if (typeof m === "string") {
    return MATERIALS[m] ? { type: m, ...MATERIALS[m] } : DEFAULT_MATERIAL;
  }
  if (typeof m === "object") {
    const base = MATERIALS[m.type];
    if (!base) return DEFAULT_MATERIAL;
    return { type: m.type, strength: m.strength ?? base.strength, scale: m.scale ?? base.scale };
  }
  return DEFAULT_MATERIAL;
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
