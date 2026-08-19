import { describe, it, expect } from "vitest";
import { deposit, payForDive, canAffordDive, diveCost } from "../src/engine/bank.js";
import { CONFIG } from "../src/engine/config.js";

const COST = CONFIG.bank.diveCost;

describe("deposit", () => {
  it("banks a run's score", () => {
    expect(deposit(100, 250)).toBe(350);
  });

  it("rounds a fractional score", () => {
    expect(deposit(0, 12.6)).toBe(13);
  });

  it("treats an empty bank as zero", () => {
    expect(deposit(undefined, 40)).toBe(40);
  });

  it("never takes points away", () => {
    expect(deposit(100, -50)).toBe(100);
    expect(deposit(100, 0)).toBe(100);
  });
});

describe("payForDive", () => {
  it("charges the fee when the player can afford it", () => {
    const r = payForDive(500);
    expect(r).toEqual({ banked: 500 - COST, paid: COST, free: false });
  });

  it("charges exactly the balance when it is short, and dives free", () => {
    const r = payForDive(COST - 1);
    expect(r.banked).toBe(0);
    expect(r.paid).toBe(COST - 1);
    expect(r.free).toBe(true);
  });

  it("lets a broke player dive for nothing", () => {
    expect(payForDive(0)).toEqual({ banked: 0, paid: 0, free: true });
  });

  it("never leaves a negative balance, however often you dive", () => {
    let banked = 25;
    for (let i = 0; i < 50; i++) banked = payForDive(banked).banked;
    expect(banked).toBe(0);
  });

  it("is not blocked by an empty or missing bank", () => {
    expect(payForDive(undefined).free).toBe(true);
    expect(payForDive(-999).banked).toBe(0);
  });

  it("charges the fee named in config", () => {
    expect(diveCost()).toBe(COST);
  });
});

describe("canAffordDive", () => {
  it("reports whether the fee is covered", () => {
    expect(canAffordDive(COST)).toBe(true);
    expect(canAffordDive(COST - 1)).toBe(false);
    expect(canAffordDive(undefined)).toBe(false);
  });
});
