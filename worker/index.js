// Eel Shock leaderboard Worker (Cloudflare Workers + D1).
//
//   GET  /top?limit=&by=    -> [{ tag, score, level }]  the board (by defaults
//                              to "score"; "level" sorts the other board)
//   GET  /rank?id=          -> { score:{rank,best}, level:{rank,best} } | null
//   GET  /rivals?limit=     -> [{ tag, skinId }] anonymous recent players
//   POST /profile           -> { updated } publish latest catalogue skin
//   POST /scores            -> same shape as /rank — submit a run:
//                              { id, score, level, durationMs, skinId }
//   POST /forget            -> { forgotten }     delete everything for { id }
//
// Two independent leaderboards, one row per player: the highest score anyone
// has ever posted, and the deepest level anyone has ever reached — often
// different people, since score keeps rising after level 2 stops being
// buyable with points (see CLAUDE.md's levelling rules). Both are kept in the
// same UPDATE on every accepted submission, never just whichever happened to
// be higher this run.
//
// The rules live in ../src/engine/ and are shared with the game itself, so a
// cap cannot drift between what the client believes and what the server
// enforces. The client is never trusted: it sends an id, a score and a
// level, and the server decides the display name and whether the run is
// plausible.
//
// Deploy:  npm ci (repo root), then from this directory:
//          ../node_modules/.bin/wrangler deploy
// Wrangler is a pinned root devDependency (see package.json) — not fetched
// fresh via npx at deploy time. See README.md's "Or from a laptop" section.

import { CONFIG } from "../src/engine/config.js";
import { validateSubmission, topRows, clampTopLimit } from "../src/engine/leaderboard.js";
import { tagFor } from "../src/engine/identity.js";
import { skinById } from "../src/engine/skins.js";

const L = CONFIG.leaderboard;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function corsHeaders(request, env) {
  const allowed = (env.ALLOWED_ORIGINS ?? "").split(",").map(o => o.trim()).filter(Boolean);
  const origin = request.headers.get("Origin") ?? "";
  const ok = allowed.includes(origin);
  return {
    "Access-Control-Allow-Origin": ok ? origin : allowed[0] ?? "null",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}

// Coerces any input to one of the two real column names — never interpolated
// from a request until it has passed through here, so a `by=` query string
// can pick a sort order and nothing else.
function metricColumn(by) {
  return by === "level" ? "level" : "score";
}

async function handleTop(request, env, cors) {
  const url = new URL(request.url);
  // clampTopLimit is the same function the client uses, so a "Top 25" screen
  // and this endpoint can never disagree about what "25" is allowed to mean.
  const limit = clampTopLimit(url.searchParams.get("limit"));
  const column = metricColumn(url.searchParams.get("by"));
  const { results } = await env.DB
    .prepare(`SELECT id, score, level FROM scores ORDER BY ${column} DESC LIMIT ?`)
    .bind(limit)
    .all();

  // The tag is derived here, from the id, so a client cannot choose the words
  // that appear on a board children read. Ids are never sent back. Every row
  // carries both metrics regardless of which one is sorting this board.
  const rows = topRows(
    (results ?? []).map(r => ({ tag: tagFor(r.id), score: r.score, level: r.level })),
    limit, column,
  );
  return json(rows, 200, cors);
}

async function handleRivals(request, env, cors) {
  const limit = clampTopLimit(new URL(request.url).searchParams.get("limit"));
  const { results } = await env.DB.prepare(
    `SELECT scores.id, profiles.skin_id
       FROM scores LEFT JOIN profiles ON profiles.id = scores.id
       ORDER BY scores.updated_at DESC LIMIT ?`,
  ).bind(limit).all();

  // As with /top, ids stop at the Worker. A missing profile belongs to a
  // player who has not submitted since skins were added, so they safely wear
  // Volt until their next accepted run updates it.
  const rows = (results ?? []).map(row => ({
    tag: tagFor(row.id),
    skinId: skinById(row.skin_id).id,
  }));
  return json(rows, 200, cors);
}

/** How many rows beat this value on this metric. Shared by /rank and /scores. */
async function rankFor(env, metric, value) {
  const column = metricColumn(metric);
  const higher = await env.DB
    .prepare(`SELECT COUNT(*) AS n FROM scores WHERE ${column} > ?`)
    .bind(value)
    .first();
  return (higher?.n ?? 0) + 1;
}

async function standingFor(env, row) {
  return {
    score: { rank: await rankFor(env, "score", row.score), best: row.score },
    level: { rank: await rankFor(env, "level", row.level), best: row.level },
  };
}

/**
 * A player's own standing on both boards, without submitting anything or
 * joining the board. `null` for a player who has never joined — there is
 * nothing to rank, and that is not an error.
 */
async function handleRank(request, env, cors) {
  const id = new URL(request.url).searchParams.get("id");
  if (typeof id !== "string" || !UUID.test(id)) {
    return json({ error: "id must be a UUID" }, 400, cors);
  }
  const row = await env.DB.prepare("SELECT score, level FROM scores WHERE id = ?").bind(id).first();
  if (!row) return json(null, 200, cors);
  return json(await standingFor(env, row), 200, cors);
}

async function handleSubmit(request, env, cors) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "expected a JSON body" }, 400, cors);
  }

  const { id, score, level, durationMs, skinId } = body ?? {};
  if (typeof id !== "string" || !UUID.test(id)) {
    return json({ error: "id must be a UUID the browser generated" }, 400, cors);
  }

  const verdict = validateSubmission({ score, durationMs, level });
  if (!verdict.ok) return json({ error: verdict.reason }, 422, cors);

  const now = Date.now();
  const existing = await env.DB
    .prepare("SELECT score, level, updated_at FROM scores WHERE id = ?")
    .bind(id)
    .first();

  if (existing && now - existing.updated_at < L.submitCooldownMs) {
    return json({ error: "submitting too fast" }, 429, cors);
  }

  // Score and level are each kept at their own best, independently — a run
  // that sets a new deepest level but not a new high score must not have its
  // level improvement silently dropped, and vice versa.
  const bestScore = Math.max(score, existing?.score ?? 0);
  const bestLevel = Math.max(level, existing?.level ?? 0);

  if (!existing) {
    await env.DB
      .prepare("INSERT INTO scores (id, score, level, duration_ms, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(id, bestScore, bestLevel, Math.round(durationMs), now, now)
      .run();
  } else {
    await env.DB
      .prepare("UPDATE scores SET score = ?, level = ?, duration_ms = ?, updated_at = ? WHERE id = ?")
      .bind(bestScore, bestLevel, Math.round(durationMs), now, id)
      .run();
  }

  // The catalogue, not the client, decides what may be published. Unknown or
  // missing ids become Volt; typed names and arbitrary appearance data are
  // never accepted. This is presentation only, so it does not grant ownership.
  const publicSkinId = skinById(skinId).id;
  await env.DB.prepare(
    `INSERT INTO profiles (id, skin_id, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET skin_id = excluded.skin_id, updated_at = excluded.updated_at`,
  ).bind(id, publicSkinId, now).run();

  return json(await standingFor(env, { score: bestScore, level: bestLevel }), 200, cors);
}

async function handleProfile(request, env, cors) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "expected a JSON body" }, 400, cors);
  }
  const { id, skinId } = body ?? {};
  if (typeof id !== "string" || !UUID.test(id)) {
    return json({ error: "id must be a UUID the browser generated" }, 400, cors);
  }
  const publicSkinId = skinById(skinId).id;
  await env.DB.prepare(
    `INSERT INTO profiles (id, skin_id, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET skin_id = excluded.skin_id, updated_at = excluded.updated_at`,
  ).bind(id, publicSkinId, Date.now()).run();
  return json({ updated: true }, 200, cors);
}

async function handleForget(request, env, cors) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "expected a JSON body" }, 400, cors);
  }
  const { id } = body ?? {};
  if (typeof id !== "string" || !UUID.test(id)) {
    return json({ error: "id must be a UUID" }, 400, cors);
  }
  await env.DB.prepare("DELETE FROM scores WHERE id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM profiles WHERE id = ?").bind(id).run();
  return json({ forgotten: true }, 200, cors);
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    try {
      if (request.method === "GET" && url.pathname === "/top") return await handleTop(request, env, cors);
      if (request.method === "GET" && url.pathname === "/rank") return await handleRank(request, env, cors);
      if (request.method === "GET" && url.pathname === "/rivals") return await handleRivals(request, env, cors);
      if (request.method === "POST" && url.pathname === "/scores") return await handleSubmit(request, env, cors);
      if (request.method === "POST" && url.pathname === "/profile") return await handleProfile(request, env, cors);
      if (request.method === "POST" && url.pathname === "/forget") return await handleForget(request, env, cors);
    } catch (err) {
      return json({ error: "leaderboard unavailable" }, 500, cors);
    }

    return json({ error: "not found" }, 404, cors);
  },
};
