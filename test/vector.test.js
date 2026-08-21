import { describe, it, expect } from "vitest";
import { angleTo, distanceTo } from "../src/engine/vector.js";

describe("angleTo", () => {
  it("points due east as zero", () => {
    expect(angleTo(0, 0, 10, 0)).toBeCloseTo(0);
  });

  it("points south (canvas y grows downward) as +90 degrees", () => {
    expect(angleTo(0, 0, 0, 10)).toBeCloseTo(Math.PI / 2);
  });

  it("points west as 180 degrees", () => {
    expect(Math.abs(angleTo(0, 0, -10, 0))).toBeCloseTo(Math.PI);
  });

  it("does not care where the two points actually sit, only their offset", () => {
    expect(angleTo(0, 0, 10, 10)).toBeCloseTo(angleTo(100, 100, 110, 110));
  });

  it("is zero for coincident points rather than throwing or NaN", () => {
    expect(angleTo(5, 5, 5, 5)).toBe(0);
  });
});

describe("distanceTo", () => {
  it("is the straight-line distance", () => {
    expect(distanceTo(0, 0, 3, 4)).toBe(5);
  });

  it("is zero for coincident points", () => {
    expect(distanceTo(7, -2, 7, -2)).toBe(0);
  });

  it("is symmetric", () => {
    expect(distanceTo(1, 2, 9, -4)).toBe(distanceTo(9, -4, 1, 2));
  });
});
