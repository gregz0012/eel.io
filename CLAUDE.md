# CLAUDE.md — Voltfin (eel.io)

Guidance for working in this repo. Read this before making changes.

---

## 1. Background

**Voltfin** is a small, ad-free browser game in the spirit of *slither.io* / *snake.io*, set in the deep sea. You play a young electric eel: eat fish to grow, bite chunks off rival eels, dodge or shock-and-devour predators, and fight a boss every ten levels.

Design values, in priority order:

1. **No ads, no accounts, no tracking.** Ever.
2. **Runs offline, zero runtime dependencies.** The shipped `index.html` is one self-contained file of plain HTML/CSS/JS on a `<canvas>`. No frameworks or libraries reach the browser.
3. **Family-friendly and approachable.** It's played by kids. Keep controls forgiving and difficulty fair.
4. **Readable over clever.** This is a hobby project meant to be understood and tinkered with.

### Current gameplay (source of truth for behaviour)

- **Movement:** eel follows the pointer; hold to sprint (costs a little length). Swim speed rises gently with size, plus a small per-level bonus.
- **Food:** small fish, `feast orbs` (worth 10×), and `energy motes` dropped by anything that dies (motes magnetise toward the player).
- **Rival eels:** bite a rival's *tail* to chop it off (it shrinks, keeps swimming, drops energy); swallow a clearly-smaller one whole at the head; a clearly-bigger one can eat you. A rival whose *head* hits *your body* dies.
- **Predators:** they can eat you. Shock to stun, then ram to devour.
- **Power-ups:** `starfish` = one-hit shield; `baby electric eel` = charges the zap meter.
- **Zap:** when charged, stuns **everything** nearby (predators and eels, any size) for a few seconds; nearby fish burst into energy.
- **Self-cross:** crossing your own tail bites it off — you lose length and points (with a short cooldown and a generous "neck" buffer so ordinary tight turns are safe).
- **Levelling:** score-based and **sticky** (never falls). `+1 predator every 2 levels`; a `boss every 10 levels` — slower than a normal predator but takes **2 hits** (stun, then ram twice).

---

## 2. Why we're changing the architecture

The playable game began as one file with all logic inline and entangled with canvas drawing, the DOM, `Math.random`, and `requestAnimationFrame`. That is impossible to unit-test.

It also hid a fatal bug for the whole life of the file: `let predTarget = PRED_BASE` ran *above* `const PRED_BASE = 3`, a temporal dead zone read that threw a `ReferenceError` the instant the script loaded. The game never started — the Dive button was never even wired up. No amount of reading the code caught it; the first test that actually executed the file did, immediately. That is the case for this architecture in one bug.

The goal is to make behaviour **testable without a browser** by separating a **pure game core** from all side effects. We drive that separation with **BDD first** (describe the behaviour we want) then **TDD** (unit-test and implement the pieces).

> Migrate incrementally — see §7. Do not rewrite it all at once.

---

## 3. Target architecture

```
eel.io/
├── index.html            # BUILD OUTPUT — do not edit by hand. Generated, committed, shipped.
├── build.mjs             # inlines src/engine/** into index.html
├── src/
│   ├── index.html        # the shell: canvas + HUD + game loop, with /* @inject:engine */
│   ├── engine/           # PURE game core — no DOM, no canvas, no globals, no wall-clock, no Math.random
│   │   ├── rng.js        # seeded RNG (deterministic; injected everywhere randomness is needed)
│   │   ├── vector.js     # pure math: dist, angleLerp, clamp, etc.
│   │   ├── config.js     # tunables: speeds, spawn targets, thresholds, level rules
│   │   ├── scoring.js    # addScore, level rules, difficulty ramp (pure)
│   │   ├── collision.js  # geometry: head-vs-body, tail-bite index, self-cross detection
│   │   ├── entities.js   # factories: makeEel, makeFish, makePredator, makeBoss, ...
│   │   ├── spawn.js      # spawn rules (takes rng + config, returns entities)
│   │   └── world.js      # step(state, input, dt, rng) -> state  ← the heart, pure
│   ├── render/draw.js    # reads state, draws to canvas (NOT unit-tested; visual only)
│   └── input/controls.js # pointer/keyboard/touch -> intent object {aim, boost, zap}
├── features/             # BDD (acceptance): Gherkin .feature files + step defs
│   ├── leveling.feature
│   └── steps/
│       └── leveling.steps.js
├── test/                 # TDD (unit): Vitest specs
│   ├── scoring.test.js   # one spec per engine module
│   └── build.test.js     # the build output stays in sync and actually executes
├── cucumber.js
└── package.json          # dev-only deps (vitest, cucumber); ZERO runtime deps
```

Only `config.js` and `scoring.js` exist so far. The rest is the destination, not a description of today — see §7.

### Why a build step

The engine is written as ES modules so Node can import it directly in tests. Browsers refuse to load ES modules over `file://`, and design value #2 says Voltfin stays a single file you can double-click or email to a kid. Those two facts are irreconcilable without a build.

So `build.mjs` concatenates the engine modules into one scope, exposes them to the shell as `Engine`, and writes the root `index.html`. There is still **no runtime dependency and no bundler** — the output is plain HTML/CSS/JS, and the build is ~90 lines of readable Node with no packages behind it.

Consequences to respect:

- **Never hand-edit the root `index.html`.** Edit `src/index.html` or `src/engine/**`, then `npm run build`.
- **The built `index.html` is committed.** GitHub Pages serves it and people double-click it. `npm run check` fails if it is stale.
- **Engine exports share one scope after bundling.** Two modules exporting the same name is a build error, by design.

### The one rule that makes this work: keep `engine/` pure

Everything under `src/engine/` must be **deterministic**:

- **No** `document`, `window`, `canvas`, or any DOM.
- **No** `Math.random` — take an injected `rng` (from `src/engine/rng.js`, seedable) and thread it through.
- **No** `Date.now()` / `performance.now()` — time enters only as the `dt` argument to `step`.
- State goes **in** as an argument and the next state comes **out** as a return value.

**Determinism is the requirement; immutability is not.** Same `(state, input, dt, seed)` must always produce the same result — that is what makes a test meaningful. It does *not* mean allocating fresh objects every frame: at 280 fish, 14 rival eels and a 900-segment body array running 60 times a second, copy-everything is real GC churn on the cheap tablets kids play on. `world.step` may mutate the state object it is handed, as long as nothing outside its arguments influences the outcome. Small value objects like the scoring state stay immutable because there the copy is free.

A seeded RNG is *stateful* by nature — `rng()` advances an internal counter. That is fine and is not what this rule forbids. What it forbids is **ambient** nondeterminism: reaching for a global clock or a global random source instead of taking one as an argument.

Rendering, input, and the animation loop live outside the engine and are the *only* places allowed to touch the DOM, the clock, or real randomness. They are exercised by hand/playtesting, not by the unit suite.

### Pure functions can't have side effects — so return them

A level-up spawns predators and, every tenth level, a boss. `addScore` cannot do that and stay pure. The temptation is to let it "just this once" — and then the boss rule is invisible to tests, the suite stays green, and nobody notices bosses stopped appearing until level 10.

The pattern instead: **the engine reports what happened, the shell applies it.**

```js
// src/engine/scoring.js
export function addScore(state, n) {
  const score = Math.max(0, state.score + n);
  const level = Math.max(state.level, 1 + Math.floor(score / CONFIG.pointsPerLevel));
  const levelsGained = [];
  for (let L = state.level + 1; L <= level; L++) levelsGained.push(L);
  return { score, level, levelsGained };
}
```

```js
// src/index.html — the shell owns the side effects
function addScore(n){
  const next = Engine.addScore({ score, level }, n);
  score = next.score;
  if (next.levelsGained.length){
    for (const L of next.levelsGained) onLevelUp(L);
    level = next.level;
    flashT = .35;
  }
}
```

Now `expect(addScore({score:0,level:1}, 1200).levelsGained).toContain(10)` is a real test of the boss rule. Use this shape for every rule whose consequence is a spawn, a sound, or a screen shake.

---

## 4. Development workflow: BDD → TDD

For any **behaviour** change, follow this loop.

### Step 1 — BDD: describe the behaviour (outside-in)

Write or update a Gherkin scenario in `features/*.feature` describing the *observable* behaviour in plain language. This is the acceptance criterion. Run it — it should **fail**.

```gherkin
# features/leveling.feature
Scenario: Levels never fall when points are lost
  Given a new game
  When the player scores 360 points
  And the player loses 300 points
  Then the player is on level 4
  And the score is 60
```

Keep this layer **thin**: acceptance only. Gherkin's payoff is plain language for people who don't read code, and here that audience is small. A second test runner and a layer of step definitions is real cost, so never write a scenario for something a unit test already covers. Four or five feature files is the whole budget. If a rule is fiddly arithmetic, it belongs in `test/`, not `features/`.

### Step 2 — TDD: drive the units (inside-out)

Now go red-green-refactor on the pure functions the scenario needs. Smallest failing unit test first, then the minimum code to pass, then refactor.

```js
// test/scoring.test.js
it("never lowers the level when points are lost", () => {
  const s = addScore({ score: 240, level: 3 }, -200);
  expect(s.level).toBe(3);   // sticky
  expect(s.score).toBe(40);
});
```

Assert against `CONFIG` rather than hard-coded numbers where the number *is* the tunable, so a balance change doesn't produce a wall of false failures.

### Step 3 — bind the scenario to the engine

Step definitions drive the real engine, never a mock of it. Where a rule's side effects live in the shell, the step definitions stand in for the shell and apply them the same way (see `features/steps/leveling.steps.js`).

Remember that engine functions **return** the next state. Reassign it:

```js
When("the player scores {int} points", function (n) {
  apply(this.world, n);       // NOT: addScore(this.world, n)
});
```

### Step 4 — green + refactor

Unit tests green, then the scenario green, then refactor with the suite as your safety net. Only touch the render/input/loop parts of the shell once the behaviour is proven in the engine.

**Order of authority:** a failing scenario means the feature isn't done; a failing unit test means the implementation is wrong; un-migrated shell logic is legacy until its behaviour is covered and moved.

---

## 5. Commands

```bash
npm install          # dev deps only (vitest, @cucumber/cucumber)

npm run build        # regenerate index.html from src/  — after ANY src/ change
npm test             # Vitest unit suite (TDD)          — fast, run constantly
npm run test:watch   # Vitest in watch mode
npm run bdd          # Cucumber scenarios (BDD)         — acceptance
npm run check        # build:check + bdd + unit         — run before every commit

npm start            # serve at http://localhost:8000 (or just open index.html)
```

---

## 6. Conventions & guardrails

- **Purity is non-negotiable in `engine/`.** Reaching for `document`, `Math.random`, or `performance.now()` inside `engine/` means stop and inject it instead.
- **Never hand-edit the root `index.html`.** It is generated. Your change will be silently overwritten by the next build.
- **Rebuild before committing.** `npm run check` fails on a stale `index.html`.
- **Tunables live in `config.js`**, not scattered as magic numbers, so tests can pin them and balance changes stay in one place.
- **One engine module = one unit spec.** New engine file ⇒ new `test/*.test.js`. Add it to `ENGINE_MODULES` in `build.mjs` too, in dependency order.
- **Don't unit-test the renderer.** `draw.js` is validated by eye. Keep logic *out* of it so there's nothing there worth testing.
- **Determinism:** every test that touches randomness seeds the RNG. No test may depend on wall-clock time or real randomness.
- **No runtime dependencies ship to the browser.** `vitest` and `cucumber` are `devDependencies` only. Keep it that way — `test/build.test.js` asserts the shipped file loads nothing external.
- **Small commits, green suite.** Don't commit red.
- **Preserve the design values in §1.** Reject changes that add ads, tracking, accounts, or a heavy runtime dependency.

---

## 7. Migrating the shell (incremental)

One slice at a time, never all at once:

1. Pick one behaviour (e.g. collision).
2. Write its `.feature` scenario and unit tests (both red).
3. Extract the matching logic out of `src/index.html` into a pure `engine/` module until green.
4. Add the module to `ENGINE_MODULES` in `build.mjs`, and replace the inline logic in `src/index.html` with a call through `Engine.`.
5. `npm run build`, playtest in a browser, `npm run check`, commit. Next slice.

Extraction order — each step only depends on earlier ones:

`vector` → **`scoring` ✅ done** → `collision` → `entities` → `spawn` → `world.step`

leaving draw/input/loop as the thin side-effect shell. `entities` comes before `spawn` because spawn rules build entities.

Move a tunable into `config.js` when its slice moves, not before — a config full of constants nobody reads yet is worse than one that tracks reality.

---

## 8. Definition of done

A change is done when:

- [ ] Unit tests cover the new/changed engine logic and pass (`npm test`).
- [ ] **If it changes behaviour**, a Gherkin scenario describes it and passes (`npm run bdd`). Refactors, renderer tweaks and build changes don't need one.
- [ ] New randomness/time is injected, not called directly, in `engine/`.
- [ ] Tunables touched by the change live in `config.js`.
- [ ] `npm run build` has been run and the regenerated `index.html` is committed.
- [ ] The game still runs and plays correctly in a real browser (manual check — the suite proves the rules, not the feel).
- [ ] `npm run check` is green and the commit is small and focused.

---

## 9. Known gaps

Honest list of what this architecture does not yet cover:

- **The high score is in-memory only.** `best` resets on reload. Persisting it means `localStorage`, which is compatible with "no accounts, no tracking" (it never leaves the device) — but decide deliberately, and keep it in the shell, not the engine.
- **No CI.** `npm run check` runs only when someone remembers. A GitHub Actions workflow running it on push would be a cheap win.
- **No lint or formatter.** Fine for now; the codebase is small and consistent.
- **`src/index.html` is still a monolith** — everything except scoring. That is expected; see §7.
