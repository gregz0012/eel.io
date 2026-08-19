import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { nextPhase, isRunning, canDo } from "../../src/engine/session.js";
import { unlockedSkins, wearableSkin, isSkinUnlocked, skinById } from "../../src/engine/skins.js";

// Stands in for the shell: it holds the phase and the lifetime total, and
// applies what the engine returns.
Given("a player on the home screen", function () {
  this.phase = "home";
});

Given("a player who has never scored", function () {
  this.lifetime = 0;
  this.wearing = "volt";
});

When("they dive", function () { this.phase = nextPhase(this.phase, "dive"); });
When("they pause", function () { this.phase = nextPhase(this.phase, "pause"); });
When("they resume", function () { this.phase = nextPhase(this.phase, "resume"); });
When("they are eaten", function () { this.phase = nextPhase(this.phase, "die"); });
When("they head for the surface", function () { this.phase = nextPhase(this.phase, "surface"); });

When("they score {int} points across a run", function (score) {
  this.lifetime += score;                       // lifetime points only ever go up
});

When("they try to wear the {word} skin", function (id) {
  this.wearing = wearableSkin(id, this.lifetime).id;
});

Then("the world is frozen", function () { assert.equal(isRunning(this.phase), false); });
Then("the world is running again", function () { assert.equal(isRunning(this.phase), true); });
Then("they are on the game over screen", function () { assert.equal(this.phase, "over"); });
Then("they are on the home screen", function () { assert.equal(this.phase, "home"); });

Then("diving again is not offered from there", function () {
  assert.equal(canDo(this.phase, "dive"), false);
});

Then("they can wear {int} skins", function (n) {
  assert.equal(unlockedSkins(this.lifetime).length, n);
});

Then("they cannot wear the {word} skin", function (id) {
  assert.equal(isSkinUnlocked(skinById(id), this.lifetime), false);
});

Then("they have unlocked the {word} skin", function (id) {
  assert.equal(isSkinUnlocked(skinById(id), this.lifetime), true);
});

Then("they are wearing the {word} skin", function (id) {
  assert.equal(this.wearing, id);
});
