import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import {
  addScore, completeLevel, predatorTarget, isBossLevel, bossHits,
} from "../../src/engine/scoring.js";

// These steps drive the real engine, never a mock of it. They stand in for the
// shell: the engine reports the levels crossed, and this applies their effects,
// exactly as src/index.html does. Both routes up — points and a dead boss —
// come back in the same shape, so both go through the same function here.
function applyLevels(world, next) {
  for (const L of next.levelsGained) {
    world.predators = predatorTarget(L);
    world.bossGuarding = isBossLevel(L);   // the next level arms its own boss
  }
  world.score = next.score;
  world.level = next.level;
}

Given("a new game", function () {
  this.world = {
    score: 0, level: 1, predators: predatorTarget(1), bossGuarding: isBossLevel(1),
  };
});

When("the player scores {int} points", function (n) {
  applyLevels(this.world, addScore(this.world, n));
});

When("the player loses {int} points", function (n) {
  applyLevels(this.world, addScore(this.world, -n));
});

When("the player kills the boss", function () {
  assert.equal(this.world.bossGuarding, true, "there was no boss to kill");
  applyLevels(this.world, completeLevel(this.world));
});

Then("the player is on level {int}", function (level) {
  assert.equal(this.world.level, level);
});

Then("the score is {int}", function (score) {
  assert.equal(this.world.score, score);
});

Then("{int} predators are hunting", function (n) {
  assert.equal(this.world.predators, n);
});

Then("a boss is guarding the way", function () {
  assert.equal(this.world.bossGuarding, true);
});

Then("no boss is guarding the way", function () {
  assert.equal(this.world.bossGuarding, false);
});

Then("the boss guarding level {int} takes {int} hits", function (level, hits) {
  assert.equal(bossHits(level), hits);
});
