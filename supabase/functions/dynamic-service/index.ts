// Supabase Edge Function: returns last traded prices for NSE symbols.
// GET /functions/v1/prices?symbols=RELIANCE,TCS,M%26M
// Response: { prices: { RELIANCE: 2950.5 }, missing: ["TCS"], asOf: 1730000000000 }
// Data comes from Yahoo Finance's public chart feed (free, unofficial, can lag by up to 15 minutes).

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

async function quote(symbol) {
  const url = "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(symbol + ".NS") + "?interval=1m&range=1d";
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const json = await res.json();
  const price = json && json.chart && json.chart.result && json.chart.result[0] && json.chart.result[0].meta && json.chart.result[0].meta.regularMarketPrice;
  return typeof price === "number" && isFinite(price) && price > 0 ? price : null;
}

export async function handler(req) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const raw = new URL(req.url).searchParams.get("symbols") || "";
  const symbols = Array.from(new Set(raw.split(",").map((s) => s.trim().toUpperCase()).filter((s) => /^[A-Z0-9&-]{1,20}$/.test(s)))).slice(0, 40);
  const prices = {}, missing = [];
  await Promise.all(symbols.map(async (s) => {
    try { const p = await quote(s); if (p === null) missing.push(s); else prices[s] = p; }
    catch (_e) { missing.push(s); }
  }));
  return new Response(JSON.stringify({ prices, missing, asOf: Date.now() }), { headers: CORS });
}

Deno.serve(handler);
