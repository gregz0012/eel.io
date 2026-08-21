import { statValue } from "./stats.js";

// Achievements: a fixed catalogue of lifetime milestones, each checked
// against a single counter from stats.js. Content, not logic — add an
// achievement by adding a row here, no other code changes needed.
export const ACHIEVEMENTS = [
  { id: "firstDive",   name: "First Dive",       desc: "Take your first dive",        stat: "dives",              threshold: 1 },
  { id: "veteran",     name: "Veteran Diver",    desc: "Take 50 dives",               stat: "dives",              threshold: 50 },
  { id: "fish100",     name: "Fish Fanatic",     desc: "Eat 100 fish",                stat: "fishEaten",          threshold: 100 },
  { id: "fish1000",    name: "Fish Frenzy",      desc: "Eat 1,000 fish",              stat: "fishEaten",          threshold: 1000 },
  { id: "feast25",     name: "Feast Mode",       desc: "Gulp 25 feast orbs",          stat: "feastOrbsEaten",     threshold: 25 },
  { id: "presents20",  name: "Box Opener",       desc: "Open 20 presents",            stat: "presentsOpened",     threshold: 20 },
  { id: "bites25",     name: "Tail Chopper",     desc: "Bite 25 rival tails",         stat: "rivalTailsBitten",   threshold: 25 },
  { id: "swallow15",   name: "Whole Swallower",  desc: "Swallow 15 rivals whole",     stat: "rivalEelsKilled",    threshold: 15 },
  { id: "predators20", name: "Predator Problem", desc: "Devour 20 predators",         stat: "predatorsKilled",    threshold: 20 },
  { id: "boss1",       name: "Boss Slayer",      desc: "Defeat your first boss",      stat: "bossesKilled",       threshold: 1 },
  { id: "boss10",      name: "Boss Hunter",      desc: "Defeat 10 bosses",            stat: "bossesKilled",       threshold: 10 },
  { id: "longEel",     name: "Deep Sea Giant",   desc: "Grow to 150 in length",       stat: "maxLength",          threshold: 150 },
];

/** Has this achievement's threshold been met by the given lifetime stats? */
export function isEarned(achievement, stats) {
  return statValue(stats, achievement.stat) >= achievement.threshold;
}

/** Look an achievement up by id, or undefined for one an edited store invented. */
export function achievementById(id) {
  return ACHIEVEMENTS.find(a => a.id === id);
}

/**
 * Which achievements are unlocked given the current stats, and which of
 * those are new since `unlockedIds`. Same "report what happened, the shell
 * applies it" shape scoring.js uses for level-ups — showing a banner is a
 * side effect, so this stays pure and just says what changed.
 * @returns {{unlockedIds:string[], newlyUnlocked:string[]}}
 */
export function checkAchievements(stats, unlockedIds) {
  const already = new Set(unlockedIds ?? []);
  const unlockedNow = ACHIEVEMENTS.filter(a => isEarned(a, stats)).map(a => a.id);
  const newlyUnlocked = unlockedNow.filter(id => !already.has(id));
  return { unlockedIds: [...already, ...newlyUnlocked], newlyUnlocked };
}
