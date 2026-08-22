// Stages the shared app-target build in Capacitor's web directory. The source
// artifact is produced by `npm run build:app` at the repository root; this
// script only copies it and never edits generated HTML.
import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, "..", "dist", "app", "index.html");
const destinationDirectory = join(here, "www");
const destination = join(destinationDirectory, "index.html");

mkdirSync(destinationDirectory, { recursive: true });
copyFileSync(source, destination);
console.log(`Staged ${source} -> ${destination}`);
