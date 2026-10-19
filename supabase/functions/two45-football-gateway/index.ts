import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED = new Set([
  "teams/statistics",
  "fixtures",
  "fixtures/statistics",
  "fixtures/headtohead",
  "fixtures/lineups",
  "fixtures/players",
  "injuries",
  "odds",
  "standings"
]);

const UPSTREAM_TIMEOUT_MS = 7000;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "POST only" }, { status: 405 });
  }

  const apiKey = req.headers.get("x-apisports-key") || "";
  if (!apiKey) {
    return Response.json({ ok: false, error: "Missing provider credential" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const endpoint = String(body.endpoint || "").replace(/^\/+/, "");
  const params = body.params && typeof body.params === "object" ? body.params : {};

  if (!ALLOWED.has(endpoint)) {
    return Response.json({ ok: false, error: "Endpoint not allowed" }, { status: 400 });
  }

  const target = new URL("https://v3.football.api-sports.io/" + endpoint);
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined) target.searchParams.set(k, String(v));
  }

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      headers: {
        "x-apisports-key": apiKey,
        "Accept": "application/json"
      },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    return Response.json(
      {
        ok: false,
        error: timedOut
          ? "API-Football upstream timed out"
          : "API-Football upstream request failed"
      },
      { status: timedOut ? 504 : 502 }
    );
  }

  const text = await upstream.text();
  const headers = new Headers({
    "Content-Type": upstream.headers.get("content-type") || "application/json",
    "Cache-Control": "no-store"
  });

  for (const name of [
    "x-ratelimit-requests-remaining",
    "x-ratelimit-requests-limit",
    "x-ratelimit-remaining",
    "x-ratelimit-limit",
    "retry-after"
  ]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  return new Response(text, { status: upstream.status, headers });
});
