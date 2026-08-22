// Guards the build step, not the renderer: the shipped index.html must stay in
// sync with src/ and must actually execute. (An earlier monolith read a const
// before its declaration and threw on load, so the game never started at all.)
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

function gameScript() {
  const m = html.match(/<script>\n([\s\S]*?)\n<\/script>/);
  if (!m) throw new Error("no inline game script found in index.html");
  return m[1];
}

describe("built index.html", () => {
  it("is up to date with src/", () => {
    // Also exercises build.mjs's readVendorPixi() hash-pin check — a
    // hand-edited or drifted vendor/pixi.min.js makes this fail loudly,
    // same as any other build staleness.
    execFileSync("node", ["build.mjs", "--check"], { cwd: new URL("..", import.meta.url) });
  });

  it("ships the vendored PixiJS bundle in its own script block, separate from the game script", () => {
    // The vendor block deliberately carries an id attribute so gameScript()'s
    // bare-<script>-tag regex (below) skips past it — confirm that split
    // actually holds: PIXI's definition lives in its own block, and the
    // extracted game script is exactly what test/build.test.js's other
    // assertions assume it is (no module syntax, executes standalone).
    expect(html).toMatch(/<script id="vendor-pixi">[\s\S]*?<\/script>/);
    const vendorBlock = html.match(/<script id="vendor-pixi">([\s\S]*?)<\/script>/)[1];
    expect(vendorBlock).toMatch(/var PIXI\s*=/);
    expect(gameScript()).not.toMatch(/var PIXI\s*=/);
  });

  it("ships no module syntax and no external resources", () => {
    expect(gameScript()).not.toMatch(/^\s*(?:import|export)\s/m);
    expect(html).not.toMatch(/<script[^>]+src=/);
    // LEADERBOARD_URL is the one intentional exception: an opt-in endpoint the
    // shell only calls once a player presses "join", never on load. Strip
    // that one assignment before checking nothing else points off the page.
    const withoutLeaderboardUrl = html.replace(/const LEADERBOARD_URL = "[^"]*";/, "");
    expect(withoutLeaderboardUrl).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
  });

  it("produces separate web and app artifacts from the same source", () => {
    const root = new URL("..", import.meta.url);
    const dist = new URL("../dist", import.meta.url);
    rmSync(dist, { recursive: true, force: true });

    execFileSync("node", ["build.mjs", "--target", "web"], { cwd: root });
    execFileSync("node", ["build.mjs", "--target", "app"], { cwd: root });

    const web = readFileSync(new URL("../dist/web/index.html", import.meta.url), "utf8");
    const app = readFileSync(new URL("../dist/app/index.html", import.meta.url), "utf8");
    expect(web).toContain('const BUILD_TARGET = "web";');
    expect(app).toContain('const BUILD_TARGET = "app";');
    expect(web.replace('const BUILD_TARGET = "web";', 'const BUILD_TARGET = "app";')).toBe(app);
  });

  it("executes without throwing when loaded", () => {
    const ctx2d = new Proxy({}, { get: () => () => new Proxy({}, { get: () => () => {} }) });
    const makeEl = () => ({
      style: { setProperty() {} }, textContent: "", className: "", title: "",
      classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
      getContext: () => ctx2d,
      addEventListener() {}, append() {}, appendChild() {}, removeChild() {},
      querySelectorAll: () => [],
    });
    const el = makeEl();
    const sandbox = {
      document: { getElementById: () => el, createElement: () => makeEl(),
                  querySelectorAll: () => [], addEventListener() {} },
      window: { innerWidth: 800, innerHeight: 600, devicePixelRatio: 1,
                addEventListener() {}, matchMedia: () => ({ matches: false }) },
      requestAnimationFrame: () => 0,
    };
    const run = new Function("document", "window", "requestAnimationFrame", gameScript());
    expect(() => run(sandbox.document, sandbox.window, sandbox.requestAnimationFrame)).not.toThrow();
  });
});
