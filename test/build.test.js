// Guards the build step, not the renderer: the shipped index.html must stay in
// sync with src/ and must actually execute. (An earlier monolith read a const
// before its declaration and threw on load, so the game never started at all.)
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

function gameScript() {
  const m = html.match(/<script>\n([\s\S]*?)\n<\/script>/);
  if (!m) throw new Error("no inline game script found in index.html");
  return m[1];
}

describe("built index.html", () => {
  it("is up to date with src/", () => {
    execFileSync("node", ["build.mjs", "--check"], { cwd: new URL("..", import.meta.url) });
  });

  it("ships no module syntax and no external resources", () => {
    expect(gameScript()).not.toMatch(/^\s*(?:import|export)\s/m);
    expect(html).not.toMatch(/<script[^>]+src=/);
    expect(html).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
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
