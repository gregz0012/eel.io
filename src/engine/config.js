// Tunables for the pure game core. Balance changes happen here, never as magic
// numbers inside logic, so tests can pin them and playtesting can move them.
//
// Only the scoring/levelling slice has been migrated so far. Spawn counts and
// entity tunables still live in the shell and move here with their own slice.
export const CONFIG = {
  // scoring & levels
  //
  // Score gets a player as far as the first boss and no further: from
  // `boss.firstLevel` on, the only way up is killing the boss guarding the
  // level you are on. Points keep accruing — they are the bank and the
  // leaderboard — they just stop buying levels.
  pointsPerLevel: 120,      // score needed for the one level score can win
  scoreLevelCap: 2,         // the highest level score alone can reach

  // difficulty ramp
  predatorsBase: 3,         // predators in the sea at level 1
  levelsPerPredator: 2,     // +1 predator every N levels

  // The boss guarding each level. It takes as many hits as the level number,
  // so it is the pacing of the whole game: level 2 is two hits, level 15 is
  // fifteen. That only works because it is slow enough to swim away from —
  // a boss you cannot escape and cannot out-damage is just a wall.
  boss: {
    firstLevel: 2,          // levels below this are unguarded
    breatherMs: 6000,       // calm after a level-up before the next boss shows
    speedFactor: 0.72,      // slower than a predator: you can always disengage
  },

  // per-level speed reward, capped so the eel stays controllable
  levelSpeedPerLevel: 0.015,
  levelSpeedMax: 1.4,

  // growth: how long the player's eel can get. Uncapped growth eventually
  // turns the body-trail array into real per-frame cost (hundreds of segments
  // at 60fps) and makes the eel unwieldy to steer well before that — a cap
  // keeps both the frame budget and the controls sane.
  maxLen: 250,

  // presents: a wrapped box that could be anything. Weights are relative, so
  // adding an effect does not mean rebalancing every other number. Good
  // outcomes outweigh bad ones roughly 7 to 3 — a present should feel like a
  // treat you sometimes regret, not a coin flip.
  presents: {
    target: 3,              // how many drift in the sea at once
    spawnChance: 0.012,     // per frame, while below target
    effects: [
      { kind: "points",    weight: 30, min: 40, max: 260 },
      { kind: "starfish",  weight: 20 },
      { kind: "zap",       weight: 20 },
      // 15 each rather than 12: taking a level away used to carry the last 6
      // points of "bad", and its share moved here when it was retired, so the
      // 70/30 split above still holds.
      { kind: "pointsLost", weight: 15, min: 30, max: 150 },
      { kind: "predator",  weight: 15 },
    ],
  },

  // the bank: points earned in a dive are banked, and spent on skins
  bank: {
    diveCost: 10,   // charged per dive; a player who cannot afford it dives free
  },

  // leaderboard limits. The game client and the Worker both import these, so a
  // cap only has to be changed in one place to hold on both sides.
  leaderboard: {
    topLimit: 10,           // rows shown on the board by default
    maxTopLimit: 25,        // the most a caller may ever ask for, e.g. /top?limit=
    maxScore: 1000000,      // nothing above this is a real run
    maxPointsPerSecond: 60, // generous: a great run stays under it, score=9e9 does not
    minRunMs: 3000,         // a run shorter than this cannot have earned anything
    submitCooldownMs: 5000, // per player, server-enforced
  },

  // Calming mini-games, offered on death after a long stretch of play. The
  // reward is banked, never added to the run's score, so it can never touch
  // the leaderboard — see engine/progress.js and engine/minigames.js.
  miniGames: {
    everyMs: 15 * 60 * 1000, // offer once per this much cumulative play
    reward: 250,             // banked points for finishing one
    breathing: {
      phaseMs: 4000,         // each of in / hold / out / hold lasts this long
      rounds: 4,             // full in-hold-out-hold cycles before it's done
    },
    words: {
      tapCooldownMs: 5000,   // gap enforced between taps, so it can't be rushed
      needed: 5,             // distinct words to tap before the reward is earned
      list: [
        "kind", "brave", "calm", "patient", "gentle", "curious", "friendly",
        "grateful", "hopeful", "steady", "warm", "bright", "caring",
        "confident", "peaceful", "cheerful", "thoughtful", "generous",
      ],
    },
  },
};
