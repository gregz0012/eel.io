import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { tagFor } from "../../src/engine/identity.js";
import { validateSubmission, bestOf, topRows } from "../../src/engine/leaderboard.js";

// Stands in for the leaderboard server: the same pure rules, applied the same
// way the Worker applies them.
function submit(board, id, score, durationMs) {
  const verdict = validateSubmission({ score, durationMs });
  if (!verdict.ok) return { accepted: false, reason: verdict.reason };
  const row = board.find(r => r.id === id);
  if (row) row.score = bestOf(row.score, score);
  else board.push({ id, score });
  return { accepted: true };
}

const A_REAL_RUN_MS = 120000;

Given("a player whose browser generated the id {string}", function (id) {
  this.board = this.board ?? [];
  this.id = id;
  this.name = tagFor(id);
});

Given("another player with the id {string}", function (id) {
  this.otherName = tagFor(id);
});

When("they come back another day with the same id", function () {
  this.nameToday = tagFor(this.id);
});

When("they finish a run worth {int} points", function (score) {
  this.result = submit(this.board, this.id, score, A_REAL_RUN_MS);
});

When("they submit a run worth {int} points", function (score) {
  this.result = submit(this.board, this.id, score, A_REAL_RUN_MS);
});

When("they submit {int} points earned in {int} seconds", function (score, seconds) {
  this.result = submit(this.board, this.id, score, seconds * 1000);
});

Then("they are shown the same name as before", function () {
  assert.equal(this.nameToday, this.name);
});

Then("the two players have different names", function () {
  assert.notEqual(this.otherName, this.name);
});

Then("the board shows them with {int} points", function (score) {
  const row = topRows(this.board.map(r => ({ tag: tagFor(r.id), score })))
    .find(r => r.tag === this.name);
  assert.ok(row, "expected the player on the board");
  assert.equal(row.score, score);
});

Then("the run is refused", function () {
  assert.equal(this.result.accepted, false);
});

Then("the board does not show them", function () {
  assert.equal(this.board.some(r => r.id === this.id), false);
});
