import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { nextPhase, isRunning, canDo } from "../../src/engine/session.js";
import { ownedSkins, wearableSkin, isOwned, buySkin } from "../../src/engine/skins.js";
import { deposit, payForDive } from "../../src/engine/bank.js";

// Stands in for the shell: it holds the phase and the lifetime total, and
// applies what the engine returns.
Given("a player on the home screen", function () {
  this.phase = "home";
});

Given("a player with an empty bank", function () {
  this.wallet = { banked: 0, owned: [] };
  this.wearing = "volt";
});

Given("a player with {int} points banked", function (points) {
  this.wallet = { banked: points, owned: [] };
  this.wearing = "volt";
});

When("they dive", function () { this.phase = nextPhase(this.phase, "dive"); });
When("they pause", function () { this.phase = nextPhase(this.phase, "pause"); });
When("they resume", function () { this.phase = nextPhase(this.phase, "resume"); });
When("they are eaten", function () { this.phase = nextPhase(this.phase, "die"); });
When("they head for the surface", function () { this.phase = nextPhase(this.phase, "surface"); });

When("they finish a dive worth {int} points", function (score) {
  this.wallet.banked = deposit(this.wallet.banked, score);
});

When("they buy the {word} skin", function (id) {
  const result = buySkin(this.wallet, id);
  this.wallet = { banked: result.banked, owned: result.owned };
});

When("they dive and pay for it", function () {
  const fare = payForDive(this.wallet.banked);
  this.wallet.banked = fare.banked;
  this.free = fare.free;
});

When("they dive and pay for it {int} times", function (n) {
  for (let i = 0; i < n; i++) {
    const fare = payForDive(this.wallet.banked);
    this.wallet.banked = fare.banked;
    this.free = fare.free;
  }
});

When("they try to wear the {word} skin", function (id) {
  this.wearing = wearableSkin(id, this.wallet.owned).id;
});

Then("the world is frozen", function () { assert.equal(isRunning(this.phase), false); });
Then("the world is running again", function () { assert.equal(isRunning(this.phase), true); });
Then("they are on the game over screen", function () { assert.equal(this.phase, "over"); });
Then("they are on the home screen", function () { assert.equal(this.phase, "home"); });

Then("diving again is not offered from there", function () {
  assert.equal(canDo(this.phase, "dive"), false);
});

Then("they own {int} skins", function (n) {
  assert.equal(ownedSkins(this.wallet.owned).length, n);
});

Then("they own the {word} skin", function (id) {
  assert.equal(isOwned(id, this.wallet.owned), true);
});

Then("they do not own the {word} skin", function (id) {
  assert.equal(isOwned(id, this.wallet.owned), false);
});

Then("their bank holds {int} points", function (points) {
  assert.equal(this.wallet.banked, points);
});

Then("the dive was free", function () {
  assert.equal(this.free, true);
});

Then("they are wearing the {word} skin", function (id) {
  assert.equal(this.wearing, id);
});
