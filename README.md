# 🌊 Voltfin — deep sea eel

A small, ad-free, single-file browser game in the spirit of *slither.io* / *snake.io*, but set in the deep sea. You're a young electric eel: eat fish, grow, bite chunks off rivals, dodge (or shock and devour) predators, and take down a boss every ten levels.

No accounts, no ads, no tracking, no runtime dependencies. The game ships as one HTML file that runs entirely offline.

**▶️ Play:** https://gregz0012.github.io/eel.io/ *(after enabling GitHub Pages — see below)*

## How to play

- **Steer** with your mouse or finger — the eel follows your pointer.
- **Sprint** by holding the mouse button / keeping your finger down (costs a little length).
- **Shock** with the big **ZAP** button (bottom-right) or the **Space** bar once the meter is charged.

## What's in the sea

| Thing | What it does |
| --- | --- |
| 🐟 Small fish | Basic food — eat them to grow |
| 🟢 Feast orb | A whole shoal in one gulp, worth 10× |
| ✨ Energy motes | Dropped by anything that dies; they magnetise to you |
| 🐍 Rival eels | Bite their tail to shrink them, or swallow smaller ones whole. Bigger ones can eat you |
| 🦈 Predators | They'll eat you — dodge them, or shock them and swim in to devour |
| ⭐ Starfish | A shield that absorbs one hit |
| ⚡ Baby electric eel | Charges your zap meter |
| 👑 Boss | Appears every 10 levels — slower than a predator but takes two hits |

## Mechanics

- **Growth = power.** As you get longer you move slightly faster, so you can always run down smaller eels but never bigger ones. Past a certain size, predators and rivals stop hunting you.
- **Your body is a weapon.** A rival eel that crashes head-first into your body dies.
- **Bite, don't just swallow.** Hitting a rival's tail chops it off — the rival shrinks and swims on, and the severed piece becomes energy.
- **The zap stuns everything** nearby (any predator, any eel) for a few seconds. Stun a predator, then ram it to eat it. Stun a boss and land two hits.
- **Levels ramp difficulty.** A new predator joins every 2 levels; a boss is unleashed every 10.
- **Mind your own tail.** Cross over yourself and you'll bite your own tail off, losing length and points.

## Run it locally

Just open `index.html` in any modern browser. That's it — no server needed.

Or serve it (optional):

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Working on it

The shipped `index.html` is **generated** — don't edit it by hand. The sources
are `src/index.html` (the shell) and `src/engine/**` (the pure, testable game
core), and `build.mjs` inlines them into the single file the browser gets.

```bash
npm install      # dev-only tools (vitest, cucumber) — nothing ships to the browser
npm run build    # regenerate index.html from src/
npm run check    # build freshness + acceptance scenarios + unit tests
```

See [`CLAUDE.md`](CLAUDE.md) for the architecture and the BDD → TDD workflow.

## Enable the online version (GitHub Pages)

1. In this repo, go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **Deploy from a branch**.
3. Pick branch **main** and folder **/ (root)**, then **Save**.
4. Wait a minute, then visit **https://gregz0012.github.io/eel.io/**.

Because the game is named `index.html`, Pages serves it at the root URL automatically.

## Tech

Plain HTML, CSS, and vanilla JavaScript on a `<canvas>`. No frameworks, no libraries, nothing to install to play it. The only tooling is a ~90-line dependency-free build script that concatenates the source modules into the single shipped file, plus Vitest and Cucumber for the test suite.

## License

MIT — see [`LICENSE`](LICENSE). Swap it for whatever you prefer.
