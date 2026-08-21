import { seededRng, seedFromDate, weightedPick } from "./rng.js";
import { statValue } from "./stats.js";

// The daily challenge: the same one, for every player, every day, with no
// server. Determinism does the sharing — a challenge is picked from the pool
// below by a seed derived purely from the calendar date, so every player who
// computes today's date gets the identical pick, offline, with nobody's
// clock but their own. The shell is responsible for passing a UTC date key
// ("2026-08-21"), never a locale-sensitive one — two players in different
// timezones must agree on which day it is, or "the same challenge" breaks.
export const CHALLENGE_POOL = [
  { id: "fish50",    name: "Fish Frenzy",  desc: "Eat 50 fish",             stat: "fishEaten",        target: 50, reward: 100, weight: 20 },
  { id: "dive3",     name: "Triple Dive",  desc: "Take 3 dives",            stat: "dives",             target: 3, reward: 60,  weight: 20 },
  { id: "feast5",    name: "Orb Hunter",   desc: "Gulp 5 feast orbs",       stat: "feastOrbsEaten",    target: 5, reward: 90,  weight: 16 },
  { id: "presents5", name: "Box Day",      desc: "Open 5 presents",         stat: "presentsOpened",    target: 5, reward: 80,  weight: 15 },
  { id: "bite10",    name: "Tail Trimmer", desc: "Bite 10 rival tails",     stat: "rivalTailsBitten",  target: 10, reward: 120, weight: 15 },
  { id: "swallow5",  name: "Big Appetite", desc: "Swallow 5 rivals whole",  stat: "rivalEelsKilled",   target: 5, reward: 150, weight: 12 },
  { id: "predator5", name: "Pest Control", desc: "Devour 5 predators",      stat: "predatorsKilled",   target: 5, reward: 150, weight: 12 },
  { id: "boss1",     name: "Boss Rush",    desc: "Defeat a boss",           stat: "bossesKilled",      target: 1, reward: 200, weight: 10 },
];

/** Today's challenge, deterministic from a UTC date key alone. */
export function challengeForDate(isoDate) {
  return weightedPick(seededRng(seedFromDate(isoDate)), CHALLENGE_POOL);
}

/**
 * Progress toward a challenge: how much of `stat` has accrued since
 * `baselineStats` was snapshotted (at the start of the day it was picked).
 * Lifetime stats only ever rise, so this is never negative in practice —
 * floored anyway, since `baselineStats` could be an edited store.
 */
export function challengeProgress(challenge, stats, baselineStats) {
  return Math.max(0, statValue(stats, challenge.stat) - statValue(baselineStats, challenge.stat));
}

/** Has the challenge's target been reached? */
export function isChallengeComplete(challenge, stats, baselineStats) {
  return challengeProgress(challenge, stats, baselineStats) >= challenge.target;
}
