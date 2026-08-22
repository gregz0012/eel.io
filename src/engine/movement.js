import { CONFIG } from "./config.js";
/**
 * Apply one deterministic slice of sprint cost.
 *
 * Touch and mouse both become the same boolean request before they reach this
 * rule. Returning whether sprint actually engaged keeps the speed
 * multiplier and the cost on one decision, while `dt` makes the result
 * independent of display refresh rate.
 */
export function applySprint(length, dt, requested) {
  const boosting = Boolean(requested) && length > CONFIG.sprint.minLength;
  if (!boosting) return { length, boosting: false };
  const elapsed = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  return {
    length: Math.max(
      CONFIG.sprint.minLength,
      length - CONFIG.sprint.lengthPerSecond * elapsed,
    ),
    boosting: true,
  };
}
