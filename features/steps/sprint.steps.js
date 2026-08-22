import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { applySprint } from "../../src/engine/movement.js";

Given("an eel with length {int}", function (length) {
  this.sprintLength = length;
});

When("it sprints for {int} seconds at {int} frames per second", function (seconds, fps) {
  for (let frame = 0; frame < seconds * fps; frame++) {
    this.sprintLength = applySprint(this.sprintLength, 1 / fps, true).length;
  }
});

When(
  "it sprints for {int} seconds at {int} frames per second from length {int}",
  function (seconds, fps, length) {
    this.sprintLength = length;
    for (let frame = 0; frame < seconds * fps; frame++) {
      this.sprintLength = applySprint(this.sprintLength, 1 / fps, true).length;
    }
  },
);

Then("its length is {int}", function (length) {
  assert.ok(Math.abs(this.sprintLength - length) < 1e-8);
});
