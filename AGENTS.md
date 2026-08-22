# AGENTS.md — Eel Shock (eel.io)

Repository instructions for ChatGPT, Codex, and compatible coding agents.
These rules apply to the whole repository. Read this file before making changes.
`CLAUDE.md` contains the longer architectural history and rationale; consult it
when a task touches an area whose design is not fully explained here. If the two
files conflict, preserve the product values and current tested behaviour, and
flag the conflict rather than guessing.

## Product priorities

Eel Shock is a small, family-friendly, ad-free browser game inspired by
slither.io/snake.io and set in the deep sea. Protect these priorities, in order:

1. No ads, accounts, profiling, fingerprinting, or tracking.
2. Offline play and the self-contained shipped `index.html` must keep working.
3. Keep the game approachable, forgiving, and suitable for children.
4. Prefer readable, maintainable code over clever abstractions.
5. Preserve smooth performance on ordinary phones and Capacitor WebViews.

Do not add analytics, advertising, free-text public player names, device-derived
identity, or a network dependency required for the game to load or play.

## Start every task this way

1. Read the relevant issue/request and inspect the current implementation.
2. Check `git status`, the current branch, and recent commits before editing.
3. Read the relevant sections of `CLAUDE.md` for architectural context.
4. Identify whether the change is gameplay behaviour, pure engine logic,
   rendering/UI, build tooling, native packaging, or Worker/backend work.
5. Keep the change focused. Do not combine unrelated cleanup with the request.
6. Preserve user changes and avoid destructive Git operations.

For ambiguous changes that affect gameplay, privacy, persistence, purchases,
network behaviour, or architecture, ask before choosing a materially different
product direction. Renderer-only implementation details may be decided locally
when they preserve the visible request and these guardrails.

## Repository map

- `src/index.html`: source shell, DOM, input, audio/haptics, Canvas 2D and PixiJS
  rendering, game loop, and integration with the pure engine.
- `src/engine/`: deterministic, DOM-free game rules and data.
- `index.html`: generated, committed, self-contained build output. Never edit it
  by hand.
- `build.mjs`: inlines engine modules and the pinned PixiJS vendor bundle into
  the committed root web build or derived `dist/web` and `dist/app` targets.
- `vendor/`: pinned offline PixiJS distribution. Do not hand-edit it.
- `test/`: Vitest unit tests.
- `features/`: Cucumber acceptance scenarios and step definitions.
- `worker/`: optional Cloudflare Worker + D1 leaderboard backend.
- `capacitor/`: optional Android/iOS wrapper around the same built game.

The renderer intentionally remains inline in `src/index.html`. Do not extract it
into `src/render/` unless the task explicitly includes the required build-system
work and demonstrates a real reuse or maintainability benefit.

## Non-negotiable architecture rules

### Pure engine

Everything under `src/engine/` must be deterministic and testable in Node:

- No `document`, `window`, canvas, browser storage, audio, haptics, or rendering.
- No ambient `Math.random()`; accept an injected RNG.
- No `Date.now()` or `performance.now()`; accept time/date as input.
- Same state, input, time delta, and seed must produce the same result.
- Mutation is allowed where it prevents per-frame allocation, but ambient
  nondeterminism is not.
- Return descriptions of side effects; apply spawns, sounds, particles, banners,
  and screen shake in the shell.

New engine modules require a corresponding `test/*.test.js` file and an entry in
`ENGINE_MODULES` in `build.mjs`, in dependency order.

### Generated build

- Edit `src/index.html` and/or `src/engine/**`, never root `index.html`.
- Run `npm run build` after every source change.
- Commit the regenerated root `index.html` with its source.
- `npm run build:check` must report that the build is current.
- `npm run build:web` and `npm run build:app` must use the same source. Only
  small shell integrations may branch on the injected `BUILD_TARGET`; gameplay
  logic must remain shared.
- `dist/` and `capacitor/www/` are derived artifacts and are not committed.

### Dependencies and offline operation

- No network-fetched runtime dependencies.
- PixiJS is the one approved browser library: it is pinned, hash-checked,
  vendored, and inlined at build time.
- Do not add another production/runtime library without explicit approval.
- Dev-only test/build dependencies belong in `devDependencies` and must not leak
  into the shipped page.
- Never replace plain `fetch` + JSON for the optional leaderboard with a client
  SDK that becomes part of the browser runtime.

### Leaderboard and identity

- The leaderboard is opt-in and must degrade to nothing offline.
- Player identity is a locally generated random UUID, never a fingerprint.
- The server derives safe anonymous display tags and never accepts free-text
  public names.
- Store only the minimum leaderboard data already documented in `CLAUDE.md`.
- The game must never require the leaderboard or Worker to function.
- Preserve `/forget` and the ability to remove the anonymous server record.

## Gameplay invariants

Unless the task explicitly changes one of these rules, preserve them:

- Pointer-follow movement; hold to sprint at a small length cost.
- Tail bites shorten rivals and release energy; smaller rivals may be swallowed.
- A rival head hitting the player's body kills the rival.
- Zap stuns nearby eels and predators and bursts nearby fish into energy.
- Predators require a stun before being safely rammed and eaten.
- Starfish grant a one-hit shield; baby electric eels charge zap.
- Self-crossing can bite off the player's tail, with the existing neck buffer
  and cooldown.
- Presents remain weighted toward kind outcomes and hostile spawns remain a fair
  distance from the player.
- Points can reach level 2 only; later levels require defeating the level boss.
- Levels are sticky and never fall.
- Boss difficulty, breather timing, and points-to-summon pacing remain intact.
- Being unable to pay the dive fare must never prevent another dive.

Do not change collision geometry, prices, unlock levels, ownership, scoring, or
difficulty as a side effect of visual work.

## Skins and rendering

- `src/engine/skins.js` is the catalogue and source of truth for prices, tiers,
  unlock requirements, colour/material parameters, ownership, and wearability.
- `Engine.resolveMaterial(skin)` must retain its safe organic fallback.
- `Engine.wearableSkin(id, owned)` is the shell's safe path for selecting a skin.
- Ownership only increases; an owned skin is never removed because the bank or
  best level later changes.
- Skin previews and live gameplay must remain visually consistent.
- Keep Canvas 2D as the no-WebGL fallback.
- The WebGL layer renders eel bodies/heads; high-count world entities remain on
  Canvas 2D unless a measured, mobile-safe batching design justifies migration.
- Reuse materials/shaders through parameters and uniforms rather than bespoke
  per-skin render branches where practical.
- Use deterministic hashes, UVs, indices, or injected time for visual variation;
  do not use per-frame randomness for skin detail.
- Honour `prefers-reduced-motion`; a reduced-motion skin should show a stable
  still frame, not lose its visual identity.
- Avoid per-frame allocations in hot loops when a small reusable pool or typed
  buffer is practical.
- Visual changes require real-browser inspection in addition to automated tests.

Do not unit-test whether artwork “looks right.” Unit-test catalogue/material
contracts and validate visual output in a browser. Keep debug hooks and temporary
screenshots out of committed production files.

## Behaviour changes: BDD then TDD

For observable gameplay or product behaviour:

1. Add or update a concise Gherkin scenario in `features/` and see it fail.
2. Add the smallest relevant unit test in `test/` and see it fail.
3. Implement the pure rule in `src/engine/`.
4. Bind shell side effects to the returned engine result.
5. Run unit tests, BDD, build, and browser validation.

Keep Gherkin thin: acceptance behaviour only. Arithmetic, edge cases, catalogue
data, and pure-function contracts belong in Vitest. Renderer-only tweaks,
refactors, comments, and build changes do not require a new Gherkin scenario.

## Commands and required validation

```bash
npm install          # install dev dependencies
npm run build        # regenerate root index.html
npm run build:web    # write dist/web/index.html
npm run build:app    # write dist/app/index.html
npm run sync:app     # build app target and sync a configured Capacitor project
npm run build:check  # verify generated output is current
npm test             # Vitest unit suite
npm run bdd          # Cucumber acceptance suite
npm run check        # build freshness + BDD + unit tests
npm start            # serve locally on port 8000
```

Before committing any code change:

- Run `npm run build` when `src/` changed.
- Run `npm run check` and report exact results.
- For renderer/UI work, launch the game in a real browser, check the affected
  gameplay and shop-preview paths, and inspect the console for errors.
- For mobile-sensitive rendering work, reason about draw calls and allocations;
  test on a representative device when available.
- Run `git diff --check` and inspect the final diff for unrelated changes,
  temporary instrumentation, and accidental generated-file edits.

If an environment prevents a required check, do not describe the full suite as
green. State exactly what ran, what was blocked, and what substitute validation
was performed.

## Git, issues, and pull requests

- Start from current `main` and create a focused feature/fix branch.
- Keep commits small, descriptive, and green.
- Never force-push, rewrite shared history, or use destructive reset/checkout
  commands without explicit user approval.
- Do not discard unrelated local changes.
- PR bodies should explain the user-visible outcome, implementation, preserved
  invariants, and exact validation performed.
- Use `Closes #N` only when the PR fully satisfies the issue. Use `Part of #N`
  for a partial implementation.
- Do not silently close an issue whose acceptance criteria remain incomplete.
- Merge only when the user has authorized merging and required checks are green.
- After merging, confirm the PR is merged and the intended issue state is correct.

## Code review rules

When reviewing changes, prioritize findings in this order:

1. Privacy, tracking, child-safety, or offline-play regressions.
2. Broken gameplay invariants or server/client rule drift.
3. Generated `index.html` not matching source.
4. Nondeterminism or browser dependencies introduced into `src/engine/`.
5. Runtime network dependencies or unapproved shipped libraries.
6. WebGL/Canvas fallback, context-loss, reduced-motion, or mobile-performance
   regressions.
7. Missing tests for changed pure logic or unverified visual changes.

Report concrete file/line evidence and the player-visible consequence. Do not
inflate reviews with formatting preferences that CI does not enforce.

## Definition of done

A task is complete only when applicable items are true:

- Requested behaviour or visual outcome is implemented without unrelated scope.
- Existing gameplay, privacy, offline, ownership, and fallback contracts remain.
- Changed pure logic is covered by Vitest; changed behaviour has thin BDD coverage.
- Root `index.html` is regenerated and current.
- `npm run check` passes.
- Renderer/UI changes have been inspected in a real browser with no console errors.
- The final diff is clean and contains no debug-only code.
- Documentation/comments are updated when architecture or non-obvious contracts
  change.
- The PR accurately states what changed and what was validated.
