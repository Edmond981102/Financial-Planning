import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Plus, Trash2, Edit2, X, Check, TrendingUp, TrendingDown, Download, RefreshCw } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency, formatDate, formatPercent } from '../utils/formatters';
import { getTotalInvestmentValue, getTotalInvestmentCost, getInvestmentReturn } from '../utils/calculations';
import { Investment, InvestmentType } from '../types';

// Real holdings extracted from StashAway (May 2026 statement), Tiger Brokers
// (Jan-Jun 2026 activity statement, SGD positions converted to USD at the
// statement's 0.7799 SGD->USD rate), and Coinbase (XRP buy on 5 Feb 2026).
const REAL_HOLDINGS: Omit<Investment, 'id'>[] = [
  // StashAway Flexible Portfolio (reported natively in USD)
  { name: 'First Trust NASDAQ Clean Edge Smart Grid Infrastructure (GRID)', ticker: 'GRID', type: 'etf', units: 6.4707, buyPrice: 190.99, currentPrice: 193.07, purchaseDate: '2026-05-01', color: '#10b981', notes: 'StashAway Flexible Portfolio. Cost is estimated from the monthly statement (no full lifetime cost basis available).' },
  { name: 'Consumer Discretionary Select Sector SPDR (XLY)', ticker: 'XLY', type: 'etf', units: 3.1296, buyPrice: 118.37, currentPrice: 120.87, purchaseDate: '2026-05-01', color: '#3b82f6', notes: 'StashAway Flexible Portfolio. Cost is estimated from the monthly statement.' },
  { name: 'VanEck Environmental Services ETF (EVX)', ticker: 'EVX', type: 'etf', units: 28.0577, buyPrice: 40.52, currentPrice: 38.83, purchaseDate: '2026-05-01', color: '#f59e0b', notes: 'StashAway Flexible Portfolio. Cost is estimated from the monthly statement.' },
  { name: 'VanEck Semiconductor ETF (SMH)', ticker: 'SMH', type: 'etf', units: 2.0157, buyPrice: 492.74, currentPrice: 598.93, purchaseDate: '2026-05-01', color: '#8b5cf6', notes: 'StashAway Flexible Portfolio. Cost is estimated from the monthly statement.' },
  { name: 'First Trust Water ETF (FIW)', ticker: 'FIW', type: 'etf', units: 7.0031, buyPrice: 106.99, currentPrice: 103.74, purchaseDate: '2026-05-01', color: '#06b6d4', notes: 'StashAway Flexible Portfolio. Cost is estimated from the monthly statement.' },
  { name: 'SPDR Gold MiniShares Trust (GLDM)', ticker: 'GLDM', type: 'etf', units: 11.7943, buyPrice: 91.44, currentPrice: 89.93, purchaseDate: '2026-05-01', color: '#ef4444', notes: 'StashAway Flexible Portfolio. Cost is estimated from the monthly statement.' },
  { name: 'iShares Global Healthcare ETF (IXJ)', ticker: 'IXJ', type: 'etf', units: 8.0062, buyPrice: 92.84, currentPrice: 94.50, purchaseDate: '2026-05-01', color: '#ec4899', notes: 'StashAway Flexible Portfolio. Cost is estimated from the monthly statement.' },
  { name: 'iShares US Aggregate Bond UCITS ETF (IUAG)', ticker: 'IUAG', type: 'etf', units: 3.9254, buyPrice: 94.84, currentPrice: 93.31, purchaseDate: '2026-05-01', color: '#84cc16', notes: 'StashAway Flexible Portfolio. Cost is estimated from the monthly statement.' },
  { name: 'iShares Core S&P 500 ETF (IVV)', ticker: 'IVV', type: 'etf', units: 0.9254, buyPrice: 722.09, currentPrice: 760.05, purchaseDate: '2026-05-01', color: '#10b981', notes: 'StashAway Flexible Portfolio. Cost is estimated from the monthly statement.' },
  // Tiger Brokers - unit trusts (originally priced in SGD, converted to USD)
  { name: 'Eastspring Japan Dynamic AS (SGDHDG)', type: 'mutual_fund', units: 200.638, buyPrice: 25.65, currentPrice: 43.15, purchaseDate: '2026-01-06', color: '#3b82f6', notes: 'Tiger Brokers unit trust. Originally priced in SGD (cost S$32.89, current S$55.32/unit).' },
  { name: 'Schroder ISF Global Gold A (SGDHDG)', type: 'mutual_fund', units: 4.17, buyPrice: 261.48, currentPrice: 385.14, purchaseDate: '2026-01-01', color: '#f59e0b', notes: 'Tiger Brokers unit trust. Originally priced in SGD (cost S$335.27, current S$493.83/unit).' },
  { name: 'Abrdn Global Technology (SGD)', type: 'mutual_fund', units: 2936.34, buyPrice: 1.59, currentPrice: 2.39, purchaseDate: '2026-01-05', color: '#8b5cf6', notes: 'Tiger Brokers unit trust. Originally priced in SGD (cost S$2.04, current S$3.06/unit).' },
  { name: 'UOB United e-Commerce (SGD)', type: 'mutual_fund', units: 6458.26, buyPrice: 0.82, currentPrice: 1.30, purchaseDate: '2026-01-05', color: '#06b6d4', notes: 'Tiger Brokers unit trust. Originally priced in SGD (cost S$1.05, current S$1.66/unit).' },
  { name: 'LionGlobal Singapore Trust (SGD)', type: 'mutual_fund', units: 199.58, buyPrice: 4.30, currentPrice: 5.24, purchaseDate: '2026-01-01', color: '#ec4899', notes: 'Tiger Brokers unit trust. Originally priced in SGD (cost S$5.51, current S$6.72/unit).' },
  // Tiger Brokers - stocks
  { name: 'WinkingStudios', ticker: 'WKS.SI', type: 'stock', units: 200, buyPrice: 0.16, currentPrice: 0.17, purchaseDate: '2026-01-01', color: '#84cc16', notes: 'Tiger Brokers stock. Originally priced in SGD (cost S$0.21, current S$0.215).' },
  { name: 'Apple Inc.', ticker: 'AAPL', type: 'stock', units: 1.25364, buyPrice: 221.15, currentPrice: 299.24, purchaseDate: '2026-01-02', color: '#6366f1' },
  { name: 'Marvell Technology', ticker: 'MRVL', type: 'stock', units: 0.08702, buyPrice: 229.78, currentPrice: 278.67, purchaseDate: '2026-05-20', color: '#ef4444' },
  { name: 'NVIDIA Corp', ticker: 'NVDA', type: 'stock', units: 3.03564, buyPrice: 123.76, currentPrice: 207.41, purchaseDate: '2026-01-02', color: '#10b981' },
  { name: 'SpaceX', ticker: 'SPCX', type: 'stock', units: 2, buyPrice: 206.96, currentPrice: 201.80, purchaseDate: '2026-06-16', color: '#3b82f6' },
  // Coinbase - crypto
  { name: 'XRP', ticker: 'XRP', type: 'crypto', units: 265.02, buyPrice: 1.47, currentPrice: 1.21, purchaseDate: '2026-02-05', color: '#f59e0b', notes: 'Bought via Coinbase for S$500. Price from Coinbase, updated 2026-06-18 — check Coinbase for the latest.' },
];

const TYPE_LABELS: Record<InvestmentType, string> = {
  stock: 'Stock', etf: 'ETF', crypto: 'Crypto', mutual_fund: 'Mutual Fund',
  bond: 'Bond', real_estate: 'Real Estate', gold: 'Gold', other: 'Other',
};

const INV_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444',
  '#06b6d4', '#ec4899', '#84cc16',
];

// Maps common crypto ticker symbols to CoinGecko's coin IDs for live price lookups.
const CRYPTO_ID_MAP: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', XRP: 'ripple', SOL: 'solana',
  ADA: 'cardano', DOGE: 'dogecoin', BNB: 'binancecoin', LTC: 'litecoin',
  DOT: 'polkadot', MATIC: 'matic-network', AVAX: 'avalanche-2',
  LINK: 'chainlink', SHIB: 'shiba-inu', TRX: 'tron', ATOM: 'cosmos',
  UNI: 'uniswap', XLM: 'stellar', USDT: 'tether', USDC: 'usd-coin',
};

interface InvForm {
  name: string; type: InvestmentType; ticker: string;
  units: string; buyPrice: string; currentPrice: string;
  purchaseDate: string; notes: string; color: string;
}

const emptyForm: InvForm = {
  name: '', type: 'stock', ticker: '', units: '',
  buyPrice: '', currentPrice: '', purchaseDate: '',
  notes: '', color: '#3b82f6',
};

export default function Investments() {
  const { investments, addInvestment, updateInvestment, deleteInvestment } = useFinanceStore();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<InvForm>(emptyForm);
  const [showImportModal, setShowImportModal] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  const totalValue = getTotalInvestmentValue(investments);
  const totalCost = getTotalInvestmentCost(investments);
  const totalReturn = totalValue - totalCost;
  const returnPct = getInvestmentReturn(investments);

  const allocationData = investments.map(inv => ({
    name: inv.ticker || inv.name,
    value: inv.units * inv.currentPrice,
    color: inv.color,
  }));

  const performanceData = investments.map(inv => ({
    name: inv.ticker || inv.name.substring(0, 8),
    cost: inv.units * inv.buyPrice,
    value: inv.units * inv.currentPrice,
    gain: inv.units * inv.currentPrice - inv.units * inv.buyPrice,
  }));

  function openAdd() {
    setForm(emptyForm);
    setEditId(null);
    setShowModal(true);
  }

  function openEdit(inv: Investment) {
    setForm({
      name: inv.name, type: inv.type, ticker: inv.ticker || '',
      units: String(inv.units), buyPrice: String(inv.buyPrice),
      currentPrice: String(inv.currentPrice), purchaseDate: inv.purchaseDate,
      notes: inv.notes || '', color: inv.color,
    });
    setEditId(inv.id);
    setShowModal(true);
  }

  function handleSubmit() {
    if (!form.name || !form.units || !form.buyPrice || !form.currentPrice) return;
    const payload = {
      name: form.name, type: form.type, ticker: form.ticker || undefined,
      units: parseFloat(form.units), buyPrice: parseFloat(form.buyPrice),
      currentPrice: parseFloat(form.currentPrice), purchaseDate: form.purchaseDate,
      notes: form.notes || undefined, color: form.color,
    };
    if (editId) {
      updateInvestment(editId, payload);
    } else {
      addInvestment(payload);
    }
    setShowModal(false);
  }

  async function handleSyncCrypto() {
    const cryptoHoldings = investments.filter(inv => inv.type === 'crypto' && inv.ticker && CRYPTO_ID_MAP[inv.ticker.toUpperCase()]);
    if (cryptoHoldings.length === 0) {
      setSyncError('No crypto holdings with a recognized ticker (e.g. BTC, ETH, XRP) to sync.');
      return;
    }
    setSyncing(true);
    setSyncError('');
    try {
      const ids = Array.from(new Set(cryptoHoldings.map(h => CRYPTO_ID_MAP[h.ticker!.toUpperCase()])));
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`);
      if (!res.ok) throw new Error('Price service unavailable, try again later.');
      const data = await res.json();
      cryptoHoldings.forEach(h => {
        const price = data[CRYPTO_ID_MAP[h.ticker!.toUpperCase()]]?.usd;
        if (typeof price === 'number') updateInvestment(h.id, { currentPrice: price });
      });
      setLastSynced(new Date().toLocaleTimeString());
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Failed to sync prices.');
    } finally {
      setSyncing(false);
    }
  }

  function handleImport() {
    if (replaceExisting) {
      investments.forEach(inv => deleteInvestment(inv.id));
    }
    REAL_HOLDINGS.forEach(h => addInvestment(h));
    setShowImportModal(false);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Investment Portfolio</h1>
          <p className="text-slate-400 text-sm mt-0.5">Track your wealth growth</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSyncCrypto} disabled={syncing} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Syncing...' : 'Sync Crypto Prices'}
          </button>
          <button onClick={() => setShowImportModal(true)} className="btn-secondary flex items-center gap-2">
            <Download size={16} /> Import My Holdings
          </button>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Investment
          </button>
        </div>
      </div>
      {(syncError || lastSynced) && (
        <p className={`text-xs ${syncError ? 'text-rose-400' : 'text-slate-500'}`}>
          {syncError || `Crypto prices synced at ${lastSynced}`}
        </p>
      )}

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card">
          <div className="text-xs text-slate-400 mb-1">Portfolio Value</div>
          <div className="text-2xl font-bold text-white">{formatCurrency(totalValue)}</div>
          <div className="text-xs text-slate-500 mt-0.5">current market value</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-400 mb-1">Total Invested</div>
          <div className="text-2xl font-bold text-white">{formatCurrency(totalCost)}</div>
          <div className="text-xs text-slate-500 mt-0.5">cost basis</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-400 mb-1">Total Return</div>
          <div className={`text-2xl font-bold ${totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalReturn >= 0 ? '+' : ''}{formatCurrency(totalReturn)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">unrealized P&L</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-400 mb-1">Return %</div>
          <div className={`text-2xl font-bold flex items-center gap-1.5 ${returnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {returnPct >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            {returnPct >= 0 ? '+' : ''}{formatPercent(returnPct)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">portfolio return</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-4">Portfolio Allocation</h2>
          <div className="flex gap-4 items-center">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={allocationData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                  {allocationData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [formatCurrency(v), '']} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {allocationData.map(d => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    <span className="text-slate-400">{d.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-200 font-medium">{formatCurrency(d.value)}</div>
                    <div className="text-slate-500">{totalValue > 0 ? ((d.value / totalValue) * 100).toFixed(1) : 0}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-4">Cost vs Current Value</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={performanceData} barGap={4}>
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v / 1000}k`} />
              <Tooltip formatter={(v: number, n: string) => [formatCurrency(v), n === 'cost' ? 'Cost' : 'Value']} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }} />
              <Bar dataKey="cost" name="Cost" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={16} />
              <Bar dataKey="value" name="Value" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-white">Holdings</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left text-xs text-slate-500 font-medium px-5 py-3">Asset</th>
              <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Type</th>
              <th className="text-right text-xs text-slate-500 font-medium px-4 py-3">Units</th>
              <th className="text-right text-xs text-slate-500 font-medium px-4 py-3">Buy Price</th>
              <th className="text-right text-xs text-slate-500 font-medium px-4 py-3">Current</th>
              <th className="text-right text-xs text-slate-500 font-medium px-4 py-3">Value</th>
              <th className="text-right text-xs text-slate-500 font-medium px-4 py-3">Return</th>
              <th className="text-right text-xs text-slate-500 font-medium px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {investments.map(inv => {
              const value = inv.units * inv.currentPrice;
              const cost = inv.units * inv.buyPrice;
              const gain = value - cost;
              const gainPct = cost > 0 ? (gain / cost) * 100 : 0;
              return (
                <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: inv.color + '20', color: inv.color }}>
                        {(inv.ticker || inv.name).charAt(0)}
                      </div>
                      <div>
                        <div className="text-white font-medium text-xs">{inv.name}</div>
                        {inv.ticker && <div className="text-slate-500 text-xs">{inv.ticker}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">{TYPE_LABELS[inv.type]}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300 text-xs">{inv.units}</td>
                  <td className="px-4 py-3 text-right text-slate-300 text-xs">{formatCurrency(inv.buyPrice)}</td>
                  <td className="px-4 py-3 text-right text-slate-300 text-xs">{formatCurrency(inv.currentPrice)}</td>
                  <td className="px-4 py-3 text-right text-white font-medium text-xs">{formatCurrency(value)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className={`text-xs font-semibold ${gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {gain >= 0 ? '+' : ''}{formatCurrency(gain)}
                    </div>
                    <div className={`text-xs ${gainPct >= 0 ? 'text-emerald-400/70' : 'text-rose-400/70'}`}>
                      {gainPct >= 0 ? '+' : ''}{formatPercent(gainPct)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(inv)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => deleteInvestment(inv.id)} className="p-1.5 rounded-lg hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md mx-4 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Import My Holdings</h2>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              This will add your {REAL_HOLDINGS.length} real holdings from StashAway, Tiger Brokers, and Coinbase (XRP) into your portfolio.
            </p>
            <label className="flex items-center gap-2 text-sm text-slate-300 mb-5 cursor-pointer">
              <input type="checkbox" checked={replaceExisting} onChange={e => setReplaceExisting(e.target.checked)} className="w-4 h-4" />
              Remove the {investments.length} existing investment(s) first
            </label>
            <div className="flex gap-3">
              <button onClick={() => setShowImportModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleImport} className="btn-primary flex-1 flex items-center justify-center gap-2">
                <Download size={15} /> Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg mx-4 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">{editId ? 'Edit' : 'Add'} Investment</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Asset Name *</label>
                  <input className="input" placeholder="e.g. Apple Inc." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Ticker Symbol</label>
                  <input className="input" placeholder="e.g. AAPL" value={form.ticker} onChange={e => setForm(f => ({ ...f, ticker: e.target.value.toUpperCase() }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Asset Type</label>
                  <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as InvestmentType }))}>
                    {(Object.entries(TYPE_LABELS)).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Purchase Date</label>
                  <input className="input" type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Units / Shares *</label>
                  <input className="input" type="number" min="0" step="any" placeholder="0" value={form.units} onChange={e => setForm(f => ({ ...f, units: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Buy Price *</label>
                  <input className="input" type="number" min="0" step="0.01" placeholder="0.00" value={form.buyPrice} onChange={e => setForm(f => ({ ...f, buyPrice: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Current Price *</label>
                  <input className="input" type="number" min="0" step="0.01" placeholder="0.00" value={form.currentPrice} onChange={e => setForm(f => ({ ...f, currentPrice: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {INV_COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                      style={{ background: c, outline: form.color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }} />
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input resize-none" rows={2} placeholder="Optional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleSubmit} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Check size={15} /> {editId ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
