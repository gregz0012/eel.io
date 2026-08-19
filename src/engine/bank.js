import { CONFIG } from "./config.js";

// The bank: what a player has earned and not yet spent.
//
// Every dive's score is banked when it ends, and skins are bought out of the
// balance. Diving costs points too — but a player who cannot afford the fee
// dives free rather than being locked out of their own game. A child who has a
// bad run and drains to nothing must still be able to press the button;
// anything else is a dead end they cannot get out of.

/** Add a run's score to the balance. Scores are never negative here. */
export function deposit(banked, points) {
  return Math.max(0, banked ?? 0) + Math.max(0, Math.round(points ?? 0));
}

export const diveCost = () => CONFIG.bank.diveCost;

/**
 * Charge for a dive.
 * @returns {{banked:number, paid:number, free:boolean}} `free` when the player
 *          could not cover the fee and dived on the house.
 */
export function payForDive(banked) {
  const balance = Math.max(0, banked ?? 0);
  const cost = Math.min(CONFIG.bank.diveCost, balance);
  return { banked: balance - cost, paid: cost, free: cost < CONFIG.bank.diveCost };
}

/** Can this dive be paid for in full? */
export function canAffordDive(banked) {
  return Math.max(0, banked ?? 0) >= CONFIG.bank.diveCost;
}
