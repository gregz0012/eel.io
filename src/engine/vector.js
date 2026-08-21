// Pure 2D point math for anything the shell needs a bearing or a distance
// for. No DOM, no random, no clock — same rule as the rest of engine/.
//
// This is deliberately the first slice of the vector.js extraction CLAUDE.md
// §9 already names as the step after scoring — just the one function a new
// feature (the boss sonar, #45) needs. The shell's own inline dist2/angLerp/
// clamp helpers stay put; migrating those is a separate, larger slice.

/** The angle from one point to another, in radians (Math.atan2 convention). */
export function angleTo(fromX, fromY, toX, toY) {
  return Math.atan2(toY - fromY, toX - fromX);
}

/** Straight-line distance between two points. */
export function distanceTo(fromX, fromY, toX, toY) {
  return Math.hypot(toX - fromX, toY - fromY);
}
