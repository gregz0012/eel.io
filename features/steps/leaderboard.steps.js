import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { tagFor } from "../../src/engine/identity.js";
import { validateSubmission, bestOf, topRows } from "../../src/engine/leaderboard.js";

// Stands in for the leaderboard server: the same pure rules, applied the same
// way the Worker applies them. Score and level are each kept at their own
// best, independently — see worker/index.js's handleSubmit.
function submit(board, id, score, durationMs, level = 1) {
  const verdict = validateSubmission({ score, durationMs, level });
  if (!verdict.ok) return { accepted: false, reason: verdict.reason };
  const row = board.find(r => r.id === id);
  if (row) { row.score = bestOf(row.score, score); row.level = bestOf(row.level, level); }
  else board.push({ id, score, level });
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

When("they finish a run worth {int} points and level {int}", function (score, level) {
  this.result = submit(this.board, this.id, score, A_REAL_RUN_MS, level);
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

// Maps the board's *actual* stored score/level for each row — not the
// asserted value — so this genuinely checks what bestOf() kept, rather than
// trivially matching itself.
function boardRows(board, metric) {
  return topRows(board.map(r => ({ tag: tagFor(r.id), score: r.score, level: r.level })), undefined, metric);
}

Then("the board shows them with {int} points", function (score) {
  const row = boardRows(this.board, "score").find(r => r.tag === this.name);
  assert.ok(row, "expected the player on the board");
  assert.equal(row.score, score);
});

Then("the board shows them at level {int}", function (level) {
  const row = boardRows(this.board, "level").find(r => r.tag === this.name);
  assert.ok(row, "expected the player on the board");
  assert.equal(row.level, level);
});

Then("the run is refused", function () {
  assert.equal(this.result.accepted, false);
});

Then("the board does not show them", function () {
  assert.equal(this.board.some(r => r.id === this.id), false);
});
