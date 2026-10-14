// Supabase Edge Function: fetches NSE last-traded prices from the official Fyers API.
// Required Supabase Edge Function secrets:
//   FYERS_APP_ID       e.g. YOUR_APP_ID-100
//   FYERS_ACCESS_TOKEN the current Fyers access token (do not expose it in the browser)
// GET /functions/v1/dynamic-service?symbols=RELIANCE,TCS,M%26M
// Response: { prices: { RELIANCE: 2950.5 }, missing: ["TCS"], asOf: 1730000000000 }

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const appId = Deno.env.get("FYERS_APP_ID");
  const accessToken = Deno.env.get("FYERS_ACCESS_TOKEN");
  if (!appId || !accessToken) {
    return json({ error: "Fyers is not configured. Set FYERS_APP_ID and FYERS_ACCESS_TOKEN in Supabase Edge Function secrets." }, 503);
  }

  const raw = new URL(req.url).searchParams.get("symbols") || "";
  const symbols = Array.from(new Set(
    raw.split(",")
      .map((s) => s.trim().toUpperCase())
      .filter((s) => /^[A-Z0-9&-]{1,20}$/.test(s))
  )).slice(0, 40);

  if (!symbols.length) return json({ prices: {}, missing: [], asOf: Date.now() });

  // Fyers quote endpoint accepts multiple comma-separated symbols in one request.
  const fyersSymbols = symbols.map((s) => "NSE:" + s + "-EQ");
  const url = "https://api-t1.fyers.in/data/quotes?symbols=" + encodeURIComponent(fyersSymbols.join(","));

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "Authorization": appId + ":" + accessToken, "Accept": "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || payload.s !== "ok" || !Array.isArray(payload.d)) {
      const message = payload && (payload.message || payload.messageDesc);
      // Do not return provider payloads or credentials to the browser.
      return json({
        error: response.status === 401 || response.status === 403
          ? "Fyers authentication failed or the access token has expired. Update FYERS_ACCESS_TOKEN in Supabase secrets."
          : "Fyers quote request failed" + (message ? ": " + String(message).slice(0, 160) : "."),
      }, response.status === 401 || response.status === 403 ? 502 : 502);
    }

    const prices = {};
    const missing = new Set(symbols);
    for (const item of payload.d) {
      if (!item || item.s !== "ok" || !item.v) continue;
      const match = String(item.n || "").match(/^NSE:(.+)-EQ$/);
      const symbol = match && match[1];
      const price = Number(item.v.lp);
      if (symbol && symbols.includes(symbol) && Number.isFinite(price) && price > 0) {
        prices[symbol] = price;
        missing.delete(symbol);
      }
    }

    return json({ prices, missing: Array.from(missing), asOf: Date.now(), source: "Fyers" });
  } catch (_error) {
    return json({ error: "Could not reach the Fyers quote API. Try again shortly." }, 502);
  }
});
