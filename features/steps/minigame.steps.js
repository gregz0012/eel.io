import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { addPlayTime, miniGameDue, recordMiniGameReward } from "../../src/engine/progress.js";
import { deposit } from "../../src/engine/bank.js";
import { CONFIG } from "../../src/engine/config.js";
import { pickDeed, pickScenario, choiceOutcome } from "../../src/engine/minigames.js";

// These steps drive the real engine, never a mock of it. They stand in for
// the shell: die() is what calls addPlayTime, and "finish the mini-game" is
// what the shell does when a player completes one and presses through.

Given("a new player", function () {
  this.progress = { playedMs: 0, lastRewardAtMs: 0 };
  this.banked = 0;
  this.offered = false;
});

When("they play for {int} minutes and die", function (minutes) {
  this.progress = addPlayTime(this.progress, minutes * 60 * 1000);
  this.offered = miniGameDue(this.progress);
});

When("they play for {int} more minute and die", function (minutes) {
  this.progress = addPlayTime(this.progress, minutes * 60 * 1000);
  this.offered = miniGameDue(this.progress);
});
When("they play for {int} more minutes and die", function (minutes) {
  this.progress = addPlayTime(this.progress, minutes * 60 * 1000);
  this.offered = miniGameDue(this.progress);
});

When("they finish the offered mini-game", function () {
  assert.equal(this.offered, true, "no mini-game was actually offered");
  this.banked = deposit(this.banked, CONFIG.miniGames.reward);
  this.progress = recordMiniGameReward(this.progress);
});

When("they skip the offered mini-game", function () {
  assert.equal(this.offered, true, "no mini-game was actually offered");
  // skipping banks nothing and does not touch the timer
});

Then("no mini-game is offered", function () {
  assert.equal(this.offered, false);
});

Then("a mini-game is offered", function () {
  assert.equal(this.offered, true);
});

Then("a mini-game is still offered", function () {
  assert.equal(this.offered, true);
});

Then("their play bank holds {int} points", function (points) {
  assert.equal(this.banked, points);
});

Then("finishing it only banks {int} points, not {int}", function (once, twice) {
  this.banked = deposit(this.banked, CONFIG.miniGames.reward);
  this.progress = recordMiniGameReward(this.progress);
  assert.equal(this.banked, once);
  assert.notEqual(this.banked, twice);
});

When("they ask for a different good deed", function () {
  assert.equal(this.offered, true, "no mini-game was actually offered");
  const first = pickDeed(() => 0, null);
  this.deed = pickDeed(() => 0.9, first.id);
  // rerolling banks nothing and does not touch the timer or end the offer
});

Then("a good deed is still on offer", function () {
  assert.equal(this.offered, true);
});

When("they say they did it", function () {
  this.banked = deposit(this.banked, CONFIG.miniGames.reward);
  this.progress = recordMiniGameReward(this.progress);
});

When("they pick the unkind answer", function () {
  assert.equal(this.offered, true, "no mini-game was actually offered");
  this.scenario = pickScenario(() => 0);
  const unkindIndex = this.scenario.options.findIndex(o => !o.kind);
  this.outcome = choiceOutcome(this.scenario, unkindIndex);
});

Then("they are gently asked to try again", function () {
  assert.equal(this.outcome.kind, false);
  assert.equal(this.outcome.complete, false);
  assert.equal(this.outcome.message, CONFIG.miniGames.choices.nudge);
});

When("they pick the kind answer", function () {
  const kindIndex = this.scenario.options.findIndex(o => o.kind);
  this.outcome = choiceOutcome(this.scenario, kindIndex);
  if (this.outcome.complete) {
    this.banked = deposit(this.banked, CONFIG.miniGames.reward);
    this.progress = recordMiniGameReward(this.progress);
  }
});
