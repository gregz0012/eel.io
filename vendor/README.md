# vendor/

One vendored, pinned, offline third-party library: PixiJS, used for the WebGL
world renderer (issue [#85](https://github.com/gregz0012/eel.io/issues/85)).
See `CLAUDE.md` §1 (design value #2) and §8 for why this exists and what it
does and doesn't permit — it is a deliberate, narrow exception to "no
frameworks or libraries reach the browser," not an opened door.

## What's here

- `pixi.min.js` — PixiJS's official minified UMD build, copied verbatim from
  `node_modules/pixi.js/dist/pixi.min.js`, with every network-reachable URL
  scrubbed out (a cosmetic version banner and the default CDN URLs for the
  optional Basis/KTX compressed-texture transcoders, which this game never
  uses). Spliced into `index.html` by `build.mjs`, in its own `<script
  id="vendor-pixi">` block, never through the engine bundler.
- `pixi.min.js.LICENSE.txt` — the `/*! ... */` license banner stripped out of
  the JS file (MIT, plus a link to the license text) — the attribution lives
  here instead of inline, since a literal URL in the shipped file would trip
  `test/build.test.js`'s "no external resources" check.
- `PIXI_VERSION` — the exact upstream version and a SHA-256 hash of the
  scrubbed `pixi.min.js`. `build.mjs` checks this hash on every build and
  refuses to build if it doesn't match — a tamper/drift guard, since a
  vendored file doesn't get `npm audit`'s protection the way a real
  dependency would.

## Updating PixiJS

```bash
npm install --save-dev pixi.js@<new-version>
node vendor-pixi.mjs
npm run build && npm run check
```

`vendor-pixi.mjs` (repo root) does the copy, strips every non-w3.org
`http(s)://` URL it finds, and rewrites `PIXI_VERSION`'s pin. It throws if the
scrubbing regexes stop matching anything (a sign PixiJS's bundle shape
changed enough to need a look) or if a URL survives the scrub.

Never hand-edit `pixi.min.js` — the hash check in `build.mjs` will catch it
and fail the build, which is the point.
