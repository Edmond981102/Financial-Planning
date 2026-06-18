// Vercel serverless function: proxies live stock/ETF quotes from Yahoo Finance.
// Runs server-side so the browser never hits Yahoo directly (avoids CORS issues).
export default async function handler(
  req: { query: Record<string, string | string[] | undefined> },
  res: { status: (code: number) => { json: (body: unknown) => void } }
) {
  const raw = req.query.symbols;
  const symbols = (Array.isArray(raw) ? raw[0] : raw || '')
    .split(',').map(s => s.trim()).filter(Boolean);

  if (symbols.length === 0) {
    res.status(400).json({ error: 'symbols query param required' });
    return;
  }

  const prices: Record<string, number> = {};
  await Promise.all(symbols.map(async symbol => {
    try {
      const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (!r.ok) return;
      const data = await r.json();
      const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (typeof price === 'number') prices[symbol] = price;
    } catch {
      // symbol couldn't be resolved; omit it from the response
    }
  }));

  res.status(200).json(prices);
}
