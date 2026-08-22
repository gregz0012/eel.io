import { describe, expect, it } from "vitest";
import { CONFIG } from "../src/engine/config.js";
import { applySprint } from "../src/engine/movement.js";

function sprintFor(length, seconds, fps) {
  let state = { length, boosting: false };
  for (let frame = 0; frame < seconds * fps; frame++) {
    state = applySprint(state.length, 1 / fps, true);
  }
  return state;
}

describe("sprint length cost", () => {
  it("costs the same amount at 60 Hz and 120 Hz", () => {
    const at60 = sprintFor(30, 5, 60);
    const at120 = sprintFor(30, 5, 120);

    expect(at60.length).toBeCloseTo(27, 8);
    expect(at120.length).toBeCloseTo(at60.length, 8);
  });

  it("does not consume length when sprint was not requested", () => {
    expect(applySprint(30, 1, false)).toEqual({ length: 30, boosting: false });
  });

  it("stops cleanly at the minimum sprint length", () => {
    expect(applySprint(CONFIG.sprint.minLength + 0.1, 1, true)).toEqual({
      length: CONFIG.sprint.minLength,
      boosting: true,
    });
    expect(applySprint(CONFIG.sprint.minLength, 1, true)).toEqual({
      length: CONFIG.sprint.minLength,
      boosting: false,
    });
  });

  it("ignores invalid or negative time deltas", () => {
    expect(applySprint(30, -1, true).length).toBe(30);
    expect(applySprint(30, Number.NaN, true).length).toBe(30);
  });
});
