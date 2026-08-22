# Eel Shock — native wrapper (Capacitor)

Wraps the shared app artifact at `../dist/app/index.html` in a native WebView
for iOS and Android, via [Capacitor](https://capacitorjs.com/). This is a separate,
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
npm ci
npx cap add ios       # needs Xcode, macOS only
npx cap add android    # needs Android Studio
```

The pinned Capacitor 8 toolchain requires Node.js 22 or newer. GitHub Actions
already uses Node 22; use the same supported baseline on release machines.

`ios/` and `android/` are currently generated locally and gitignored. A later
release-automation slice of #144 will decide when those projects become signed,
versioned release inputs. Icons, splash screens, signing identities and store
listings are outside this build-foundation slice.

## Every time the web game changes

```bash
npm run sync:app   # at the repo root
```

This runs `build:app`, stages `dist/app/index.html` in `capacitor/www`, then
runs `cap sync`. From inside this directory, `npm run sync` performs the same
fresh-build flow. `www/` and `dist/` are derived and must never be edited by
hand.

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

All Capacitor packages are pinned to the same exact version and captured in
`capacitor/package-lock.json`. Use `npm ci`; update the four packages together
in a reviewed change rather than resolving floating versions during a release.
