// Eel Shock leaderboard Worker (Cloudflare Workers + D1).
//
//   GET  /top?limit=   -> [{ tag, score }]  the board, highest first (limit is clamped)
//   GET  /rank?id=     -> { rank, best } | null   a player's own standing, without joining
//   POST /scores       -> { rank, best }    submit a run: { id, score, durationMs }
//   POST /forget       -> { forgotten }     delete everything for { id }
//
// The rules live in ../src/engine/ and are shared with the game itself, so a
// cap cannot drift between what the client believes and what the server
// enforces. The client is never trusted: it sends an id and a score, and the
// server decides the display name and whether the run is plausible.
//
// Deploy:  npx wrangler deploy      (from this directory)

import { CONFIG } from "../src/engine/config.js";
import { validateSubmission, topRows, clampTopLimit } from "../src/engine/leaderboard.js";
import { tagFor } from "../src/engine/identity.js";

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

async function handleTop(request, env, cors) {
  // clampTopLimit is the same function the client uses, so a "Top 25" screen
  // and this endpoint can never disagree about what "25" is allowed to mean.
  const limit = clampTopLimit(new URL(request.url).searchParams.get("limit"));
  const { results } = await env.DB
    .prepare("SELECT id, score FROM scores ORDER BY score DESC LIMIT ?")
    .bind(limit)
    .all();

  // The tag is derived here, from the id, so a client cannot choose the words
  // that appear on a board children read. Ids are never sent back.
  const rows = topRows((results ?? []).map(r => ({ tag: tagFor(r.id), score: r.score })), limit);
  return json(rows, 200, cors);
}

/** How many rows beat this score. Shared by /rank and a fresh /scores submission. */
async function rankFor(env, score) {
  const higher = await env.DB
    .prepare("SELECT COUNT(*) AS n FROM scores WHERE score > ?")
    .bind(score)
    .first();
  return (higher?.n ?? 0) + 1;
}

/**
 * A player's own standing, without submitting anything or joining the board.
 * `null` for a player who has never joined — there is nothing to rank, and
 * that is not an error.
 */
async function handleRank(request, env, cors) {
  const id = new URL(request.url).searchParams.get("id");
  if (typeof id !== "string" || !UUID.test(id)) {
    return json({ error: "id must be a UUID" }, 400, cors);
  }
  const row = await env.DB.prepare("SELECT score FROM scores WHERE id = ?").bind(id).first();
  if (!row) return json(null, 200, cors);
  return json({ rank: await rankFor(env, row.score), best: row.score }, 200, cors);
}

async function handleSubmit(request, env, cors) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "expected a JSON body" }, 400, cors);
  }

  const { id, score, durationMs } = body ?? {};
  if (typeof id !== "string" || !UUID.test(id)) {
    return json({ error: "id must be a UUID the browser generated" }, 400, cors);
  }

  const verdict = validateSubmission({ score, durationMs });
  if (!verdict.ok) return json({ error: verdict.reason }, 422, cors);

  const now = Date.now();
  const existing = await env.DB
    .prepare("SELECT score, updated_at FROM scores WHERE id = ?")
    .bind(id)
    .first();

  if (existing && now - existing.updated_at < L.submitCooldownMs) {
    return json({ error: "submitting too fast" }, 429, cors);
  }

  // Keep the player's best run, never their latest.
  if (!existing) {
    await env.DB
      .prepare("INSERT INTO scores (id, score, duration_ms, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
      .bind(id, score, Math.round(durationMs), now, now)
      .run();
  } else if (score > existing.score) {
    await env.DB
      .prepare("UPDATE scores SET score = ?, duration_ms = ?, updated_at = ? WHERE id = ?")
      .bind(score, Math.round(durationMs), now, id)
      .run();
  } else {
    await env.DB.prepare("UPDATE scores SET updated_at = ? WHERE id = ?").bind(now, id).run();
  }

  // Counting the scores above this one is the same answer rankOf() gives — ties
  // share a rank — without reading every row in the table on every submission.
  const best = Math.max(score, existing?.score ?? 0);
  return json({ best, rank: await rankFor(env, best) }, 200, cors);
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
      if (request.method === "POST" && url.pathname === "/scores") return await handleSubmit(request, env, cors);
      if (request.method === "POST" && url.pathname === "/forget") return await handleForget(request, env, cors);
    } catch (err) {
      return json({ error: "leaderboard unavailable" }, 500, cors);
    }

    return json({ error: "not found" }, 404, cors);
  },
};
