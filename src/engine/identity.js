// Anonymous player identity.
//
// A player is a random UUID the shell generates once and keeps in localStorage.
// Nothing about the device, browser or person feeds into it: fingerprinting is
// tracking however friendly the name that comes out, it breaks whenever a
// browser updates, and it collides across identical tablets in a school or a
// family. A random id is both more private and more reliable.
//
// The display tag is a pure function of that id, which matters twice over: the
// same player always sees the same name, and the leaderboard server derives the
// tag from the id itself rather than trusting whatever a client sends. That is
// what keeps free text — real names, rude words — off a board kids read.

const ADJECTIVES = [
  "Amber", "Azure", "Bold", "Brave", "Bright", "Calm", "Cobalt", "Coral",
  "Crimson", "Curious", "Dappled", "Dazzling", "Deep", "Drifting", "Electric",
  "Emerald", "Fearless", "Flashing", "Fleet", "Frosted", "Gentle", "Gilded",
  "Glowing", "Golden", "Hidden", "Humming", "Indigo", "Jade", "Keen", "Lively",
  "Lucky", "Lunar", "Midnight", "Mighty", "Misty", "Nimble", "Noble", "Onyx",
  "Opal", "Quick", "Quiet", "Radiant", "Rapid", "Restless", "Rippling",
  "Roaming", "Ruby", "Sapphire", "Scarlet", "Shimmering", "Silver", "Sleek",
  "Solar", "Speedy", "Spiral", "Steady", "Stormy", "Sunlit", "Swift", "Teal",
  "Tidal", "Twilight", "Velvet", "Wandering",
];

const NOUNS = [
  "Anchor", "Angler", "Barnacle", "Beacon", "Bubble", "Cavern", "Crest",
  "Current", "Cuttlefish", "Diver", "Dolphin", "Drifter", "Eel", "Fathom",
  "Fin", "Glider", "Grotto", "Gulper", "Harbour", "Jelly", "Kelp", "Krill",
  "Lagoon", "Lantern", "Marlin", "Minnow", "Nautilus", "Nomad", "Otter",
  "Pearl", "Pilot", "Plankton", "Prowler", "Reef", "Ripple", "Sailfin",
  "Sandbar", "Seahorse", "Shoal", "Shrimp", "Siren", "Skimmer", "Sparker",
  "Spire", "Squid", "Starfish", "Stingray", "Surge", "Swimmer", "Tempest",
  "Tentacle", "Tide", "Trench", "Trout", "Turtle", "Urchin", "Vortex",
  "Voyager", "Wanderer", "Whirlpool", "Wrasse", "Zapper",
];

// FNV-1a, 32-bit. Small, fast and deterministic — not a security hash, and it
// does not need to be: the id is the secret, the tag is only a label.
function hash32(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Display name for a player id, e.g. "AmberLantern-4721".
 * Deterministic: same id in, same tag out, forever.
 */
export function tagFor(id) {
  const s = String(id);
  const adjective = ADJECTIVES[hash32("adjective:" + s) % ADJECTIVES.length];
  const noun = NOUNS[hash32("noun:" + s) % NOUNS.length];
  const number = String(hash32("number:" + s) % 10000).padStart(4, "0");
  return `${adjective}${noun}-${number}`;
}

/**
 * The same name without its number — "AmberLantern" rather than
 * "AmberLantern-4721".
 *
 * For labels floating over a swimming eel, where the four digits are noise
 * that costs a third of the width and nobody reads at speed. The leaderboard
 * still uses the full tag: there the number is what keeps two AmberLanterns
 * apart, and on a board that matters.
 */
export function shortTagFor(id) {
  return tagFor(id).replace(/-\d+$/, "");
}

/**
 * A short tag for a rival eel that is guaranteed not to be the player's own.
 *
 * There are only 64 adjectives x 63 nouns = 4,032 short tags, and the sea keeps
 * fourteen rivals topped up for the whole dive, so a rival wearing the player's
 * own name is not a freak event — it is a birthday-paradox certainty over a
 * long session, and it happened in the first week of play. Seeing "yourself"
 * swim past breaks the illusion these names exist to create.
 *
 * @param {() => number} rng      injected; the shell passes Math.random
 * @param {string} excludedTag    the player's own short tag
 */
export function rivalTag(rng, excludedTag) {
  // Bounded: the caller is an unconditional respawn loop, so this must always
  // terminate even if the name pool were somehow exhausted. Ten tries makes a
  // repeat collision vanishingly unlikely; the fallback is a suffixed name,
  // which is still never equal to the excluded tag.
  for (let i = 0; i < 10; i++) {
    const tag = shortTagFor(String(rng()));
    if (tag !== excludedTag) return tag;
  }
  return `${excludedTag}II`;
}

/** Shape check for a tag this code produced. */
export function isWellFormedTag(tag) {
  return typeof tag === "string" && /^[A-Z][a-z]+[A-Z][a-z]+-\d{4}$/.test(tag);
}

/** How many distinct tags exist — useful for reasoning about collisions. */
export function tagSpaceSize() {
  return ADJECTIVES.length * NOUNS.length * 10000;
}
