// Vercel serverless function: proxies live crypto prices from CoinGecko.
// Runs server-side so the browser never hits CoinGecko directly (avoids CORS/bot-blocking issues).
export default async function handler(
  req: { query: Record<string, string | string[] | undefined> },
  res: { status: (code: number) => { json: (body: unknown) => void } }
) {
  const raw = req.query.ids;
  const ids = (Array.isArray(raw) ? raw[0] : raw || '')
    .split(',').map(s => s.trim()).filter(Boolean);

  if (ids.length === 0) {
    res.status(400).json({ error: 'ids query param required' });
    return;
  }

  try {
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!r.ok) {
      res.status(502).json({ error: `CoinGecko returned ${r.status}` });
      return;
    }
    const data = await r.json();
    res.status(200).json(data);
  } catch {
    res.status(502).json({ error: 'CoinGecko unreachable' });
  }
}
