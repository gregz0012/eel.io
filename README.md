# 🌊 Eel Shock — deep sea eel

A small, ad-free, single-file browser game in the spirit of *slither.io* / *snake.io*, but set in the deep sea. You're a young electric eel: eat fish, grow, bite chunks off rivals, dodge (or shock and devour) predators, and fight your way up through the boss guarding every level.

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
your eel" on the home screen. The shop is grouped into seven sections. Volt is
yours from the start; after that:

| Section | Skins | Price each | Opens at |
| --- | --- | --- | --- |
| Standard | Coral, Orchid, Sky, Lime | 250 | level 2 |
| Metallic | Copper, Iron, Gold, Platinum | 500 / 1,000 / 2,000 / 5,000 | level 5 |
| Elements | Water, Air, Earth, Fire, Lightning | 3,000 – 7,500 | level 4 – 8, one per skin |
| Gemstone | Emerald, Ruby, Diamond | 7,500 | level 10 |
| Special | Bioluminescent, Toxic, Frost, X-Ray, Abyss, Lava, Ghost, Prism, Void | 6,000 – 12,500 | level 6 – 12, one per skin |
| Heroes | Spider, Eel-wolf, Eel-symbiote, Eel-pool | 10,000 | level 8 – 11, one per skin |
| Legends | Orbweaver, Razorback, Red Rogue, Voidbond | 12,500 – 15,000 | level 10 – 13, one per skin |

Every skin opens at its own depth now, not just its section's — the four
heroes each unlock at a different level, deepest first, so reaching the top
of the shop is a ladder rather than one distant step. Points are still only
half of it: a skin stays sealed until you have been deep enough to reach it,
however rich you are. Anything you can buy right now is lit up with its
price; anything you can't afford is dimmed and padlocked; anything still out
of your depth shows the level it opens at instead of a price. Tap a skin to
see it swimming, then buy or wear it with the button beside it.

Volt is the exception and always will be — the eel you start in is never
locked, and a skin you have bought stays wearable forever whatever happens
afterwards.

The metals catch the light — the dearer the metal, the harder it shines, so
Platinum is a mirror where Copper is a soft glow. Gems shimmer. The Elements
each carry their own animated finish — Water ripples, Air swirls in a faint
vortex, Earth cracks with a glow, Fire embers, Lightning arcs — and every
Special skin is a variant of one of those five: Bioluminescent's fixed glowing
spots, Toxic's murkier bubble trail, Frost's crystalline glints, Abyss fading
toward its own tail, Lava's slower and heavier cracks, Ghost trailing a soft
afterimage, Prism's drifting rainbow hue, and Void flecked with tiny stars.
X-Ray is the signature skin: a full stylised skeleton — skull, ribs, a
tapering spine — glowing faintly inside a dark translucent body, dimming and
brightening with your real zap charge and flaring the instant you fire one.
Heroes are banded in
two colours and each carries its own flourish — Spider is webbed, Eel-wolf
has a horned cowl masked through the eyes, Eel-pool wears a masked stare and
a pair of crossed swords on its back, and Eel-symbiote is tar-black with
a white spider across its back, a toothy grin and a pale stare.

Legends are the deepest and priciest tier, and each is its own original
creature rather than a recoloured Hero: Orbweaver is deep crimson chitin
with fine copper silk strands and an amber many-eyed gaze; Razorback is
burnt amber and scarred, with fin-ridged head spikes that catch the light
when you're sprinting; Red Rogue is rust-red and deliberately lopsided —
a worn eye patch, a single scavenged blade, one crooked strap; Voidbond
reads almost black at rest and reveals a living indigo-and-teal shimmer
wherever it bends, with slit eyes and a scattering of glowing sensory
spots. Buying deducts the points — but a skin you have bought is yours
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
| 🎁 Present | Could be points, a shield or a full zap meter — or lost points, or a predator on your tail |
| 👑 Boss | Guards every level from 2 on — slower than a predator, and takes more hits every other level |

## Mechanics

- **Growth = power.** As you get longer you move slightly faster, so you can always run down smaller eels but never bigger ones. Past a certain size, predators and rivals stop hunting you.
- **Your body is a weapon.** A rival eel that crashes head-first into your body dies.
- **Bite, don't just swallow.** Hitting a rival's tail chops it off — the rival shrinks and swims on, and the severed piece becomes energy.
- **The zap stuns everything** nearby (any predator, any eel) for a few seconds. Stun a predator, then ram it to eat it. A boss needs one stun-and-ram per hit, and that count rises every other level — or take the hits behind a starfish.
- **Bosses are the way up.** Points get you to level 2. After that the only way to level is killing the boss guarding the one you are on. Each level-up buys you a breather before the next boss arrives, and it also waits on points earned in the level — use the gap to find a starfish and charge the zap.
- **Levels ramp difficulty.** A new predator joins every 2 levels.
- **Your deepest level is remembered** between dives, even though every dive starts again at level 1.
- **Presents are a gamble.** Most are a treat; some are not — a nasty one costs you points or drops a predator on your tail, but nothing in a present can ever take a level off you.
- **Mind your own tail.** Cross over yourself and you'll bite your own tail off, losing length and points.
- **Getting eaten takes you back to the surface**, not straight into another dive — so you can change your eel before you go again.
- **A calming break, every so often.** After about fifteen minutes of play, dying offers one of six short activities — square breathing, gathering a few kind words, a gentle stretch, popping a few gratitude bubbles, a Good Deed Quest (go and actually do one small kindness, with an uncapped "give me another" if the one offered doesn't fit right now), or Kind Choices (pick the kind response to a small everyday scenario — an unkind pick costs nothing and just asks you to try again) — worth 250 banked points. It's optional, never added to a run's score, and skipping it just leaves it waiting for next time.

## Run it locally

Just open `index.html` in any modern browser. That's it — no server needed.

Or serve it (optional):

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Leaderboard

Optional, opt-in, and anonymous. Your browser keeps a random id and turns it
into a name like `AmberLantern-4721` — the same name every time you come
back. The home screen shows that name so you know who you'd be before you
ever join; nothing is sent anywhere until you actually press "Join the
board". There is no account, no sign-in, and nothing about your device or
about you is collected. "Leave the board" deletes your row, forgets the id,
and gives you a new name next time.

The home screen carries a top-5 preview of the board, with your own row picked
out if you're on it — or a quiet "you're #N" if you're close but not quite in
the top five. "See top 25" opens the full board. Both load in the background:
the home screen is fully usable — you can dive straight away — before either
has a chance to answer.

Some rival eels borrow the anonymous names and most recently submitted skins
of leaderboard players. Only the safe generated tag and catalogue skin are
published—never the underlying player id. If the board is empty or offline,
rivals keep using locally generated names and colours as before.

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

## Native app (iOS / Android)

Eel Shock plays fine as a web page — but if you want it installable, the
[`capacitor/`](capacitor/) directory wraps the built `index.html` in a
[Capacitor](https://capacitorjs.com/) WebView for iOS and Android. It's a
separate, additive project: nothing in it touches `src/**`, `build.mjs`, or
the test suite, and none of its dependencies ship to the browser version.
See [`capacitor/README.md`](capacitor/README.md) for setup.

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
