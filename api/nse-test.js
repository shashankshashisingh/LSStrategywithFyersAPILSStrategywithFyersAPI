// Test only: can stock-nse-india fetch live NSE quotes from a Vercel server?
// Open /api/nse-test?symbol=TCS on the preview deployment of this branch.
module.exports = async (req, res) => {
  const symbol = String((req.query && req.query.symbol) || "TCS").toUpperCase().replace(/[^A-Z0-9&-]/g, "").slice(0, 20) || "TCS";
  const started = Date.now();
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  try {
    const { NseIndia } = await import("stock-nse-india");
    const nse = new NseIndia();
    const q = await Promise.race([
      nse.getEquityDetails(symbol),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timed out after 25 seconds")), 25000)),
    ]);
    res.status(200).end(JSON.stringify({
      ok: true, symbol,
      lastPrice: q && q.priceInfo ? q.priceInfo.lastPrice : null,
      nseUpdateTime: q && q.metadata ? q.metadata.lastUpdateTime : null,
      serverTimeIST: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      tookMs: Date.now() - started,
    }, null, 2));
  } catch (e) {
    res.status(200).end(JSON.stringify({ ok: false, symbol, error: String(e && e.message || e), tookMs: Date.now() - started }, null, 2));
  }
};
