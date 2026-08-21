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

  it("offers a calming mini-game from the game over screen, optionally", () => {
    expect(nextPhase("over", "playMiniGame")).toBe("minigame");
    expect(nextPhase("minigame", "finishMiniGame")).toBe("home");
  });

  it("can still surface straight past the mini-game offer", () => {
    expect(nextPhase("over", "surface")).toBe("home");
  });

  it("cannot offer a mini-game from anywhere but the game over screen", () => {
    for (const phase of ["home", "playing", "paused", "skins", "howto", "board", "minigame"]) {
      expect(nextPhase(phase, "playMiniGame")).toBe(phase);
    }
  });

  it("a mini-game in progress cannot be dived into or paused", () => {
    expect(nextPhase("minigame", "dive")).toBe("minigame");
    expect(nextPhase("minigame", "pause")).toBe("minigame");
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

  it("opens and closes the leaderboard from home", () => {
    expect(nextPhase("home", "openBoard")).toBe("board");
    expect(nextPhase("board", "closeBoard")).toBe("home");
  });

  it("cannot open the leaderboard except from home", () => {
    for (const phase of ["playing", "paused", "over", "skins", "howto"]) {
      expect(nextPhase(phase, "openBoard")).toBe(phase);
    }
  });

  it("opens and closes lifetime stats from home", () => {
    expect(nextPhase("home", "openStats")).toBe("stats");
    expect(nextPhase("stats", "closeStats")).toBe("home");
  });

  it("cannot open lifetime stats except from home", () => {
    for (const phase of ["playing", "paused", "over", "skins", "howto", "board"]) {
      expect(nextPhase(phase, "openStats")).toBe(phase);
    }
  });

  it("keeps the four home screens apart", () => {
    // no side door leads to another side door, only back to home
    expect(nextPhase("skins", "openHow")).toBe("skins");
    expect(nextPhase("skins", "openBoard")).toBe("skins");
    expect(nextPhase("skins", "openStats")).toBe("skins");
    expect(nextPhase("howto", "openSkins")).toBe("howto");
    expect(nextPhase("howto", "openBoard")).toBe("howto");
    expect(nextPhase("howto", "openStats")).toBe("howto");
    expect(nextPhase("board", "openSkins")).toBe("board");
    expect(nextPhase("board", "openHow")).toBe("board");
    expect(nextPhase("board", "openStats")).toBe("board");
    expect(nextPhase("stats", "openSkins")).toBe("stats");
    expect(nextPhase("stats", "openHow")).toBe("stats");
    expect(nextPhase("stats", "openBoard")).toBe("stats");
  });

  it("only ever lands on a known phase", () => {
    for (const phase of PHASES) {
      for (const event of ["dive", "pause", "resume", "die", "surface",
                           "openSkins", "closeSkins", "openHow", "closeHow",
                           "openBoard", "closeBoard", "openStats", "closeStats",
                           "playMiniGame", "finishMiniGame"]) {
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
    for (const phase of ["home", "paused", "over", "skins", "howto", "board", "stats", "minigame"]) expect(isRunning(phase)).toBe(false);
  });
});
