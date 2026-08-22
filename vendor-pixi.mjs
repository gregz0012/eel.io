// Copies PixiJS's minified UMD build from node_modules into vendor/, scrubbed
// of every network-reachable URL, and pins its version + SHA-256 hash so
// test/build.test.js can catch silent tampering or drift.
//
// This file is the update procedure for vendor/pixi.min.js — see
// CLAUDE.md's "why a build step" section and vendor/README.md. Run it after
// bumping the pixi.js devDependency:
//
//   npm install --save-dev pixi.js@<new-version>
//   node vendor-pixi.mjs
//   npm run build && npm run check

import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, "node_modules/pixi.js/dist/pixi.min.js");
const pkg = JSON.parse(readFileSync(join(root, "node_modules/pixi.js/package.json"), "utf8"));

let js = readFileSync(src, "utf8");

// Pull the /*! ... */ license banner out into a sidecar file rather than
// shipping it inline — it carries an http:// URL that would otherwise trip
// test/build.test.js's "no external resources" check. It sits after some
// minified helper declarations, not at offset 0, so search rather than anchor.
const bannerMatch = js.match(/\/\*![\s\S]*?\*\//);
const banner = bannerMatch ? bannerMatch[0] : "(no banner found — check pixi.min.js's header format)";
if (bannerMatch) js = js.slice(0, bannerMatch.index) + js.slice(bannerMatch.index + bannerMatch[0].length);

// Drop the trailing sourcemap comment — we don't ship pixi.min.js.map.
js = js.replace(/\/\/# sourceMappingURL=.*$/m, "").trimEnd();

// Neutralize every remaining network-reachable string PixiJS's own source
// carries — a version banner it console.logs once on first Application use
// (cosmetic, references pixijs.com), and the default CDN URLs for the
// optional Basis/KTX compressed-texture transcoders (we never load
// compressed textures, and leaving live jsdelivr URLs in the file would be
// a standing "no network fetch" landmine even though nothing calls them
// today). Blank out every http(s) URL except the w3.org XML namespace URIs
// Pixi genuinely needs at runtime (e.g. for SVG/XHTML element creation) —
// generic rather than pattern-matched against exact surrounding grammar,
// since that grammar is a version-to-version implementation detail and
// this only needs to guarantee "no live URL survives," not preserve any
// particular cosmetic message.
const before = js;
js = js.replace(/https?:\/\/(?!www\.w3\.org)[^\s"'`),]*/g, "");
if (js === before) {
  throw new Error("vendor-pixi.mjs: no network URL found to strip — pixi.js's source shape changed, re-check this script's assumptions before vendoring");
}

const leftoverUrl = js.match(/https?:\/\/(?!www\.w3\.org)\S+/);
if (leftoverUrl) {
  throw new Error(`vendor-pixi.mjs: a network URL survived scrubbing: ${leftoverUrl[0]}`);
}

const hash = createHash("sha256").update(js, "utf8").digest("hex");

writeFileSync(join(root, "vendor/pixi.min.js"), js);
writeFileSync(join(root, "vendor/pixi.min.js.LICENSE.txt"), banner + "\n");
writeFileSync(join(root, "vendor/PIXI_VERSION"), `${pkg.version} sha256:${hash}\n`);

console.log(`Vendored PixiJS ${pkg.version} (${js.length} bytes, sha256:${hash.slice(0, 12)}...)`);
