# CLAUDE.md — Eel Shock (eel.io)

Guidance for working in this repo. Read this before making changes.

---

## 1. Background

**Eel Shock** is a small, ad-free browser game in the spirit of *slither.io* / *snake.io*, set in the deep sea. You play a young electric eel: eat fish to grow, bite chunks off rival eels, dodge or shock-and-devour predators, and fight your way up through a boss on every level.

Design values, in priority order:

1. **No ads, no accounts, no tracking.** Ever. The leaderboard is opt-in and
   anonymous — see §4; if a feature needs to know *who* someone is, it is the
   wrong feature.
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
- **Presents:** a wrapped box holding one of five things — points, a shield, a full zap meter, lost points, or a predator spawned nearby. Kind outcomes outweigh cruel ones roughly 7 to 3.
- **Levelling:** points carry you to level 2 and no further — from there **killing the boss guarding your level is the only way up**. Levels are **sticky** (never fall). `+1 predator every 2 levels`. Every level from 2 on has a boss: slower than a predator so you can always disengage, but it takes **as many hits as the level number** (level 2 = two hits, level 15 = fifteen), each one needing a stun or a shield. A **breather** follows every level-up before the next boss arrives — that gap is when you find a starfish and recharge, and the fight is balanced around it existing.

---

## 2. Why we're changing the architecture

The playable game began as one file with all logic inline and entangled with canvas drawing, the DOM, `Math.random`, and `requestAnimationFrame`. That is impossible to unit-test.

It also hid a fatal bug for the whole life of the file: `let predTarget = PRED_BASE` ran *above* `const PRED_BASE = 3`, a temporal dead zone read that threw a `ReferenceError` the instant the script loaded. The game never started — the Dive button was never even wired up. No amount of reading the code caught it; the first test that actually executed the file did, immediately. That is the case for this architecture in one bug.

The goal is to make behaviour **testable without a browser** by separating a **pure game core** from all side effects. We drive that separation with **BDD first** (describe the behaviour we want) then **TDD** (unit-test and implement the pieces).

> Migrate incrementally — see §9. Do not rewrite it all at once.

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
│   │   ├── presents.js   # what a present holds, rolled from an injected rng (pure)
│   │   ├── vector.js     # pure math: dist, angleLerp, clamp, etc.
│   │   ├── config.js     # tunables: speeds, spawn targets, thresholds, level rules
│   │   ├── scoring.js    # addScore, level rules, difficulty ramp (pure)
│   │   ├── identity.js   # anonymous player tag: id -> "AmberLantern-4721" (pure)
│   │   ├── leaderboard.js# submission validation, ranking, board sorting (pure)
│   │   ├── session.js    # which screen we are on: home/playing/paused/over (pure)
│   │   ├── bank.js       # banking a dive's score, and the dive fare (pure)
│   │   ├── skins.js      # the skin catalogue and buying them (pure)
│   │   ├── minigames.js  # square breathing, the kind-words tap game (pure)
│   │   ├── progress.js   # cumulative playtime; when a mini-game is due (pure)
│   │   ├── collision.js  # geometry: head-vs-body, tail-bite index, self-cross detection
│   │   ├── entities.js   # factories: makeEel, makeFish, makePredator, makeBoss, ...
│   │   ├── spawn.js      # spawn rules (takes rng + config, returns entities)
│   │   └── world.js      # step(state, input, dt, rng) -> state  ← the heart, pure
│   ├── render/draw.js    # reads state, draws to canvas (NOT unit-tested; visual only)
│   └── input/controls.js # pointer/keyboard/touch -> intent object {aim, boost, zap}
├── worker/               # leaderboard server (Cloudflare Workers + D1)
│   ├── index.js          # imports the SAME rules from src/engine/
│   ├── schema.sql
│   └── wrangler.toml
├── features/             # BDD (acceptance): Gherkin .feature files + step defs
│   ├── leveling.feature
│   ├── leaderboard.feature
│   ├── screens.feature
│   └── steps/
├── test/                 # TDD (unit): Vitest specs
│   ├── scoring.test.js   # one spec per engine module
│   ├── identity.test.js
│   ├── leaderboard.test.js
│   ├── session.test.js
│   ├── rng.test.js
│   ├── presents.test.js
│   ├── bank.test.js
│   ├── skins.test.js
│   ├── worker.test.js    # the Worker's decisions, against a stubbed D1
│   └── build.test.js     # the build output stays in sync and actually executes
├── cucumber.js
└── package.json          # dev-only deps (vitest, cucumber); ZERO runtime deps
```

`config.js`, `rng.js`, `scoring.js`, `identity.js`, `leaderboard.js`, `session.js`,
`bank.js`, `skins.js`, `presents.js`, `minigames.js` and `progress.js` exist so far.
The rest is the destination, not a description of today — see §9.

### Why a build step

The engine is written as ES modules so Node can import it directly in tests. Browsers refuse to load ES modules over `file://`, and design value #2 says Eel Shock stays a single file you can double-click or email to a kid. Those two facts are irreconcilable without a build.

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

A level-up spawns predators and arms the next boss. `addScore` cannot do that and stay pure. The temptation is to let it "just this once" — and then the boss rule is invisible to tests, the suite stays green, and nobody notices bosses stopped appearing at all.

The pattern instead: **the engine reports what happened, the shell applies it.**

```js
// src/engine/scoring.js — two routes up, one report shape
export function completeLevel(state) {
  const level = state.level + 1;
  return { score: state.score, level, levelsGained: [level] };
}
```

```js
// src/index.html — the shell owns the side effects
function onBossKilled(){
  const next = Engine.completeLevel({ score, level });
  score = next.score;
  for (const L of next.levelsGained) onLevelUp(L);   // predators, banner, next boss
  level = next.level;
  flashT = .35;
}
```

Now `expect(completeLevel({score:0,level:4}).levelsGained).toEqual([5])` is a real
test of the rule. `addScore` returns the same shape for the one level points can
still win, so the shell applies a level won by combat and a level won by points
through the *same* path — one set of side effects that cannot drift apart. Use
this shape for every rule whose consequence is a spawn, a sound, or a screen shake.

---

## 4. The leaderboard, and why it does not track anyone

The leaderboard is the one feature that talks to a server, so it is the one most
able to violate §1. The rules that keep it honest:

**Players are a random id, never a device.** The shell generates a
`crypto.randomUUID()` once and keeps it in `localStorage`. Deriving an id from
the device instead — canvas fingerprint, user agent, screen metrics — is exactly
the tracking §1 forbids, however anonymous the name that comes out. It is also
worse at the job: fingerprints shift under browser updates, differ between
browsers on one machine, and **collide across identical tablets**, which is
precisely what a school or a family has.

**The server names the player, not the client.** `tagFor(id)` is pure, so the
Worker derives the display tag from the id it was sent and ignores anything else.
A client cannot put free text on a board that children read — no real names, no
rude words, no injection. That property is worth more than it looks; do not
"simplify" it by accepting a tag in the payload.

**Opt-in, and reversible.** Nothing is sent until the player presses *join*. The
`/forget` endpoint deletes their row, and the shell drops the local id so they
come back as a new anonymous player.

**It degrades to nothing.** With `LEADERBOARD_URL` empty the feature is inert:
no requests, no id generated, no storage beyond the local best score. Offline or
server down, the overlay says so and the game plays exactly as before. The game
must never need the network.

**Stored data is the minimum:** id, score, duration, timestamps. No IP addresses,
no user agents, nothing a person typed.

### The caps are a speed bump, not a lock

`validateSubmission` rejects impossible scores (an absolute ceiling, a
points-per-second rate, a minimum run length) and the Worker rate-limits per
player. That stops casual tampering. It does **not** stop someone who reads the
code, because a client-submitted score can always be forged.

The real fix falls out of the architecture: once `world.step` is pure and seeded,
a submission can carry its seed and input trace, and the server can re-simulate
the run to check the score is one the game would actually produce. Determinism
turns anti-cheat into a free side effect. The payload and schema are shaped to
allow that without a migration.

**One source of truth for the rules.** `worker/index.js` imports
`src/engine/leaderboard.js` directly, so a cap cannot drift between what the
client believes and what the server enforces. Change it in `config.js` and both
sides move together.

**No client SDK, ever.** Firebase's and Supabase's JS SDKs are runtime
dependencies in the browser and break design value #2 and the single-file build.
Talk to the server with `fetch` and plain JSON, or not at all.

---

## 5. Screens and skins

**Screens are a state machine** (`engine/session.js`), not a pile of booleans.
The shell used to infer everything from one `running` flag, which cannot tell
paused from dead from not-started — that is how you get a resume button that
revives a dead eel. Every legal move is named in one table and anything else is
ignored, so `goTo("resume")` from the game over screen is simply a no-op rather
than a bug. Add a screen by adding a transition, not an `if`.

**Death goes home.** `over` leads only to `home`; there is deliberately no
`over -> playing`. A player always passes the home screen, so they can change
their eel before diving again.

**Pausing freezes the world, not the picture.** The loop keeps drawing (the sea
drifts on behind the overlay) but only `phase === "playing"` calls `update`.
Paused time is subtracted from the run duration, so a pause cannot flatter the
leaderboard's points-per-second check.

**The bank is spent, not accumulated.** A dive's score is banked when it ends
(`bank.js`), skins are bought out of the balance (`skins.js`), and diving costs
points too. Two separate ideas that must not be conflated: the *balance* goes up
and down, but *ownership* only ever goes up. A skin once bought is never lost,
however empty the bank gets.

**Being broke must never end the game.** `payForDive` charges what the player
can afford and reports `free: true` when that was less than the fare. A child
who has a bad run and drains to nothing can still press the button. A hard gate
would be a dead end they cannot get out of, and no amount of correct accounting
is worth that. If you ever make the fare a hard requirement, you need a way back
in — a daily allowance, a free dive, something.

**Skins are gated on depth as well as money.** Each tier in `skins.js` carries a
`minLevel` — standard 2, metallic 5, gemstone 10, hero 15 — checked against the
deepest level the player has ever reached, so the shop is a reason to go down
rather than to grind fish in the shallows. Two rules keep that from turning
cruel: the gate is on *buying* only, and the free starting skin is exempt.
`wearableSkin` stays deliberately level-blind, so nothing a player already owns
can ever be taken back off them, and Volt — which sits in the "standard" tier —
never locks a new player out of their own eel. When a skin is both too deep and
too dear, `skinStatus` reports `"sealed"` rather than `"locked"`: points are the
half a player can fix this afternoon, and quoting a price when the real obstacle
is depth sends them grinding at something that cannot work.

`wearableSkin(id, owned)` is the only way the shell should pick a skin. It falls
back to the default for a skin that does not exist or was never bought, which is
what stops a stored-value edit putting a player in platinum. `buySkin` returns
the wallet unchanged when a purchase cannot happen, so a refused buy can never
half-apply.

The catalogue in `skins.js` holds the colours *and* the prices together — it is
the tunable surface for skins, and splitting it across `config.js` would only
make a balance change touch two files. The dive fare is a global tunable, so
that one does live in `config.js`.

Buying asks for confirmation in the shell. A mis-tap should not spend a child's
savings.

### Presents

A present holds one of five effects, rolled by `presents.js` from an **injected
rng** — the shell passes `Math.random`, tests pass a seeded one, which is what
makes "kind outcomes outweigh cruel ones" a thing a test can assert rather than
a hope. Levels stay sticky with no exception: nothing a present can hand out
lowers one. `addScore` will never lower a level either, since losing points is
the other way a present can sting.

The present that spawns a predator puts it 420–620 units away, not on top of the
player. Being eaten the instant you open a box is not a difficulty spike, it is
a bug report.

---

## 6. Development workflow: BDD → TDD

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

## 7. Commands

```bash
npm install          # dev deps only (vitest, @cucumber/cucumber)

npm run build        # regenerate index.html from src/  — after ANY src/ change
npm test             # Vitest unit suite (TDD)          — fast, run constantly
npm run test:watch   # Vitest in watch mode
npm run bdd          # Cucumber scenarios (BDD)         — acceptance
npm run check        # build:check + bdd + unit         — run before every commit

npm start            # serve at http://localhost:8000 (or just open index.html)
```

The leaderboard server is deployed separately and only when it changes. In CI
that is the `leaderboard` workflow — it applies the schema and deploys on a
push to `main` touching `worker/**` or `src/engine/**`, or on demand from the
Actions tab. It needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as
repository secrets; the README says where they come from. By hand:

```bash
cd worker
npx wrangler d1 execute eelio --remote --file=./schema.sql   # create the table, once
npx wrangler deploy                                          # prints the URL for LEADERBOARD_URL
```

Two things that look like secrets and are not: the D1 database id and the
Worker's URL. The URL ships in `index.html` to every player, so it belongs in
`src/index.html` where the build can see it — putting it in a secret would only
mean the committed `index.html` no longer matches its source, which is the one
thing `npm run check` exists to prevent. The API token is the only real secret
here, and nothing in the repo ever reads it.

The D1 database is `eelio`; its binding and id are in `worker/wrangler.toml`.

Wrangler reports anonymous usage telemetry to Cloudflare by default. It concerns
the CLI, not players, but given design value #1 it is worth knowing you can turn
it off with `npx wrangler telemetry disable` or `WRANGLER_SEND_METRICS=false`.

---

## 8. Conventions & guardrails

- **Purity is non-negotiable in `engine/`.** Reaching for `document`, `Math.random`, or `performance.now()` inside `engine/` means stop and inject it instead.
- **Never hand-edit the root `index.html`.** It is generated. Your change will be silently overwritten by the next build.
- **Rebuild before committing.** `npm run check` fails on a stale `index.html`.
- **Tunables live in `config.js`**, not scattered as magic numbers, so tests can pin them and balance changes stay in one place.
- **One engine module = one unit spec.** New engine file ⇒ new `test/*.test.js`. Add it to `ENGINE_MODULES` in `build.mjs` too, in dependency order.
- **Don't unit-test the renderer.** `draw.js` is validated by eye. Keep logic *out* of it so there's nothing there worth testing.
- **Anything random in `engine/` takes an `rng` argument** — `rollPresent(rng)`, never `Math.random()`. The shell passes the real thing.
- **Determinism:** every test that touches randomness seeds the RNG. No test may depend on wall-clock time or real randomness.
- **No runtime dependencies ship to the browser.** `vitest` and `cucumber` are `devDependencies` only. Keep it that way — `test/build.test.js` asserts the shipped file loads nothing external.
- **The leaderboard server derives the player's name; it never accepts one.** See §4.
- **Nothing the leaderboard needs may become something the game needs.** With no
  server configured, or no network, the game must play exactly as it does today.
- **Small commits, green suite.** Don't commit red.
- **Preserve the design values in §1.** Reject changes that add ads, tracking, accounts, or a heavy runtime dependency.

---

## 9. Migrating the shell (incremental)

One slice at a time, never all at once:

1. Pick one behaviour (e.g. collision).
2. Write its `.feature` scenario and unit tests (both red).
3. Extract the matching logic out of `src/index.html` into a pure `engine/` module until green.
4. Add the module to `ENGINE_MODULES` in `build.mjs`, and replace the inline logic in `src/index.html` with a call through `Engine.`.
5. `npm run build`, playtest in a browser, `npm run check`, commit. Next slice.

Extraction order — each step only depends on earlier ones:

`vector` → **`scoring` ✅ done** → `collision` → `entities` → `spawn` → `world.step`

`identity`, `leaderboard`, `session`, `bank`, `skins`, `minigames` and `progress` sit
outside that chain: they were new behaviour rather than extracted monolith, so they
went straight in as pure modules.

leaving draw/input/loop as the thin side-effect shell. `entities` comes before `spawn` because spawn rules build entities.

Move a tunable into `config.js` when its slice moves, not before — a config full of constants nobody reads yet is worse than one that tracks reality.

---

## 10. Definition of done

A change is done when:

- [ ] Unit tests cover the new/changed engine logic and pass (`npm test`).
- [ ] **If it changes behaviour**, a Gherkin scenario describes it and passes (`npm run bdd`). Refactors, renderer tweaks and build changes don't need one.
- [ ] New randomness/time is injected, not called directly, in `engine/`.
- [ ] Tunables touched by the change live in `config.js`.
- [ ] `npm run build` has been run and the regenerated `index.html` is committed.
- [ ] The game still runs and plays correctly in a real browser (manual check — the suite proves the rules, not the feel).
- [ ] `npm run check` is green and the commit is small and focused.

---

## 11. Known gaps

Honest list of what this architecture does not yet cover:

- **Leaderboard scores are not verifiable.** The caps in §4 stop casual forgery and nothing more. Replay verification is the fix and it waits on `world.step`.
- **The leaderboard is unauthenticated by design.** Anyone who clears their storage becomes a new player. That is the privacy trade: no accounts means no way to tell a returning player from a new one, and no way to stop someone farming fresh ids.
- **`/forget` trusts whoever holds the id.** The id is a random UUID that only that browser and the server ever see, so this is a capability, not a password. Good enough here; not a pattern to copy somewhere it matters.
- **CI runs the suite, never the game.** `npm run check` now runs on every push, and the `leaderboard` workflow can deploy the Worker without a laptop. Neither can tell you the eel feels wrong or a skin looks bad — playtesting is still manual, and still required.
- **No lint or formatter.** Fine for now; the codebase is small and consistent.
- **The bank and owned skins are local-only.** Clearing site data loses them, and they do not follow a player to another device. Nothing validates a balance either — an edited store is an edited store. Syncing them would need an account, which §1 rules out — so this is a trade we accept, not a bug to fix.
- **`src/index.html` is still a monolith** — everything except the extracted engine modules. That is expected; see §9.
