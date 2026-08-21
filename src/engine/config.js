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

  // The boss guarding each level is the pacing of the whole game: it turns
  // up after a breather, needs points earned first, and takes a rising number
  // of hits. That only works because it is slow enough to swim away from —
  // a boss you cannot escape and cannot out-damage is just a wall.
  boss: {
    firstLevel: 2,          // levels below this are unguarded
    breatherMs: 6000,       // calm after a level-up before the next boss shows
    pointsToSummon: 60,     // points earned within the level, on top of the
                             // breather, before its boss appears — a playtest
                             // dial, not a derived number; expect to move it
    speedFactor: 0.72,      // slower than a predator: you can always disengage
    ramKnockback: 30,       // world units the boss is pushed back per ram hit
    hitCooldownMs: 600,     // gap enforced between ram hits on a stunned boss
    hitGraceMs: 300,        // window right after a stun ends where contact
                             // neither kills nor counts as a hit — otherwise a
                             // stun that expires mid-collision kills for free
  },

  // stun durations, shared by predators and rival eels alike. A zap knocks out
  // anything in range regardless of size; a shield that absorbs a hit stuns
  // back whatever landed it. The HUD reads these too, so they live here rather
  // than as a magic number duplicated in draw code.
  stun: {
    zapMs: 3000,
    shieldMs: 2000,
  },

  // per-level speed reward, capped so the eel stays controllable
  levelSpeedPerLevel: 0.015,
  levelSpeedMax: 1.4,

  // Shields: a starfish or a present grants one. Below stackLevel a second
  // pickup while already carrying one is wasted — from stackLevel on, the cap
  // rises so a rough patch right after a save doesn't cost a life for want of
  // a moment to spend the first shield.
  shield: {
    stackLevel: 8,   // level at which the cap rises above 1
    maxStacked: 2,   // the cap from stackLevel on
  },

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
    maxLevel: 200,          // generous: reaching this needs hours of unbroken play
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
    stretch: {
      totalMs: 12000,        // how long the timer runs before "Done" pays out
      list: [
        { id: "shoulders", text: "Roll your shoulders slowly" },
        { id: "reach",     text: "Reach your arms up high" },
        { id: "neck",      text: "Gently stretch your neck from side to side" },
        { id: "wiggle",    text: "Wiggle your fingers and your toes" },
        { id: "cat",       text: "Take a big, slow stretch like a cat" },
        { id: "ankles",    text: "Roll your ankles, one at a time" },
      ],
    },
    // Deliberately no tapCooldownMs — this is the calmest of the activities,
    // no timer, no urgency, so nothing here should ever ask a player to wait.
    bubbles: {
      needed: 3,             // distinct bubbles to tap before the reward is earned
      onScreen: 7,           // how many float at once — shell-side layout tuning
      list: [
        "Something that made you smile today",
        "A person you're glad to have",
        "A place that makes you feel calm",
        "Something you're good at",
        "A sound you like",
        "Something soft or cozy",
        "A small win today",
      ],
    },
    // Rerolling is uncapped and free — the point of "give me another" is
    // letting a player search until they find a deed they can actually do
    // right now, so there is nothing here to tune that would cap it.
    deeds: {
      list: [
        { id: "compliment", text: "Give someone a genuine compliment" },
        { id: "tidy",       text: "Help tidy up without being asked" },
        { id: "thanks",     text: "Say thank you to someone who helped you today" },
        { id: "share",      text: "Share something you have with a sibling or friend" },
        { id: "listen",     text: "Ask someone how their day was, and really listen" },
        { id: "note",       text: "Write or draw a kind note for someone" },
        { id: "smile",      text: "Smile and say hello to someone" },
      ],
    },
    // Every scenario has exactly one option flagged kind:true — simplest to
    // author and test, and choiceOutcome has structurally nowhere for a
    // penalty to live on the other branch, so an unkind pick can only ever
    // lead to a gentle nudge, never a cost.
    choices: {
      kindReply: "Nice choice.",
      nudge: "What else could you try?",
      list: [
        {
          id: "toy",
          prompt: "Your sibling drops their toy and it breaks. What do you do?",
          options: [
            { text: "Laugh at them", kind: false },
            { text: "Help them fix it, or find something else to play", kind: true },
            { text: "Walk off and leave them to it", kind: false },
          ],
        },
        {
          id: "lunch",
          prompt: "Someone in your class is sitting alone. What do you do?",
          options: [
            { text: "Ignore them", kind: false },
            { text: "Invite them to sit with you", kind: true },
          ],
        },
        {
          id: "mistake",
          prompt: "A classmate gets an answer wrong out loud. What do you do?",
          options: [
            { text: "Laugh", kind: false },
            { text: "Say it's okay, everyone makes mistakes", kind: true },
            { text: "Roll your eyes", kind: false },
          ],
        },
        {
          id: "turn",
          prompt: "Two friends both want a turn at the same game. What do you do?",
          options: [
            { text: "Grab it for yourself", kind: false },
            { text: "Suggest taking turns", kind: true },
          ],
        },
      ],
    },
  },
};
