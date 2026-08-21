// Which screen the game is on, as a state machine.
//
// Small, but worth having: the shell used to infer "am I playing?" from a
// single `running` boolean, which cannot tell paused from dead from
// not-started. That is how you get a resume button that revives a dead eel.
// Every transition is named here and anything unnamed is ignored.

export const PHASES = ["home", "skins", "howto", "board", "stats", "playing", "paused", "over", "minigame"];

const TRANSITIONS = {
  home:    { dive: "playing", openSkins: "skins", openHow: "howto", openBoard: "board", openStats: "stats" },
  skins:   { closeSkins: "home" },                     // only ever leads back home
  howto:   { closeHow: "home" },                       // likewise
  board:   { closeBoard: "home" },                     // likewise
  stats:   { closeStats: "home" },                     // likewise
  playing: { pause: "paused", die: "over" },
  paused:  { resume: "playing", surface: "home" },     // surface = give up the run
  // the offer is optional — surface still skips straight home, same as ever
  over:    { surface: "home", playMiniGame: "minigame" },
  minigame:{ finishMiniGame: "home" },                 // death still always goes home first
};

/** The phase this event leads to, or the current phase if it does not apply. */
export function nextPhase(phase, event) {
  return TRANSITIONS[phase]?.[event] ?? phase;
}

/** Does this event do anything from here? */
export function canDo(phase, event) {
  return nextPhase(phase, event) !== phase;
}

/** Only one phase advances the world. */
export function isRunning(phase) {
  return phase === "playing";
}
