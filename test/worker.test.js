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
  return {
    rows,
    prepare(sql) {
      const stmt = {
        args: [],
        bind(...args) { stmt.args = args; return stmt; },
        async first() {
          if (/FROM scores WHERE id/.test(sql)) return rows.find(r => r.id === stmt.args[0]) ?? null;
          if (/SELECT COUNT\(\*\) AS n FROM scores WHERE score >/.test(sql)) {
            return { n: rows.filter(r => r.score > stmt.args[0]).length };
          }
          throw new Error("unexpected first(): " + sql);
        },
        async all() {
          if (/SELECT id, score FROM scores/.test(sql)) {
            const limit = stmt.args[0] ?? rows.length;
            return { results: [...rows].sort((a, b) => b.score - a.score).slice(0, limit) };
          }
          if (/SELECT score FROM scores/.test(sql)) {
            return { results: [...rows].sort((a, b) => b.score - a.score) };
          }
          throw new Error("unexpected all(): " + sql);
        },
        async run() {
          if (/^INSERT INTO scores/.test(sql)) {
            const [id, score, duration_ms, created_at, updated_at] = stmt.args;
            rows.push({ id, score, duration_ms, created_at, updated_at });
          } else if (/^UPDATE scores SET score/.test(sql)) {
            const [score, duration_ms, updated_at, id] = stmt.args;
            Object.assign(rows.find(r => r.id === id), { score, duration_ms, updated_at });
          } else if (/^UPDATE scores SET updated_at/.test(sql)) {
            const [updated_at, id] = stmt.args;
            Object.assign(rows.find(r => r.id === id), { updated_at });
          } else if (/^DELETE FROM scores/.test(sql)) {
            const i = rows.findIndex(r => r.id === stmt.args[0]);
            if (i >= 0) rows.splice(i, 1);
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

const goodRun = (id, score = 500) => ({ id, score, durationMs: 120000 });

describe("POST /scores", () => {
  it("accepts a plausible run and reports the rank", async () => {
    const res = await worker.fetch(post("/scores", goodRun(uuid(1))), env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ best: 500, rank: 1 });
  });

  it("rejects a forged score", async () => {
    const res = await worker.fetch(post("/scores", goodRun(uuid(1), 999999999)), env);
    expect(res.status).toBe(422);
    expect(env.DB.rows).toHaveLength(0);
  });

  it("rejects a score earned impossibly fast", async () => {
    const req = post("/scores", { id: uuid(1), score: 50000, durationMs: L.minRunMs });
    expect((await worker.fetch(req, env)).status).toBe(422);
  });

  it("rejects an id the browser did not generate", async () => {
    const res = await worker.fetch(post("/scores", { ...goodRun(uuid(1)), id: "steve" }), env);
    expect(res.status).toBe(400);
  });

  it("rejects a junk body without falling over", async () => {
    expect((await worker.fetch(post("/scores", "not json"), env)).status).toBe(400);
  });

  it("keeps the player's best run, not their latest", async () => {
    await worker.fetch(post("/scores", goodRun(uuid(1), 900)), env);
    env.DB.rows[0].updated_at -= L.submitCooldownMs;      // let the cooldown lapse
    const res = await worker.fetch(post("/scores", goodRun(uuid(1), 100)), env);
    expect(await res.json()).toMatchObject({ best: 900 });
    expect(env.DB.rows[0].score).toBe(900);
  });

  it("stores one row per player, not one per run", async () => {
    await worker.fetch(post("/scores", goodRun(uuid(1), 100)), env);
    env.DB.rows[0].updated_at -= L.submitCooldownMs;
    await worker.fetch(post("/scores", goodRun(uuid(1), 200)), env);
    expect(env.DB.rows).toHaveLength(1);
  });

  it("ranks a submission the way rankOf defines it, ties included", async () => {
    for (const [i, score] of [900, 900, 400].entries()) {
      env.DB.rows.push({ id: uuid(90 + i), score, duration_ms: 120000, created_at: 0, updated_at: 0 });
    }
    const res = await worker.fetch(post("/scores", goodRun(uuid(1), 900)), env);
    const body = await res.json();
    expect(body.rank).toBe(rankOf([900, 900, 900, 400], 900));   // shared definition
    expect(body.rank).toBe(1);
  });

  it("rate limits a player submitting in a loop", async () => {
    await worker.fetch(post("/scores", goodRun(uuid(1))), env);
    const res = await worker.fetch(post("/scores", goodRun(uuid(1))), env);
    expect(res.status).toBe(429);
  });

  it("stores nothing that identifies a person or a device", async () => {
    await worker.fetch(post("/scores", goodRun(uuid(1))), env);
    expect(Object.keys(env.DB.rows[0]).sort())
      .toEqual(["created_at", "duration_ms", "id", "score", "updated_at"]);
  });
});

describe("GET /top", () => {
  beforeEach(async () => {
    for (const [i, score] of [300, 900, 600].entries()) {
      env.DB.rows.push({ id: uuid(i), score, duration_ms: 120000, created_at: 0, updated_at: 0 });
    }
  });

  it("returns the board highest first", async () => {
    const rows = await (await worker.fetch(get("/top"), env)).json();
    expect(rows.map(r => r.score)).toEqual([900, 600, 300]);
  });

  it("names players by a tag derived from their id", async () => {
    const rows = await (await worker.fetch(get("/top"), env)).json();
    expect(rows[0].tag).toBe(tagFor(uuid(1)));
  });

  it("never leaks player ids", async () => {
    const body = await (await worker.fetch(get("/top"), env)).text();
    expect(body).not.toContain(uuid(1));
    expect(JSON.parse(body).every(r => Object.keys(r).sort().join() === "score,tag")).toBe(true);
  });
});

describe("GET /top?limit=", () => {
  beforeEach(async () => {
    for (let i = 0; i < 30; i++) {
      env.DB.rows.push({ id: uuid(i), score: 1000 - i, duration_ms: 120000, created_at: 0, updated_at: 0 });
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

describe("GET /rank", () => {
  it("is null for a player who has never joined", async () => {
    const res = await worker.fetch(get(`/rank?id=${uuid(1)}`), env);
    expect(res.status).toBe(200);
    expect(await res.json()).toBeNull();
  });

  it("reports a joined player's own rank and best, without them submitting again", async () => {
    await worker.fetch(post("/scores", goodRun(uuid(1), 500)), env);
    const res = await worker.fetch(get(`/rank?id=${uuid(1)}`), env);
    expect(await res.json()).toEqual({ rank: 1, best: 500 });
  });

  it("agrees with the rank a submission reports, ties included", async () => {
    for (const [i, score] of [900, 700, 700].entries()) {
      env.DB.rows.push({ id: uuid(90 + i), score, duration_ms: 120000, created_at: 0, updated_at: 0 });
    }
    const submitRank = (await (await worker.fetch(post("/scores", goodRun(uuid(1), 700)), env)).json()).rank;
    const res = await worker.fetch(get(`/rank?id=${uuid(1)}`), env);
    expect((await res.json()).rank).toBe(submitRank);
    expect(submitRank).toBe(rankOf([900, 700, 700, 700], 700));   // shared definition
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
