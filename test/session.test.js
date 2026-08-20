import { describe, it, expect } from "vitest";
import { nextPhase, canDo, isRunning, PHASES } from "../src/engine/session.js";

describe("phases", () => {
  it("starts a run from the home screen", () => {
    expect(nextPhase("home", "dive")).toBe("playing");
  });

  it("pauses and resumes a run", () => {
    expect(nextPhase("playing", "pause")).toBe("paused");
    expect(nextPhase("paused", "resume")).toBe("playing");
  });

  it("sends a dead player to the game over screen, then home", () => {
    expect(nextPhase("playing", "die")).toBe("over");
    expect(nextPhase("over", "surface")).toBe("home");
  });

  it("never dives straight back in from the game over screen", () => {
    expect(nextPhase("over", "dive")).toBe("over");
  });

  it("lets a paused player give up and go home", () => {
    expect(nextPhase("paused", "surface")).toBe("home");
  });

  it("cannot resume a run that ended", () => {
    expect(nextPhase("over", "resume")).toBe("over");
  });

  it("cannot pause what is not running", () => {
    for (const phase of ["home", "over", "paused"]) {
      expect(nextPhase(phase, "pause")).toBe(phase);
    }
  });

  it("cannot die on a screen", () => {
    for (const phase of ["home", "paused", "over"]) {
      expect(nextPhase(phase, "die")).toBe(phase);
    }
  });

  it("ignores events it does not know", () => {
    expect(nextPhase("playing", "wibble")).toBe("playing");
  });

  it("opens and closes the skin shop from home", () => {
    expect(nextPhase("home", "openSkins")).toBe("skins");
    expect(nextPhase("skins", "closeSkins")).toBe("home");
  });

  it("cannot open the skin shop except from home", () => {
    for (const phase of ["playing", "paused", "over"]) {
      expect(nextPhase(phase, "openSkins")).toBe(phase);
    }
  });

  it("opens and closes the instructions from home", () => {
    expect(nextPhase("home", "openHow")).toBe("howto");
    expect(nextPhase("howto", "closeHow")).toBe("home");
  });

  it("cannot open the instructions except from home", () => {
    for (const phase of ["playing", "paused", "over", "skins"]) {
      expect(nextPhase(phase, "openHow")).toBe(phase);
    }
  });

  it("keeps the two home screens apart", () => {
    // neither side door leads to the other, only back to home
    expect(nextPhase("skins", "openHow")).toBe("skins");
    expect(nextPhase("howto", "openSkins")).toBe("howto");
  });

  it("only ever lands on a known phase", () => {
    for (const phase of PHASES) {
      for (const event of ["dive", "pause", "resume", "die", "surface",
                           "openSkins", "closeSkins", "openHow", "closeHow"]) {
        expect(PHASES).toContain(nextPhase(phase, event));
      }
    }
  });
});

describe("canDo", () => {
  it("reports whether an event applies here", () => {
    expect(canDo("playing", "pause")).toBe(true);
    expect(canDo("home", "pause")).toBe(false);
  });

  it("cannot dive from the skin shop", () => {
    expect(canDo("skins", "dive")).toBe(false);
  });
});

describe("isRunning", () => {
  it("advances the world only while playing", () => {
    expect(isRunning("playing")).toBe(true);
    for (const phase of ["home", "paused", "over", "skins", "howto"]) expect(isRunning(phase)).toBe(false);
  });
});
