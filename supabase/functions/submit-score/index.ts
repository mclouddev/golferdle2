import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true }, 200);
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const initialsRaw = String(body.initials ?? "")
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3);

  const strokes = Number(body.strokes);

  if (initialsRaw.length < 1 || initialsRaw.length > 3) {
    return json({ error: "Initials must be 1–3 characters" }, 400);
  }

  if (!Number.isFinite(strokes) || strokes < 18 || strokes > 144) {
    return json({ error: "Invalid strokes value" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { error } = await supabase.from("scores").insert({
    initials: initialsRaw,
    strokes,
  });

  if (error) {
    return json({ error: error.message }, 500);
  }

  const { data, error: readError } = await supabase
    .from("scores")
    .select("initials, strokes, created_at")
    .order("strokes", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(10);

  if (readError) {
    return json({ error: readError.message }, 500);
  }

  return json({ ok: true, leaderboard: data }, 200);
});
