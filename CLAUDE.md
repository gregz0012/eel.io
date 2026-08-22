# CLAUDE.md — Eel Shock (eel.io)

Guidance for working in this repo. Read this before making changes.

---

## 1. Background

**Eel Shock** is a small, ad-free browser game in the spirit of *slither.io* / *snake.io*, set in the deep sea. You play a young electric eel: eat fish to grow, bite chunks off rival eels, dodge or shock-and-devour predators, and fight your way up through a boss on every level.

Design values, in priority order:

1. **No ads, no accounts, no tracking.** Ever. The leaderboard is opt-in and
   anonymous — see §4; if a feature needs to know *who* someone is, it is the
   wrong feature.
2. **Runs offline, no network-fetched runtime dependency.** The shipped `index.html` is one self-contained file you can double-click or email to a kid — nothing it needs is ever fetched over the network at load or play time. As of the WebGL renderer (#85), one exception is deliberately carved out: PixiJS is vendored into the file itself — pinned, hash-checked, and inlined as static text at build time, never referenced via `<script src=` and never touched over HTTP(S) — so "zero runtime dependency" becomes "zero *network* runtime dependency, one vendored offline one, by design and reviewed as such." Nothing else gets this exception without equally deliberate sign-off; see §8's vendoring guardrail.
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
- **Levelling:** points carry you to level 2 and no further — from there **killing the boss guarding your level is the only way up**. Levels are **sticky** (never fall). `+1 predator every 2 levels`. Every level from 2 on has a boss: slower than a predator so you can always disengage, and the hits it takes **rises every other level** (2, 2, 3, 3, 4, 4… reaching 8 by level 15), each one needing a stun or a shield. A **breather** follows every level-up before the next boss arrives, and it must also earn some points in the level first — that gap is when you find a starfish and recharge, and the fight is balanced around it existing.

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
├── index.html            # WEB BUILD OUTPUT — generated, committed, directly playable.
├── dist/                 # DERIVED release outputs — ignored, never hand-edited.
│   ├── web/index.html    # npm run build:web
│   └── app/index.html    # npm run build:app; source for capacitor/www
├── build.mjs             # inlines src/engine/** and vendor/pixi.min.js into index.html
├── vendor-pixi.mjs       # `npm run vendor:pixi` — copies+scrubs+pins PixiJS into vendor/
├── vendor/               # ONE vendored, pinned, offline library (PixiJS, #85) — see vendor/README.md
├── src/
│   ├── index.html        # the shell: canvas + HUD + game loop, with /* @inject:engine */
│   ├── engine/           # PURE game core — no DOM, no canvas, no globals, no wall-clock, no Math.random
│   │   ├── rng.js        # seeded RNG (deterministic; injected everywhere randomness is needed)
│   │   ├── presents.js   # what a present holds, rolled from an injected rng (pure)
│   │   ├── vector.js     # pure math: angleTo/distanceTo so far (for the boss
│   │   │                 #   sonar); dist2/angLerp/clamp still live inline in
│   │   │                 #   the shell — see §9, this is new behaviour riding
│   │   │                 #   the module's name, not the extraction slice yet
│   │   ├── config.js     # tunables: speeds, spawn targets, thresholds, level rules
│   │   ├── movement.js   # deterministic sprint engagement and dt-based length cost
│   │   ├── scoring.js    # addScore, level rules, difficulty ramp (pure)
│   │   ├── identity.js   # anonymous player tag: id -> "AmberLantern-4721" (pure)
│   │   ├── leaderboard.js# submission validation, ranking, board sorting (pure)
│   │   ├── session.js    # which screen we are on: home/playing/paused/over (pure)
│   │   ├── bank.js       # banking a dive's score, and the dive fare (pure)
│   │   ├── skins.js      # the skin catalogue and buying them (pure)
│   │   ├── minigames.js  # a registry of positive activities (square breathing,
│   │   │                 #   the kind-words tap game, ...) — pure
│   │   ├── progress.js   # cumulative playtime; when a mini-game is due (pure)
│   │   ├── stats.js      # lifetime counters, folded in as events happen (pure)
│   │   ├── achievements.js # a fixed catalogue checked against stats.js (pure)
│   │   ├── challenges.js # the daily challenge: date-seeded, same for everyone (pure)
│   │   ├── collision.js  # geometry: head-vs-body, tail-bite index, self-cross detection
│   │   ├── entities.js   # factories: makeEel, makeFish, makePredator, makeBoss, ...
│   │   ├── spawn.js      # spawn rules (takes rng + config, returns entities)
│   │   └── world.js      # step(state, input, dt, rng) -> state  ← the heart, pure
│   ├── render/draw.js    # reads state, draws to canvas (NOT unit-tested; visual only)
│   │                     #   — not yet extracted; see the note below the tree
│   └── input/controls.js # pointer/keyboard/touch -> intent object {aim, boost, zap}
│                         #   — not yet extracted; see the note below the tree
├── worker/               # leaderboard server (Cloudflare Workers + D1)
│   ├── index.js          # imports the SAME rules from src/engine/
│   ├── schema.sql
│   └── wrangler.toml
├── features/             # BDD (acceptance): Gherkin .feature files + step defs
│   ├── leveling.feature
│   ├── leaderboard.feature
│   ├── screens.feature
│   ├── sprint.feature
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
│   ├── vector.test.js
│   ├── movement.test.js
│   ├── stats.test.js
│   ├── achievements.test.js
│   ├── challenges.test.js
│   ├── worker.test.js    # the Worker's decisions, against a stubbed D1
│   └── build.test.js     # the build output stays in sync and actually executes
├── cucumber.js
└── package.json          # dev-only deps (vitest, cucumber, pixi.js — the
                           #   last used only to vendor vendor/pixi.min.js);
                           #   no network-fetched runtime deps
```

`config.js`, `movement.js`, `rng.js`, `scoring.js`, `identity.js`, `leaderboard.js`, `session.js`,
`bank.js`, `skins.js`, `presents.js`, `minigames.js`, `progress.js`, `vector.js`,
`stats.js`, `achievements.js` and `challenges.js` exist so far. The rest is the destination, not
a description of today — see §9.

`render/draw.js` and `input/controls.js` are the one part of this target that
Phase 7 (#85, the WebGL/PixiJS renderer) deliberately chose not to build
toward. Splitting the renderer into its own file(s) would mean `build.mjs`
gaining a mechanism to inline non-`engine/` JS — `bundleEngine()` is written
specifically for `engine/`'s hand-authored export style, and building a
second inliner was real, additional build-system risk the renderer swap
itself didn't need. So both the pre-existing Canvas 2D drawing functions and
every WebGL/Pixi function added for #85 (renderer/camera setup, the eel
ribbon and head mesh, every material and skin `fx`) live inline in
`src/index.html`, alongside input handling — a call made once, early in
the phase, and never revisited because nothing since has needed it
revisited. Unlike `engine/`'s modules, this isn't a slice waiting its turn
in §9's migration order; it's a standing decision. Revisit only if the
render code's size or a genuine reuse need (e.g. sharing it with another
shell) makes the inliner worth building.

A `capacitor/` directory also exists, outside this tree entirely: an optional
native iOS/Android wrapper around the built `index.html`, with its own
`package.json` so its dependencies (real ones — a native WebView shell) never
touch what ships to the browser. See `capacitor/README.md`. It has no bearing
on anything above; the web version is still the primary target.

### Why a build step

The engine is written as ES modules so Node can import it directly in tests. Browsers refuse to load ES modules over `file://`, and design value #2 says Eel Shock stays a single file you can double-click or email to a kid. Those two facts are irreconcilable without a build.

So `build.mjs` concatenates the engine modules into one scope, exposes them to the shell as `Engine`, and writes either the committed root `index.html`, `dist/web/index.html`, or `dist/app/index.html`. There is still **no *bundler*** in the traditional sense — nothing is tree-shaken, transpiled, or module-resolved; the output is plain HTML/CSS/JS, and the build is a small amount of readable Node with no build-tool packages behind it. The target builds differ only by an injected `BUILD_TARGET` constant reserved for small shell integrations; gameplay and progression code stay shared.

Since the WebGL renderer (#85), `build.mjs` also splices one pinned, offline vendored library — PixiJS's built bundle at `vendor/pixi.min.js` — into its own `<script id="vendor-pixi">` block, verbatim, never through `bundleEngine()`'s regex transform (which is written only for `src/engine/`'s hand-authored export style and would mangle a real third-party UMD bundle). A SHA-256 pinned in `vendor/PIXI_VERSION` is checked on every build and guards against the committed file drifting or being hand-edited outside the documented update procedure. See `vendor/README.md` for that procedure, and §8's vendoring guardrail for what this carve-out does and doesn't permit.

Consequences to respect:

- **Never hand-edit the root `index.html`.** Edit `src/index.html` or `src/engine/**`, then `npm run build`.
- **The built `index.html` is committed.** GitHub Pages serves it and people double-click it. `npm run check` fails if it is stale.
- **The `dist/` targets are derived.** Build them with `npm run build:web` and `npm run build:app`; do not commit or hand-edit them.
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

**Stored data is the minimum:** id, score, level, duration, the latest catalogue
skin id and timestamps. No IP addresses, no user agents, nothing a person
typed. The skin is presentation only: the Worker validates it against the
catalogue and it neither proves nor grants ownership.

**Leaderboard rivals reveal no more identity than the board.** `/rivals`
returns a server-derived anonymous tag and validated skin id, never the stored
UUID. The shell keeps that small roster in memory only and uses the existing
generated names/colours whenever it is empty or offline. A player is represented
there only after opting in and completing an accepted run; `/forget` deletes
both their score and appearance profile.

**Score and level are two boards, kept independently.** A player's top score
and their deepest level are often different runs — points alone only ever buy
the first boss (`scoreLevelCap`), so a long, careful climb can be a low-scoring,
high-level run and vice versa. `topRows`/`rankOf` in `leaderboard.js` take a
`metric` parameter so client and Worker share one sort rule for either board,
and the Worker's `handleSubmit` tracks each metric's best with its own
`Math.max` against the existing row — never a single `if (score > existing)`
branch, which would silently drop a level improvement on a run whose score
didn't also improve. The home preview and the Top 25 screen each show a
Points/Level tab pair; the death screen's board stays score-only by design,
though it still submits `level` so every run reaches both boards.

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
`minLevel` — checked against the deepest level the player has ever reached, so
the shop is a reason to go down rather than to grind fish in the shallows. A
skin's own `minLevel`, when it has one, wins over its tier's — the four Hero
skins each open at their own depth (8/9/10/11) rather than sharing the tier's
single Level 15 gate, and every Elements skin (`element` tier, between
Metallic and Gemstone) does the same, deepening with how dramatic its finish
is rather than climbing a flat ladder. `levelFor(skin)` is the one place this
is decided; everything else (`buySkin`, `skinStatus`, `nextSkinToBuy`) already
routes through it and needed no change when the per-skin override was added.
Two rules keep the gate from turning cruel: it is on *buying* only, and the
free starting skin is exempt.

A themed finish (`skin.fx`, e.g. Water's `"ripple"`) works the same way `gem`
and `sheen` already do: pure data in `skins.js`, drawn by a matching function
in the shell's `SKIN_FX` table (`src/index.html`, above `drawEelBody`). Every
one of those functions is a stateless function of `nowMs` and a point's own
index — no stored state, no `Math.random` — which is what lets the shop's
small preview canvas run the exact same function as the live game and get an
identical result, and what keeps reduced motion showing one still frame
instead of going blank.

### Material vs. fx

`skin.material` and `skin.fx` split one question two ways: material is what
the eel's surface is *made from* (organic, brushed metal, stone, crystal,
water, ...); fx is the animated effect layered on top of it. Earth is
`material:"stone"` + `fx:"cracks"`; Gold is `material:"brushedMetal"` +
`sheen:0.78`. The engine's `resolveMaterial(skin)` (`src/engine/skins.js`)
normalises a bare string, an object (`{type, strength, scale}`), or nothing
at all into one shape, falling back to a shared frozen `organic` default for
anything unrecognised — same never-throw contract as `wearableSkin` falling
back to the starting skin. The shell mirrors this with its own `SKIN_MATERIAL`
dispatch table and a second, independent fallback to organic, so the two
sides can never crash even if they briefly drift.

Every eel gets a **universal baseline** first — `drawBodyShading`/
`drawHeadShading` lay down three hue-agnostic bands (a dark underside, a
broad soft highlight, a narrow specular streak) before any material or `fx`
touches the body — which is what makes even a bare `organic` eel read as
rounded and wet rather than a flat colour fill; `sheen` (`fxSheen`) then
adds *more* shine on top of that floor rather than carrying the whole
three-dimensional read by itself.

Every material in the catalogue is built from one shared primitive,
`bodyRibbon(ctx2d, pts, bodyLength, radius, from, to, style, k0, k1)`: a
tapered filled ribbon walking a slice of the body (`k0` to `k1`, default the
whole thing) along one signed local-radius offset and back along another,
closed and filled once. Ribbons fill with `rgba(0,0,0,a)`/`rgba(255,255,255,a)`
rather than the skin's own hue, so material shading composes for free with
`accent` banding, `fade`, `iridescent` and a bare rival's `skinFromHue()`
colour without any of them needing to special-case it. A shared, pooled
projection of the sampled body (`SKIN_FX_POOL`/`poolPoint`, mutated in place
rather than reallocated) carries each point's cumulative on-body distance as
`s` alongside its screen position `i` — structured materials (crystal's
facets, charged's veins) size themselves against `s`, not raw index, which
is what keeps the shop preview's 46 fixed points and the game's ~250 sampled
points reading as the same apparent grain rather than two different scales
of the same pattern. `drawSkinMaterial`'s `detail` parameter (1 for the
player and the shop preview, lower for a rival) is the same "gracefully
simplify as a last resort" idea `fx` cheapening already uses for the
up-to-14-rivals-on-screen case.

The Legends tier (Orbweaver, Razorback, Red Rogue, Voidbond — above Heroes,
`tier: "legend"`) is where this all generalised past the skins the material
system was originally built for: three genuinely new materials (`chitin`,
`scarred`, `worn`), one material reused unmodified at a different
`strength`/`scale` (Voidbond's `liquid`, proving the reuse rather than a
fork), and the first skins to routinely carry **two** independent marks —
one body-marks-section decoration, one `drawEelHead` eye-chain treatment —
the same way Eel-symbiote's `["emblem", "stare"]` already did, rather than
fusing unrelated visual concerns into a single flag. Legends are also
player-only in the same sense every hero and bespoke `fx` already is:
`skinFromHue` (what rivals wear) never sets `material` beyond `organic`,
so a Legend's cost is paid by at most one eel on screen a frame, never all
fourteen.
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
npm ci
cd worker
../node_modules/.bin/wrangler d1 execute eelio --remote --file=./schema.sql   # create the table, once
../node_modules/.bin/wrangler deploy                                          # prints the URL for LEADERBOARD_URL
```

Wrangler is a pinned root devDependency (see `package.json`), not fetched fresh via `npx` at deploy time.

Two things that look like secrets and are not: the D1 database id and the
Worker's URL. The URL ships in `index.html` to every player, so it belongs in
`src/index.html` where the build can see it — putting it in a secret would only
mean the committed `index.html` no longer matches its source, which is the one
thing `npm run check` exists to prevent. The API token is the only real secret
here, and nothing in the repo ever reads it.

The D1 database is `eelio`; its binding and id are in `worker/wrangler.toml`.

Wrangler reports anonymous usage telemetry to Cloudflare by default. It concerns
the CLI, not players, but given design value #1 it is worth knowing you can turn
it off with `./node_modules/.bin/wrangler telemetry disable` or `WRANGLER_SEND_METRICS=false`.

---

## 8. Conventions & guardrails

- **Purity is non-negotiable in `engine/`.** Reaching for `document`, `Math.random`, or `performance.now()` inside `engine/` means stop and inject it instead.
- **Never hand-edit the root `index.html`.** It is generated. Your change will be silently overwritten by the next build.
- **Rebuild before committing.** `npm run check` fails on a stale `index.html`.
- **Tunables live in `config.js`**, not scattered as magic numbers, so tests can pin them and balance changes stay in one place.
- **One engine module = one unit spec.** New engine file ⇒ new `test/*.test.js`. Add it to `ENGINE_MODULES` in `build.mjs` too, in dependency order.
- **Don't unit-test the renderer.** Whether Canvas 2D or WebGL/Pixi, it's validated by eye (Playwright screenshots during development, never a committed visual-regression suite). Keep logic *out* of it so there's nothing there worth testing.
- **Sound and haptics are shell-only, same as the renderer.** `AudioContext` and
  `navigator.vibrate` are banned in `engine/` for the same reason `Math.random`
  is — and `test/build.test.js`'s sandbox has neither, so even a top-level
  reference in the shell fails the build. Both are touched only lazily, inside
  a function, feature-detected with `typeof`. Every sound is a named entry in
  one `SFX` table triggered through `fx(name)`, rather than `tone()` calls
  scattered at each event site — the whole palette stays readable, and
  rebalanceable, in one place. `STORE.muted` follows the `joined` boolean idiom
  exactly (absent ⇒ not muted).
- **Anything random in `engine/` takes an `rng` argument** — `rollPresent(rng)`, never `Math.random()`. The shell passes the real thing.
- **Determinism:** every test that touches randomness seeds the RNG. No test may depend on wall-clock time or real randomness.
- **No *network-fetched* runtime dependency ships to the browser.** `vitest` and `cucumber` remain `devDependencies` only, never shipped. As of #85, PixiJS is the one deliberate exception to "no libraries reach the browser" — it reaches the browser as vendored, pinned, hash-checked static text inlined at build time (`vendor/pixi.min.js`), never as a live `npm` dependency resolved into the shipped file and never fetched from a CDN. `test/build.test.js` still asserts the shipped file loads nothing external over the network (no `<script src=`, no bare `https?://` outside the one documented `LEADERBOARD_URL` exception) — a vendored library must pass that same bar, not weaken it. Don't add a second vendored library without equally deliberate sign-off; this is a carve-out for the renderer specifically, not a general license to add frameworks.
- **The leaderboard server derives the player's name; it never accepts one.** See §4.
- **Nothing the leaderboard needs may become something the game needs.** With no
  server configured, or no network, the game must play exactly as it does today.
- **Small commits, green suite.** Don't commit red.
- **Preserve the design values in §1.** Reject changes that add ads, tracking, accounts, or a *network-fetched* runtime dependency. A vendored, pinned, offline library is only acceptable when it's inlined into the shipped file (never `src=`'d, never CDN-loaded) and reviewed deliberately, as PixiJS was for the WebGL renderer (#85) — that is the bar for any future addition too, not an opened door.

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

`vector.js` exists, but only as new functions a feature needed (the boss sonar's
`angleTo`/`distanceTo`) — the shell's own `dist2`/`angLerp`/`clamp` are still
inline and waiting for their slice, same as before. Existing, not extracted.

`movement`, `identity`, `leaderboard`, `session`, `bank`, `skins`, `minigames` and `progress` sit
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
- **Surfacing instead of dying loses that dive's stats, same as it already loses the score and playtime.** `stats.js`'s per-event counters only persist at `die()`; a `paused -> home` "surface" skips that entirely. `dives` is the one exception — it's counted and written the instant a dive starts, so "you dove" is never lost even when the rest of that dive's tally is.
- **The daily challenge is shared without a server, which is also its limit.** Every player computing the same UTC date gets the identical challenge (`engine/challenges.js`'s `challengeForDate` is pure and date-seeded) — that is real sharing, not a trick. What it cannot do is show one player how another is doing: progress is tracked purely against that browser's own `stats`, so "competition" here means everyone chasing the same goal, not a visible leaderboard for it. Adding one would need the server this feature deliberately avoids.
- **`src/index.html` is still a monolith** — everything except the extracted engine modules. That is expected; see §9.
