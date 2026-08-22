import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("production web deployment", () => {
  it("serves only the web build on the eelshock.com custom domain", () => {
    const config = JSON.parse(read("wrangler.web.jsonc"));
    expect(config.name).toBe("eel-shock-web");
    expect(config.assets).toMatchObject({
      directory: "./dist/web",
      not_found_handling: "none",
    });
    expect(config.routes).toEqual([{ pattern: "eelshock.com", custom_domain: true }]);
  });

  it("deploys from main with the locked local Wrangler", () => {
    const workflow = read(".github/workflows/web.yml");
    expect(workflow).toContain("branches: [main]");
    expect(workflow).toContain("npm run check");
    expect(workflow).toContain("npm run build:web");
    expect(workflow).toContain("./node_modules/.bin/wrangler deploy --config wrangler.web.jsonc");
    expect(workflow).not.toMatch(/npx|wrangler@/);
  });
});

describe("mobile release preparation", () => {
  it("runs only for semantic version tags and never publishes a store release", () => {
    const workflow = read(".github/workflows/mobile-release.yml");
    expect(workflow).toContain('"v[0-9]+.[0-9]+.[0-9]+"');
    expect(workflow).toContain("npm run build:app");
    expect(workflow).toContain("platform: android");
    expect(workflow).toContain("platform: ios");
    expect(workflow).toContain("cap telemetry off");
    expect(workflow).toContain("cap sync ${{ matrix.platform }}");
    expect(workflow).not.toMatch(/\bfastlane\b|play-console|app-store-connect|gradlew|xcodebuild/i);
  });
});
