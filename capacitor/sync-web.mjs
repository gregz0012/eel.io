// Copies the built root index.html into this project's web directory.
// Capacitor's webDir needs a real folder to point at, and the root
// index.html is a generated build artifact (see ../build.mjs) — this never
// edits it, only copies it. Run this (or `npm run sync`) after every
// `npm run build` at the repo root, and before `npx cap sync`.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "..", "index.html");
const destDir = join(here, "www");
const dest = join(destDir, "index.html");

mkdirSync(destDir, { recursive: true });
writeFileSync(dest, readFileSync(src, "utf8"));
console.log(`Copied ${src} -> ${dest}`);
