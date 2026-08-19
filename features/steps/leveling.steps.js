import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { addScore, predatorTarget, isBossLevel } from "../../src/engine/scoring.js";

// These steps drive the real engine, never a mock of it. They stand in for the
// shell: the engine reports the levels crossed, and this applies their effects,
// exactly as src/index.html does.
function apply(world, n) {
  const next = addScore(world, n);
  for (const L of next.levelsGained) {
    world.predators = predatorTarget(L);
    if (isBossLevel(L)) world.bossUnleashed = true;
  }
  world.score = next.score;
  world.level = next.level;
}

Given("a new game", function () {
  this.world = { score: 0, level: 1, predators: predatorTarget(1), bossUnleashed: false };
});

When("the player scores {int} points", function (n) {
  apply(this.world, n);
});

When("the player loses {int} points", function (n) {
  apply(this.world, -n);
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

Then("a boss has been unleashed", function () {
  assert.equal(this.world.bossUnleashed, true);
});

Then("no boss has been unleashed", function () {
  assert.equal(this.world.bossUnleashed, false);
});
