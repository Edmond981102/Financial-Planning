// Vercel Cron target: refreshes every user's stock/ETF/crypto prices directly in
// Supabase, so prices stay fresh even when nobody has the app open in a browser.
// Requires the SUPABASE_SERVICE_ROLE_KEY env var (Project Settings > Environment
// Variables on Vercel; the value comes from Supabase Settings > API > service_role).
// If CRON_SECRET is set, requests must carry `Authorization: Bearer <CRON_SECRET>`
// (Vercel adds this header automatically for its own Cron Jobs once the env var exists).
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rnnncbzemskpggxvnndh.supabase.co';

// Keep in sync with CRYPTO_ID_MAP in src/pages/Investments.tsx.
const CRYPTO_ID_MAP: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', XRP: 'ripple', SOL: 'solana',
  ADA: 'cardano', DOGE: 'dogecoin', BNB: 'binancecoin', LTC: 'litecoin',
  DOT: 'polkadot', MATIC: 'matic-network', AVAX: 'avalanche-2',
  LINK: 'chainlink', SHIB: 'shiba-inu', TRX: 'tron', ATOM: 'cosmos',
  UNI: 'uniswap', XLM: 'stellar', USDT: 'tether', USDC: 'usd-coin',
};

interface StoredInvestment {
  ticker?: string;
  type: string;
  currentPrice: number;
  [key: string]: unknown;
}

async function fetchStockPrices(symbols: string[]): Promise<Record<string, number>> {
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
  return prices;
}

async function fetchCryptoPrices(tickers: string[]): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};
  if (tickers.length === 0) return prices;
  try {
    const ids = Array.from(new Set(tickers.map(t => CRYPTO_ID_MAP[t])));
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`);
    if (!r.ok) return prices;
    const data = await r.json();
    for (const ticker of tickers) {
      const price = data[CRYPTO_ID_MAP[ticker]]?.usd;
      if (typeof price === 'number') prices[ticker] = price;
    }
  } catch {
    // CoinGecko unreachable; leave crypto prices empty for this run
  }
  return prices;
}

export default async function handler(
  req: { headers: Record<string, string | string[] | undefined> },
  res: { status: (code: number) => { json: (body: unknown) => void } }
) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers['authorization'] !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured.' });
    return;
  }

  const supabaseAdmin = createClient(SUPABASE_URL, serviceKey);
  const { data: rows, error } = await supabaseAdmin.from('user_data').select('id, data');
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const stockTickers = new Set<string>();
  const cryptoTickers = new Set<string>();
  for (const row of rows || []) {
    const investments: StoredInvestment[] = row.data?.investments || [];
    for (const inv of investments) {
      if (!inv.ticker) continue;
      const upper = inv.ticker.toUpperCase();
      if (inv.type === 'crypto' && CRYPTO_ID_MAP[upper]) cryptoTickers.add(upper);
      else if (inv.type === 'stock' || inv.type === 'etf') stockTickers.add(inv.ticker);
    }
  }

  const [stockPrices, cryptoPrices] = await Promise.all([
    fetchStockPrices(Array.from(stockTickers)),
    fetchCryptoPrices(Array.from(cryptoTickers)),
  ]);

  let usersUpdated = 0;
  for (const row of rows || []) {
    const investments: StoredInvestment[] = row.data?.investments || [];
    if (investments.length === 0) continue;
    let changed = false;
    const updatedInvestments = investments.map(inv => {
      if (!inv.ticker) return inv;
      const price = inv.type === 'crypto' ? cryptoPrices[inv.ticker.toUpperCase()] : stockPrices[inv.ticker];
      if (typeof price === 'number' && price !== inv.currentPrice) {
        changed = true;
        return { ...inv, currentPrice: price };
      }
      return inv;
    });
    if (changed) {
      await supabaseAdmin.from('user_data').upsert({
        id: row.id,
        data: { ...row.data, investments: updatedInvestments },
        updated_at: new Date().toISOString(),
      });
      usersUpdated++;
    }
  }

  res.status(200).json({
    usersChecked: rows?.length || 0,
    usersUpdated,
    stockTickers: Array.from(stockTickers),
    cryptoTickers: Array.from(cryptoTickers),
  });
}
