import { CONFIG } from "./config.js";
import { weightedPick } from "./rng.js";

// Short, screen-only positive activities, offered after a long stretch of
// play — see engine/progress.js for when one is due. Pure: every timing or
// selection question here takes elapsed time or an rng as an argument and
// never touches a clock or Math.random directly, same rule as the rest of
// engine/.
//
// The reward for finishing one is banked points (CONFIG.miniGames.reward),
// spendable on skins like any other points. It is never added to a run's
// score, so it can never reach the leaderboard and the anti-cheat caps in
// leaderboard.js need no loosening for it to exist. No activity declares its
// own reward — the flat CONFIG.miniGames.reward stays the single source of
// truth for all of them, so none can be tuned into a farming loop by itself.
//
// This registry is what the shell iterates to draw the offer's title/sub and
// to wire each activity's own screen — see MINI_GAME_VIEWS in src/index.html.
export const MINI_GAMES = [
  { id: "breathing", title: "TAKE A BREATH", sub: "a short, calm break",     weight: 1 },
  { id: "words",     title: "KIND WORDS",    sub: "gather a few kind words", weight: 1 },
];

export function miniGameIds() {
  return MINI_GAMES.map(g => g.id);
}

export function miniGameById(id) {
  return MINI_GAMES.find(g => g.id === id) ?? MINI_GAMES[0];
}

/** Which activity to offer this time. */
export function pickMiniGame(rng) {
  return weightedPick(rng, MINI_GAMES).id;
}

const B = CONFIG.miniGames.breathing;
const W = CONFIG.miniGames.words;

// Named so the shell never has to infer which hold it's in from context —
// "hold after breathing in" and "hold after breathing out" look different
// (a full square held, versus an empty one held) and need different labels.
const BREATH_PHASES = ["in", "holdIn", "out", "holdOut"];
const ROUND_MS = B.phaseMs * BREATH_PHASES.length;

/**
 * Square breathing as a pure function of elapsed time: breathe in, hold in,
 * breathe out, hold out, each `phaseMs` long, repeated `rounds` times.
 * @param {number} elapsedMs
 * @returns {{phase:string, secondsLeft:number, progress:number, round:number, done:boolean}}
 *          `progress` is how far through the current phase, 0..1.
 */
export function breathPhaseAt(elapsedMs) {
  const total = ROUND_MS * B.rounds;
  if (elapsedMs >= total) {
    return { phase: "done", secondsLeft: 0, progress: 1, round: B.rounds, done: true };
  }
  const clamped = Math.max(0, elapsedMs);
  const round = Math.floor(clamped / ROUND_MS);
  const intoRound = clamped % ROUND_MS;
  const phaseIndex = Math.floor(intoRound / B.phaseMs);
  const intoPhase = intoRound % B.phaseMs;
  return {
    phase: BREATH_PHASES[phaseIndex],
    secondsLeft: Math.ceil((B.phaseMs - intoPhase) / 1000),
    progress: intoPhase / B.phaseMs,
    round: round + 1,
    done: false,
  };
}

/**
 * May another word be tapped yet? The cooldown is the whole point — without
 * it the exercise is five taps in one second, which is not calming anyone.
 */
export function canTapAt(lastTapMs, nowMs) {
  if (lastTapMs == null) return true;
  return nowMs - lastTapMs >= W.tapCooldownMs;
}

/** How many distinct words complete the exercise. */
export function wordsNeeded() {
  return W.needed;
}

/** Has enough been tapped? */
export function isWordGameComplete(tapCount) {
  return (tapCount ?? 0) >= W.needed;
}

/** The words on offer. Content lives in config.js so it stays one tunable list. */
export function wordList() {
  return W.list;
}
