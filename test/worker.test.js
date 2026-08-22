// The Worker is where a forged score is actually stopped, so it gets tested.
// D1 is stubbed with a tiny in-memory table — enough to exercise the handlers'
// decisions without a network or a real database.
import { describe, it, expect, beforeEach } from "vitest";
import worker from "../worker/index.js";
import { CONFIG } from "../src/engine/config.js";
import { tagFor } from "../src/engine/identity.js";
import { rankOf } from "../src/engine/leaderboard.js";

const L = CONFIG.leaderboard;
const ORIGIN = "https://gregz0012.github.io";
const uuid = (n) => "11111111-2222-4333-8444-" + String(n).padStart(12, "0");

function fakeDB(rows = []) {
  const profiles = [];
  return {
    rows, profiles,
    prepare(sql) {
      const stmt = {
        args: [],
        bind(...args) { stmt.args = args; return stmt; },
        async first() {
          if (/FROM scores WHERE id/.test(sql)) return rows.find(r => r.id === stmt.args[0]) ?? null;
          if (/SELECT COUNT\(\*\) AS n FROM scores WHERE score >/.test(sql)) {
            return { n: rows.filter(r => r.score > stmt.args[0]).length };
          }
          if (/SELECT COUNT\(\*\) AS n FROM scores WHERE level >/.test(sql)) {
            return { n: rows.filter(r => r.level > stmt.args[0]).length };
          }
          throw new Error("unexpected first(): " + sql);
        },
        async all() {
          if (/FROM scores LEFT JOIN profiles/.test(sql)) {
            const limit = stmt.args[0] ?? rows.length;
            return { results: [...rows]
              .sort((a, b) => b.updated_at - a.updated_at)
              .slice(0, limit)
              .map(row => ({ id: row.id, skin_id: profiles.find(p => p.id === row.id)?.skin_id })) };
          }
          if (/SELECT id, score, level FROM scores ORDER BY score DESC/.test(sql)) {
            const limit = stmt.args[0] ?? rows.length;
            return { results: [...rows].sort((a, b) => b.score - a.score).slice(0, limit) };
          }
          if (/SELECT id, score, level FROM scores ORDER BY level DESC/.test(sql)) {
            const limit = stmt.args[0] ?? rows.length;
            return { results: [...rows].sort((a, b) => b.level - a.level).slice(0, limit) };
          }
          throw new Error("unexpected all(): " + sql);
        },
        async run() {
          if (/^INSERT INTO scores/.test(sql)) {
            const [id, score, level, duration_ms, created_at, updated_at] = stmt.args;
            rows.push({ id, score, level, duration_ms, created_at, updated_at });
          } else if (/^UPDATE scores SET score/.test(sql)) {
            const [score, level, duration_ms, updated_at, id] = stmt.args;
            Object.assign(rows.find(r => r.id === id), { score, level, duration_ms, updated_at });
          } else if (/^DELETE FROM scores/.test(sql)) {
            const i = rows.findIndex(r => r.id === stmt.args[0]);
            if (i >= 0) rows.splice(i, 1);
          } else if (/^INSERT INTO profiles/.test(sql.trim())) {
            const [id, skin_id, updated_at] = stmt.args;
            const profile = profiles.find(p => p.id === id);
            if (profile) Object.assign(profile, { skin_id, updated_at });
            else profiles.push({ id, skin_id, updated_at });
          } else if (/^DELETE FROM profiles/.test(sql)) {
            const i = profiles.findIndex(p => p.id === stmt.args[0]);
            if (i >= 0) profiles.splice(i, 1);
          } else throw new Error("unexpected run(): " + sql);
          return { success: true };
        },
      };
      return stmt;
    },
  };
}

let env;
beforeEach(() => { env = { DB: fakeDB(), ALLOWED_ORIGINS: ORIGIN + ",http://localhost:8000" }; });

const post = (path, body) => new Request("https://api.test" + path, {
  method: "POST", headers: { Origin: ORIGIN, "Content-Type": "application/json" },
  body: typeof body === "string" ? body : JSON.stringify(body),
});
const get = (path) => new Request("https://api.test" + path, { headers: { Origin: ORIGIN } });

const goodRun = (id, score = 500, level = 3) => ({ id, score, level, durationMs: 120000 });

describe("POST /scores", () => {
  it("accepts a plausible run and reports both boards' standing", async () => {
    const res = await worker.fetch(post("/scores", goodRun(uuid(1))), env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      score: { rank: 1, best: 500 },
      level: { rank: 1, best: 3 },
    });
  });

  it("rejects a forged score", async () => {
    const res = await worker.fetch(post("/scores", goodRun(uuid(1), 999999999)), env);
    expect(res.status).toBe(422);
    expect(env.DB.rows).toHaveLength(0);
  });

  it("rejects a forged level", async () => {
    const res = await worker.fetch(post("/scores", goodRun(uuid(1), 500, 999999)), env);
    expect(res.status).toBe(422);
    expect(env.DB.rows).toHaveLength(0);
  });

  it("rejects a score earned impossibly fast", async () => {
    const req = post("/scores", { id: uuid(1), score: 50000, level: 5, durationMs: L.minRunMs });
    expect((await worker.fetch(req, env)).status).toBe(422);
  });

  it("rejects an id the browser did not generate", async () => {
    const res = await worker.fetch(post("/scores", { ...goodRun(uuid(1)), id: "steve" }), env);
    expect(res.status).toBe(400);
  });

  it("rejects a junk body without falling over", async () => {
    expect((await worker.fetch(post("/scores", "not json"), env)).status).toBe(400);
  });

  it("keeps the player's best score, not their latest", async () => {
    await worker.fetch(post("/scores", goodRun(uuid(1), 900, 5)), env);
    env.DB.rows[0].updated_at -= L.submitCooldownMs;      // let the cooldown lapse
    const res = await worker.fetch(post("/scores", goodRun(uuid(1), 100, 5)), env);
    expect(await res.json()).toMatchObject({ score: { best: 900 } });
    expect(env.DB.rows[0].score).toBe(900);
  });

  it("keeps the player's best level, not their latest, independently of score", async () => {
    await worker.fetch(post("/scores", goodRun(uuid(1), 100, 8)), env);
    env.DB.rows[0].updated_at -= L.submitCooldownMs;
    // a later run with a *higher* score but a *lower* level must not drop the level
    const res = await worker.fetch(post("/scores", goodRun(uuid(1), 900, 2)), env);
    expect(await res.json()).toEqual({
      score: { rank: 1, best: 900 },
      level: { rank: 1, best: 8 },
    });
    expect(env.DB.rows[0]).toMatchObject({ score: 900, level: 8 });
  });

  it("keeps a low score's higher level even when the score does not improve", async () => {
    await worker.fetch(post("/scores", goodRun(uuid(1), 900, 2)), env);
    env.DB.rows[0].updated_at -= L.submitCooldownMs;
    const res = await worker.fetch(post("/scores", goodRun(uuid(1), 100, 12)), env);
    expect(await res.json()).toEqual({
      score: { rank: 1, best: 900 },
      level: { rank: 1, best: 12 },
    });
  });

  it("stores one row per player, not one per run", async () => {
    await worker.fetch(post("/scores", goodRun(uuid(1), 100)), env);
    env.DB.rows[0].updated_at -= L.submitCooldownMs;
    await worker.fetch(post("/scores", goodRun(uuid(1), 200)), env);
    expect(env.DB.rows).toHaveLength(1);
  });

  it("ranks a submission the way rankOf defines it, ties included", async () => {
    for (const [i, score] of [900, 900, 400].entries()) {
      env.DB.rows.push({ id: uuid(90 + i), score, level: 1, duration_ms: 120000, created_at: 0, updated_at: 0 });
    }
    const res = await worker.fetch(post("/scores", goodRun(uuid(1), 900)), env);
    const body = await res.json();
    expect(body.score.rank).toBe(rankOf([900, 900, 900, 400], 900));   // shared definition
    expect(body.score.rank).toBe(1);
  });

  it("rate limits a player submitting in a loop", async () => {
    await worker.fetch(post("/scores", goodRun(uuid(1))), env);
    const res = await worker.fetch(post("/scores", goodRun(uuid(1))), env);
    expect(res.status).toBe(429);
  });

  it("stores nothing that identifies a person or a device", async () => {
    await worker.fetch(post("/scores", goodRun(uuid(1))), env);
    expect(Object.keys(env.DB.rows[0]).sort())
      .toEqual(["created_at", "duration_ms", "id", "level", "score", "updated_at"]);
  });

  it("stores the latest catalogue skin as a separate public profile", async () => {
    await worker.fetch(post("/scores", { ...goodRun(uuid(1)), skinId: "copper" }), env);
    expect(env.DB.profiles).toEqual([{ id: uuid(1), skin_id: "copper", updated_at: expect.any(Number) }]);
  });

  it("falls back to Volt instead of storing an invented skin", async () => {
    await worker.fetch(post("/scores", { ...goodRun(uuid(1)), skinId: "hacked-rainbow" }), env);
    expect(env.DB.profiles[0].skin_id).toBe("volt");
  });
});

describe("GET /top", () => {
  beforeEach(async () => {
    for (const [i, [score, level]] of [[300, 4], [900, 2], [600, 9]].entries()) {
      env.DB.rows.push({ id: uuid(i), score, level, duration_ms: 120000, created_at: 0, updated_at: 0 });
    }
  });

  it("defaults to ranking by score, highest first", async () => {
    const rows = await (await worker.fetch(get("/top"), env)).json();
    expect(rows.map(r => r.score)).toEqual([900, 600, 300]);
  });

  it("ranks by level when asked", async () => {
    const rows = await (await worker.fetch(get("/top?by=level"), env)).json();
    expect(rows.map(r => r.level)).toEqual([9, 4, 2]);
  });

  it("every row carries both metrics, regardless of which one is sorting", async () => {
    const rows = await (await worker.fetch(get("/top?by=level"), env)).json();
    expect(rows[0]).toEqual({ tag: tagFor(uuid(2)), score: 600, level: 9 });
  });

  it("names players by a tag derived from their id", async () => {
    const rows = await (await worker.fetch(get("/top"), env)).json();
    expect(rows[0].tag).toBe(tagFor(uuid(1)));
  });

  it("never leaks player ids", async () => {
    const body = await (await worker.fetch(get("/top"), env)).text();
    expect(body).not.toContain(uuid(1));
    expect(JSON.parse(body).every(r => Object.keys(r).sort().join() === "level,score,tag")).toBe(true);
  });
});

describe("GET /top?limit=", () => {
  beforeEach(async () => {
    for (let i = 0; i < 30; i++) {
      env.DB.rows.push({ id: uuid(i), score: 1000 - i, level: 1, duration_ms: 120000, created_at: 0, updated_at: 0 });
    }
  });

  it("defaults to topLimit with no query string", async () => {
    const rows = await (await worker.fetch(get("/top"), env)).json();
    expect(rows).toHaveLength(L.topLimit);
  });

  it("honours a requested limit", async () => {
    const rows = await (await worker.fetch(get("/top?limit=25"), env)).json();
    expect(rows).toHaveLength(25);
  });

  it("never returns more than maxTopLimit, however much is asked for", async () => {
    const rows = await (await worker.fetch(get("/top?limit=999"), env)).json();
    expect(rows).toHaveLength(L.maxTopLimit);
  });

  it("falls back to the default for junk", async () => {
    const rows = await (await worker.fetch(get("/top?limit=banana"), env)).json();
    expect(rows).toHaveLength(L.topLimit);
  });
});

describe("GET /rivals", () => {
  it("returns recent real players with derived tags and catalogue skins", async () => {
    await worker.fetch(post("/scores", { ...goodRun(uuid(1)), skinId: "copper" }), env);
    env.DB.rows[0].updated_at -= L.submitCooldownMs;
    await worker.fetch(post("/scores", { ...goodRun(uuid(2)), skinId: "gold" }), env);
    const rows = await (await worker.fetch(get("/rivals?limit=14"), env)).json();
    expect(rows).toEqual([
      { tag: tagFor(uuid(2)), skinId: "gold" },
      { tag: tagFor(uuid(1)), skinId: "copper" },
    ]);
  });

  it("uses Volt for players without a saved appearance", async () => {
    env.DB.rows.push({ id: uuid(1), score: 100, level: 2, duration_ms: 120000, created_at: 0, updated_at: 1 });
    expect(await (await worker.fetch(get("/rivals"), env)).json())
      .toEqual([{ tag: tagFor(uuid(1)), skinId: "volt" }]);
  });

  it("never leaks player ids", async () => {
    await worker.fetch(post("/scores", { ...goodRun(uuid(1)), skinId: "ruby" }), env);
    const body = await (await worker.fetch(get("/rivals"), env)).text();
    expect(body).not.toContain(uuid(1));
    expect(Object.keys(JSON.parse(body)[0]).sort()).toEqual(["skinId", "tag"]);
  });
});

describe("POST /profile", () => {
  it("updates a joined identity's latest skin independently of a run", async () => {
    const res = await worker.fetch(post("/profile", { id: uuid(1), skinId: "diamond" }), env);
    expect(await res.json()).toEqual({ updated: true });
    expect(env.DB.profiles[0]).toMatchObject({ id: uuid(1), skin_id: "diamond" });
  });

  it("normalises unknown skins and rejects non-UUID identities", async () => {
    await worker.fetch(post("/profile", { id: uuid(1), skinId: "made-up" }), env);
    expect(env.DB.profiles[0].skin_id).toBe("volt");
    expect((await worker.fetch(post("/profile", { id: "alex", skinId: "gold" }), env)).status).toBe(400);
  });
});

describe("GET /rank", () => {
  it("is null for a player who has never joined", async () => {
    const res = await worker.fetch(get(`/rank?id=${uuid(1)}`), env);
    expect(res.status).toBe(200);
    expect(await res.json()).toBeNull();
  });

  it("reports a joined player's own rank and best on both boards, without them submitting again", async () => {
    await worker.fetch(post("/scores", goodRun(uuid(1), 500, 7)), env);
    const res = await worker.fetch(get(`/rank?id=${uuid(1)}`), env);
    expect(await res.json()).toEqual({
      score: { rank: 1, best: 500 },
      level: { rank: 1, best: 7 },
    });
  });

  it("agrees with the rank a submission reports, ties included", async () => {
    for (const [i, score] of [900, 700, 700].entries()) {
      env.DB.rows.push({ id: uuid(90 + i), score, level: 1, duration_ms: 120000, created_at: 0, updated_at: 0 });
    }
    const submitBody = await (await worker.fetch(post("/scores", goodRun(uuid(1), 700)), env)).json();
    const res = await worker.fetch(get(`/rank?id=${uuid(1)}`), env);
    expect((await res.json()).score.rank).toBe(submitBody.score.rank);
    expect(submitBody.score.rank).toBe(rankOf([900, 700, 700, 700], 700));   // shared definition
  });

  it("rejects an id that is not a UUID", async () => {
    const res = await worker.fetch(get("/rank?id=steve"), env);
    expect(res.status).toBe(400);
  });

  it("rejects a missing id", async () => {
    const res = await worker.fetch(get("/rank"), env);
    expect(res.status).toBe(400);
  });

  it("never leaks the id back", async () => {
    await worker.fetch(post("/scores", goodRun(uuid(1))), env);
    const body = await (await worker.fetch(get(`/rank?id=${uuid(1)}`), env)).text();
    expect(body).not.toContain(uuid(1));
  });
});

describe("POST /forget", () => {
  it("deletes everything held for a player", async () => {
    await worker.fetch(post("/scores", goodRun(uuid(1))), env);
    const res = await worker.fetch(post("/forget", { id: uuid(1) }), env);
    expect(await res.json()).toEqual({ forgotten: true });
    expect(env.DB.rows).toHaveLength(0);
    expect(env.DB.profiles).toHaveLength(0);
  });
});

describe("CORS and routing", () => {
  it("echoes an allowed origin", async () => {
    const res = await worker.fetch(get("/top"), env);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ORIGIN);
  });

  it("does not echo an origin that is not allowed", async () => {
    const req = new Request("https://api.test/top", { headers: { Origin: "https://evil.example" } });
    const res = await worker.fetch(req, env);
    expect(res.headers.get("Access-Control-Allow-Origin")).not.toBe("https://evil.example");
  });

  it("answers preflight", async () => {
    const req = new Request("https://api.test/scores", { method: "OPTIONS", headers: { Origin: ORIGIN } });
    expect((await worker.fetch(req, env)).status).toBe(204);
  });

  it("404s an unknown path", async () => {
    expect((await worker.fetch(get("/everything"), env)).status).toBe(404);
  });

  it("does not leak internals when the database fails", async () => {
    env.DB = { prepare() { throw new Error("D1_ERROR: table scores has no column named secret"); } };
    const res = await worker.fetch(get("/top"), env);
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("D1_ERROR");
  });
});
