import { CONFIG } from "./config.js";
import { randInt, weightedPick } from "./rng.js";

// What is inside a present.
//
// Pure: the roll takes an injected rng, so a test can seed it and get the same
// present every time. The engine says what the present *is*; the shell is what
// grants a shield, spawns a predator or shakes the screen.

/** Every kind a present can hold, for the shell to switch on exhaustively. */
export const PRESENT_KINDS = CONFIG.presents.effects.map(e => e.kind);

/**
 * Open a present.
 * @param {() => number} rng
 * @returns {{kind:string, amount:number}} amount is 0 for effects that carry none
 */
export function rollPresent(rng) {
  const entry = weightedPick(rng, CONFIG.presents.effects);
  const amount = entry.min == null ? 0 : randInt(rng, entry.min, entry.max);
  return { kind: entry.kind, amount };
}

/** Is this present one the player will be glad they opened? */
export function isKindGift(kind) {
  return kind === "points" || kind === "starfish" || kind === "zap";
}
