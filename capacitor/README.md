# Eel Shock — native wrapper (Capacitor)

Wraps the built [`../index.html`](../index.html) in a native WebView for iOS
and Android, via [Capacitor](https://capacitorjs.com/). This is a separate,
additive project: nothing here touches `src/**`, `build.mjs`, or the test
suite, and none of its dependencies ship to the browser version of the game.

Eel Shock plays fine as a web page — this wrapper exists only for players who
want it as an installable app (offline-first, an icon on the home screen,
haptics that iOS/Android are stricter about outside a WebView). The web
version stays the primary target, and this directory can be deleted at any
time without affecting it.

## Setup (once per machine)

```bash
cd capacitor
npm install
npx cap add ios       # needs Xcode, macOS only
npx cap add android    # needs Android Studio
```

`ios/` and `android/` are the generated native projects. They're gitignored —
`npx cap add` regenerates them from `capacitor.config.json` and the contents
of `www/`, so there's nothing platform-specific to keep in version control
here. Icons, splash screens, the app's signing identity, and store-listing
details (screenshots, description, age rating) all live in those generated
projects or in App Store Connect / Google Play Console directly — none of
that is scoped by this PR.

## Every time the web game changes

```bash
npm run build     # at the repo root — regenerates index.html from src/
cd capacitor
npm run sync       # copies index.html into www/, then npx cap sync
```

`npm run sync` (or `open:ios` / `open:android`, which also open the native
IDE) always copies the *root* `index.html` fresh — `www/` is derived, never
edited by hand, and is gitignored for the same reason the root `index.html`
is not: one is the single source of truth, the other is just this wrapper's
local copy of it.

## Building and shipping

```bash
npm run open:ios       # opens Xcode — build/run/archive from there
npm run open:android   # opens Android Studio
```

Everything past that (signing certificates, provisioning profiles, App Store
Connect / Play Console submission) is standard native app tooling, outside
what a Capacitor config can automate.

## Why a separate `package.json`

`@capacitor/core`, `@capacitor/ios`, and `@capacitor/android` are real
runtime dependencies — but of the *native shell*, not of the page loaded in
a browser. Keeping them in their own `capacitor/package.json` means the root
project's "zero runtime dependencies ship to the browser" guarantee
(see [`../CLAUDE.md`](../CLAUDE.md) §1) stays literally true: nothing here is
ever `npm install`ed at the repo root, and `index.html` remains exactly what
it always was.
