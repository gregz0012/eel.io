import { CONFIG } from "./config.js";
import { weightedPick, randInt } from "./rng.js";

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
  { id: "breathing", title: "TAKE A BREATH",     sub: "a short, calm break",     weight: 1 },
  { id: "words",     title: "KIND WORDS",        sub: "gather a few kind words", weight: 1 },
  { id: "stretch",   title: "STRETCH BREAK",     sub: "a gentle moment to move", weight: 1 },
  { id: "bubbles",   title: "GRATITUDE BUBBLES", sub: "pop a few good thoughts", weight: 1 },
  { id: "deeds",     title: "GOOD DEED QUEST",   sub: "go and do one small kindness", weight: 1 },
  { id: "choices",   title: "KIND CHOICES",      sub: "pick the kind thing to do", weight: 1 },
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

const ST = CONFIG.miniGames.stretch;
const BU = CONFIG.miniGames.bubbles;

/** One randomly-picked stretch, as `{id, text}`. */
export function pickStretch(rng) {
  return ST.list[randInt(rng, 0, ST.list.length - 1)];
}

/**
 * A stretch's timer as a pure function of elapsed time — mirrors
 * breathPhaseAt's shape. There is no "hold" or "phase" here, just one run
 * to `totalMs`; tapping "Done" early is a shell-side choice (see
 * src/index.html), not something this function needs to know about.
 * @param {number} elapsedMs
 * @returns {{progress:number, secondsLeft:number, done:boolean}}
 */
export function stretchPhaseAt(elapsedMs) {
  const clamped = Math.max(0, elapsedMs);
  if (clamped >= ST.totalMs) {
    return { progress: 1, secondsLeft: 0, done: true };
  }
  return {
    progress: clamped / ST.totalMs,
    secondsLeft: Math.ceil((ST.totalMs - clamped) / 1000),
    done: false,
  };
}

/**
 * `n` distinct gratitude prompts, so the same bubble is never floating
 * twice at once. Asking for more than the list holds just returns the
 * whole list, rather than looping or duplicating.
 */
export function pickBubblePrompts(rng, n) {
  const pool = [...BU.list];
  const picked = [];
  const count = Math.min(Math.max(0, n ?? 0), pool.length);
  for (let i = 0; i < count; i++) {
    const idx = randInt(rng, 0, pool.length - 1);
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return picked;
}

/** How many distinct bubbles complete the exercise. */
export function bubblesNeeded() {
  return BU.needed;
}

/** Has enough been tapped? */
export function isBubbleGameComplete(tapCount) {
  return (tapCount ?? 0) >= BU.needed;
}

const DE = CONFIG.miniGames.deeds;
const CH = CONFIG.miniGames.choices;

/**
 * One randomly-picked deed, as `{id, text}`. `excludeId` — the deed just
 * shown — is left out of the draw so "give me another" never repeats the
 * one a player just asked to skip; with only one deed in the whole list
 * there's nothing left to exclude, so it's returned anyway rather than
 * hanging.
 */
export function pickDeed(rng, excludeId) {
  const pool = excludeId != null && DE.list.length > 1
    ? DE.list.filter(d => d.id !== excludeId)
    : DE.list;
  return pool[randInt(rng, 0, pool.length - 1)];
}

/** One randomly-picked "what would you do" scenario, as `{id, prompt, options}`. */
export function pickScenario(rng) {
  return CH.list[randInt(rng, 0, CH.list.length - 1)];
}

/** Is the option at this index the scenario's kind one? */
export function isKindChoice(scenario, index) {
  return scenario?.options?.[index]?.kind === true;
}

/**
 * What picking an option leads to. The kind option ends the activity and
 * earns the reward; anything else is a gentle nudge to try again — there is
 * no field here a penalty could ever occupy, on either branch, which is what
 * makes "never punish" a shape rather than just an intention. An out-of-range
 * index is treated the same as an unkind pick: nudged, never completed,
 * never throws.
 * @returns {{kind:boolean, message:string, complete:boolean}}
 */
export function choiceOutcome(scenario, index) {
  if (isKindChoice(scenario, index)) {
    return { kind: true, message: CH.kindReply, complete: true };
  }
  return { kind: false, message: CH.nudge, complete: false };
}
