# 🌊 Fin.io — deep sea eel

A small, ad-free, single-file browser game in the spirit of *slither.io* / *snake.io*, but set in the deep sea. You're a young electric eel: eat fish, grow, bite chunks off rivals, dodge (or shock and devour) predators, and take down a boss every ten levels.

No accounts, no ads, no tracking, no runtime dependencies. The game ships as one HTML file that runs entirely offline.

**▶️ Play:** https://gregz0012.github.io/eel.io/ *(after enabling GitHub Pages — see below)*

## How to play

- **Steer** with your mouse or finger — the eel follows your pointer.
- **Sprint** by holding the mouse button / keeping your finger down (costs a little length).
- **Shock** with the big **ZAP** button (bottom-right) or the **Space** bar once the meter is charged.
- **Pause** with **P** or **Esc**, or the button in the top-right corner.

The full rules — what everything in the sea does — are on the **How to play**
page, behind the button on the home screen.

## Your eel

Every dive's score is **banked**. Spend it in the skin shop — tap "Change
your eel" on the home screen. The shop is grouped into four sections. Volt is
yours from the start; after that:

| Section | Skins | Price each |
| --- | --- | --- |
| Standard | Coral, Orchid, Sky, Lime | 250 |
| Metallic | Copper, Iron, Gold, Platinum | 500 / 1,000 / 2,000 / 5,000 |
| Gemstone | Emerald, Ruby, Diamond | 7,500 |
| Heroes | Spider, Eel-wolf, Eel-symbiote, Eel-pool | 10,000 |

Anything you can afford right now is lit up with its price; anything you
can't is dimmed and padlocked. Tap a skin to see it swimming, then buy or wear
it with the button beside it.

The metals catch the light — the dearer the metal, the harder it shines, so
Platinum is a mirror where Copper is a soft glow. Gems shimmer. Heroes are
banded in two colours and each carries its own flourish — Spider is webbed,
Eel-wolf has a horned cowl masked through the eyes, Eel-pool wears a masked
stare and a pair of crossed swords on its back, and Eel-symbiote is tar-black with
a white spider across its back, a toothy grin and a pale stare. Buying deducts the points — but a skin you have bought is yours
forever, however empty the bank gets afterwards.

Diving costs a few points too. If you can't cover it, the dive is free: you can
always play.

Your bank, your skins and your best score are kept on your own device and never
sent anywhere.

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
| 🎁 Present | Could be points, a shield or a full zap meter — or lost points, a predator on your tail, or a level taken off you |
| 👑 Boss | Appears every 10 levels — slower than a predator but takes two hits |

## Mechanics

- **Growth = power.** As you get longer you move slightly faster, so you can always run down smaller eels but never bigger ones. Past a certain size, predators and rivals stop hunting you.
- **Your body is a weapon.** A rival eel that crashes head-first into your body dies.
- **Bite, don't just swallow.** Hitting a rival's tail chops it off — the rival shrinks and swims on, and the severed piece becomes energy.
- **The zap stuns everything** nearby (any predator, any eel) for a few seconds. Stun a predator, then ram it to eat it. Stun a boss and land two hits.
- **Levels ramp difficulty.** A new predator joins every 2 levels; a boss is unleashed every 10.
- **Presents are a gamble.** Most are a treat. Some are not — and one of them is the only thing in the game that can take a level off you.
- **Mind your own tail.** Cross over yourself and you'll bite your own tail off, losing length and points.
- **Getting eaten takes you back to the surface**, not straight into another dive — so you can change your eel before you go again.

## Run it locally

Just open `index.html` in any modern browser. That's it — no server needed.

Or serve it (optional):

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Leaderboard

Optional, opt-in, and anonymous. Your browser generates a random id the first
time you join and turns it into a name like `AmberLantern-4721` — the same name
every time you come back. There is no account, no sign-in, and nothing about
your device or about you is collected. "Leave the board" deletes your row and
forgets the id.

The game does not need it: with no server configured, or with no internet, it
plays exactly the same and your best score is still kept on your own device.

### Deploying it from GitHub (no laptop needed)

The [`leaderboard`](.github/workflows/leaderboard.yml) workflow applies the D1
schema and deploys the Worker in [`worker/`](worker/) for you. It runs when
anything under `worker/` or `src/engine/` changes on `main`, and you can also
start it by hand: **Actions → leaderboard → Run workflow**.

It needs two repository secrets — **Settings → Secrets and variables → Actions
→ New repository secret**:

| Secret | Where it comes from |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens → Create Token. Use the **Edit Cloudflare Workers** template, and add **D1 → Edit** so it can create the table too. |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → Workers & Pages → right-hand sidebar (or the hex string in the dashboard URL). |

The workflow refuses to start if either is missing, and it runs the unit tests
before it deploys, so a Worker with red rules never ships.

When it finishes, open the run's summary — it prints the Worker's URL. Paste
that into `LEADERBOARD_URL` in `src/index.html` and run `npm run build`. That
URL isn't a secret; it ships in the HTML to every player, which is why it lives
in the source rather than in a secret.

### Or from a laptop

```bash
cd worker
npx wrangler d1 execute eelio --remote --file=./schema.sql   # create the table, once
npx wrangler deploy                                          # prints the Worker's URL
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

`npm run check` also runs on every push, via the
[`check`](.github/workflows/check.yml) workflow.

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
