import { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, LineChart, Line } from 'recharts';
import { Plus, Trash2, Edit2, X, Check, TrendingUp, TrendingDown, Download, RefreshCw } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency, formatDate, formatPercent } from '../utils/formatters';
import { getTotalInvestmentValue, getTotalInvestmentCost, getInvestmentReturn } from '../utils/calculations';
import { Investment, InvestmentType, AutoInvestConfig, InvestmentPlatform, PurchaseRecord } from '../types';

// Computes the next date an auto-invest contribution is due, after `from`.
function nextAutoInvestOccurrence(from: Date, config: AutoInvestConfig): Date {
  const next = new Date(from);
  if (config.frequency === 'weekly') {
    next.setDate(next.getDate() + 1);
    while (next.getDay() !== config.dayOfWeek) next.setDate(next.getDate() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
    next.setDate(config.dayOfMonth ?? 1);
  }
  return next;
}

// Real holdings extracted from StashAway (May 2026 statement), Tiger Brokers
// (Jan-Jun 2026 activity statement, SGD positions converted to USD at the
// statement's 0.7799 SGD->USD rate), and Coinbase (XRP buy on 5 Feb 2026).
const REAL_HOLDINGS: Omit<Investment, 'id'>[] = [
  // StashAway Flexible Portfolio (reported natively in USD)
  { name: 'First Trust NASDAQ Clean Edge Smart Grid Infrastructure (GRID)', ticker: 'GRID', type: 'etf', units: 6.4707, buyPrice: 190.99, currentPrice: 193.07, purchaseDate: '2026-05-01', color: '#10b981', platform: 'StashAway', notes: 'StashAway Flexible Portfolio. Cost is estimated from the monthly statement (no full lifetime cost basis available).', purchaseHistory: [{ date: '2026-05-01', price: 190.99, units: 6.4707, amount: 1236.42 }] },
  { name: 'Consumer Discretionary Select Sector SPDR (XLY)', ticker: 'XLY', type: 'etf', units: 3.1296, buyPrice: 118.37, currentPrice: 120.87, purchaseDate: '2026-05-01', color: '#3b82f6', platform: 'StashAway', notes: 'StashAway Flexible Portfolio. Cost is estimated from the monthly statement.', purchaseHistory: [{ date: '2026-05-01', price: 118.37, units: 3.1296, amount: 370.46 }] },
  { name: 'VanEck Environmental Services ETF (EVX)', ticker: 'EVX', type: 'etf', units: 28.0577, buyPrice: 40.52, currentPrice: 38.83, purchaseDate: '2026-05-01', color: '#f59e0b', platform: 'StashAway', notes: 'StashAway Flexible Portfolio. Cost is estimated from the monthly statement.', purchaseHistory: [{ date: '2026-05-01', price: 40.52, units: 28.0577, amount: 1136.98 }] },
  { name: 'VanEck Semiconductor ETF (SMH)', ticker: 'SMH', type: 'etf', units: 2.0157, buyPrice: 492.74, currentPrice: 598.93, purchaseDate: '2026-05-01', color: '#8b5cf6', platform: 'StashAway', notes: 'StashAway Flexible Portfolio. Cost is estimated from the monthly statement.', purchaseHistory: [{ date: '2026-05-01', price: 492.74, units: 2.0157, amount: 993.26 }] },
  { name: 'First Trust Water ETF (FIW)', ticker: 'FIW', type: 'etf', units: 7.0031, buyPrice: 106.99, currentPrice: 103.74, purchaseDate: '2026-05-01', color: '#06b6d4', platform: 'StashAway', notes: 'StashAway Flexible Portfolio. Cost is estimated from the monthly statement.', purchaseHistory: [{ date: '2026-05-01', price: 106.99, units: 7.0031, amount: 749.20 }] },
  { name: 'SPDR Gold MiniShares Trust (GLDM)', ticker: 'GLDM', type: 'etf', units: 11.7943, buyPrice: 91.44, currentPrice: 89.93, purchaseDate: '2026-05-01', color: '#ef4444', platform: 'StashAway', notes: 'StashAway Flexible Portfolio. Cost is estimated from the monthly statement.', purchaseHistory: [{ date: '2026-05-01', price: 91.44, units: 11.7943, amount: 1078.49 }] },
  { name: 'iShares Global Healthcare ETF (IXJ)', ticker: 'IXJ', type: 'etf', units: 8.0062, buyPrice: 92.84, currentPrice: 94.50, purchaseDate: '2026-05-01', color: '#ec4899', platform: 'StashAway', notes: 'StashAway Flexible Portfolio. Cost is estimated from the monthly statement.', purchaseHistory: [{ date: '2026-05-01', price: 92.84, units: 8.0062, amount: 743.30 }] },
  { name: 'iShares US Aggregate Bond UCITS ETF (IUAG)', ticker: 'IUAG', type: 'etf', units: 3.9254, buyPrice: 94.84, currentPrice: 93.31, purchaseDate: '2026-05-01', color: '#84cc16', platform: 'StashAway', notes: 'StashAway Flexible Portfolio. Cost is estimated from the monthly statement.', purchaseHistory: [{ date: '2026-05-01', price: 94.84, units: 3.9254, amount: 372.31 }] },
  { name: 'iShares Core S&P 500 ETF (IVV)', ticker: 'IVV', type: 'etf', units: 0.9254, buyPrice: 722.09, currentPrice: 760.05, purchaseDate: '2026-05-01', color: '#10b981', platform: 'StashAway', notes: 'StashAway Flexible Portfolio. Cost is estimated from the monthly statement.', purchaseHistory: [{ date: '2026-05-01', price: 722.09, units: 0.9254, amount: 668.27 }] },
  // Tiger Brokers - unit trusts (priced and traded in SGD; buyPrice/currentPrice above
  // are converted to USD at 0.7799 so portfolio totals are all in one currency, but the
  // purchase history below keeps each order's native SGD price/amount to match your statement)
  {
    name: 'Eastspring Japan Dynamic AS (SGDHDG)', type: 'mutual_fund', units: 200.638, buyPrice: 25.65, currentPrice: 43.15, purchaseDate: '2026-01-06', color: '#3b82f6', platform: 'Tiger Brokers',
    notes: 'Tiger Brokers unit trust. Originally priced in SGD (cost S$32.89, current S$55.32/unit). Cost basis is the weighted average of every DCA order below.',
    purchaseHistory: [
      { date: '2024-02-14', price: 29.538, units: 60.938, amount: 1800.00, currency: 'SGD' },
      { date: '2024-03-01', price: 30.519, units: 6.553, amount: 199.99, currency: 'SGD' },
      { date: '2024-03-31', price: 31.414, units: 6.367, amount: 200.00, currency: 'SGD' },
      { date: '2024-04-30', price: 32.206, units: 6.21, amount: 200.00, currency: 'SGD' },
      { date: '2024-06-01', price: 32.867, units: 6.085, amount: 200.00, currency: 'SGD' },
      { date: '2024-07-01', price: 32.640, units: 6.127, amount: 199.99, currency: 'SGD' },
      { date: '2024-08-01', price: 30.228, units: 6.616, amount: 199.99, currency: 'SGD' },
      { date: '2024-09-01', price: 31.788, units: 6.292, amount: 200.00, currency: 'SGD' },
      { date: '2024-09-30', price: 31.730, units: 6.303, amount: 199.99, currency: 'SGD' },
      { date: '2024-11-01', price: 32.444, units: 6.164, amount: 199.98, currency: 'SGD' },
      { date: '2024-12-01', price: 32.823, units: 6.092, amount: 199.96, currency: 'SGD' },
      { date: '2024-12-31', price: 33.532, units: 5.964, amount: 199.98, currency: 'SGD' },
      { date: '2025-02-01', price: 32.589, units: 6.137, amount: 200.00, currency: 'SGD' },
      { date: '2025-03-03', price: 33.422, units: 5.984, amount: 200.00, currency: 'SGD' },
      { date: '2025-03-31', price: 33.743, units: 5.927, amount: 199.99, currency: 'SGD' },
      { date: '2025-05-02', price: 32.996, units: 6.061, amount: 199.99, currency: 'SGD' },
      { date: '2025-05-31', price: 33.168, units: 6.03, amount: 200.00, currency: 'SGD' },
      { date: '2025-07-01', price: 34.174, units: 5.852, amount: 199.99, currency: 'SGD' },
      { date: '2025-07-31', price: 35.508, units: 5.633, amount: 199.99, currency: 'SGD' },
      { date: '2025-08-30', price: 37.733, units: 5.3, amount: 199.98, currency: 'SGD' },
      { date: '2025-09-30', price: 38.346, units: 5.216, amount: 200.00, currency: 'SGD' },
      { date: '2025-10-31', price: 40.013, units: 4.998, amount: 199.98, currency: 'SGD' },
      { date: '2025-11-28', price: 41.548, units: 4.814, amount: 200.00, currency: 'SGD' },
      { date: '2026-01-01', price: 43.607, units: 4.586, amount: 199.98, currency: 'SGD' },
      { date: '2026-01-31', price: 45.566, units: 4.389, amount: 199.99, currency: 'SGD' },
    ],
  },
  { name: 'Schroder ISF Global Gold A (SGDHDG)', type: 'mutual_fund', units: 4.17, buyPrice: 261.48, currentPrice: 385.14, purchaseDate: '2026-01-01', color: '#f59e0b', platform: 'Tiger Brokers', notes: 'Tiger Brokers unit trust. Originally priced in SGD (cost S$335.27, current S$493.83/unit).', purchaseHistory: [{ date: '2026-01-01', price: 335.27, units: 4.17, amount: 1398.08, currency: 'SGD' }] },
  {
    name: 'Abrdn Global Technology (SGD)', type: 'mutual_fund', units: 2936.34, buyPrice: 1.59, currentPrice: 2.39, purchaseDate: '2026-01-05', color: '#8b5cf6', platform: 'Tiger Brokers',
    notes: 'Tiger Brokers unit trust. Originally priced in SGD (cost S$2.04, current S$3.06/unit). Cost basis is the weighted average of every DCA order below.',
    purchaseHistory: [
      { date: '2023-12-03', price: 1.6501, units: 242.41, amount: 400.00, currency: 'SGD' },
      { date: '2023-12-29', price: 1.6871, units: 237.09, amount: 400.00, currency: 'SGD' },
      { date: '2024-02-14', price: 1.8395, units: 217.45, amount: 400.00, currency: 'SGD' },
      { date: '2024-03-01', price: 1.9934, units: 100.33, amount: 200.00, currency: 'SGD' },
      { date: '2024-03-31', price: 2.0067, units: 99.67, amount: 200.00, currency: 'SGD' },
      { date: '2024-04-30', price: 1.9064, units: 104.91, amount: 200.00, currency: 'SGD' },
      { date: '2024-06-01', price: 2.0011, units: 99.95, amount: 200.00, currency: 'SGD' },
      { date: '2024-07-01', price: 2.1344, units: 93.7, amount: 199.99, currency: 'SGD' },
      { date: '2024-08-01', price: 1.8691, units: 107, amount: 199.99, currency: 'SGD' },
      { date: '2024-09-01', price: 1.9497, units: 102.58, amount: 200.00, currency: 'SGD' },
      { date: '2024-09-30', price: 1.9829, units: 100.86, amount: 200.00, currency: 'SGD' },
      { date: '2024-11-01', price: 2.0646, units: 96.87, amount: 200.00, currency: 'SGD' },
      { date: '2024-12-01', price: 2.2452, units: 89.08, amount: 200.00, currency: 'SGD' },
      { date: '2024-12-31', price: 2.2877, units: 87.43, amount: 200.00, currency: 'SGD' },
      { date: '2025-02-01', price: 2.2986, units: 87.03, amount: 200.00, currency: 'SGD' },
      { date: '2025-03-03', price: 2.098, units: 95.33, amount: 200.00, currency: 'SGD' },
      { date: '2025-03-31', price: 1.9897, units: 100.52, amount: 200.00, currency: 'SGD' },
      { date: '2025-05-02', price: 1.9942, units: 100.29, amount: 200.00, currency: 'SGD' },
      { date: '2025-05-31', price: 2.0988, units: 95.29, amount: 199.99, currency: 'SGD' },
      { date: '2025-07-01', price: 2.1898, units: 91.33, amount: 199.99, currency: 'SGD' },
      { date: '2025-07-01', price: 2.2304, units: 89.67, amount: 200.00, currency: 'SGD' },
      { date: '2025-08-30', price: 2.288, units: 87.41, amount: 199.99, currency: 'SGD' },
      { date: '2025-09-30', price: 2.4456, units: 81.78, amount: 200.00, currency: 'SGD' },
      { date: '2025-10-31', price: 2.5316, units: 79, amount: 200.00, currency: 'SGD' },
      { date: '2025-11-28', price: 2.3787, units: 84.08, amount: 200.00, currency: 'SGD' },
      { date: '2026-01-01', price: 2.4313, units: 82.26, amount: 200.00, currency: 'SGD' },
      { date: '2026-01-31', price: 2.4092, units: 83.02, amount: 200.00, currency: 'SGD' },
    ],
  },
  {
    name: 'UOB United e-Commerce (SGD)', type: 'mutual_fund', units: 6458.26, buyPrice: 0.82, currentPrice: 1.30, purchaseDate: '2026-01-05', color: '#06b6d4', platform: 'Tiger Brokers',
    notes: 'Tiger Brokers unit trust. Originally priced in SGD (cost S$1.05, current S$1.66/unit). Cost basis is the weighted average of every DCA order below.',
    purchaseHistory: [
      { date: '2024-02-14', price: 0.908, units: 2202.65, amount: 2000.00, currency: 'SGD' },
      { date: '2024-03-01', price: 0.940, units: 212.76, amount: 199.99, currency: 'SGD' },
      { date: '2024-03-31', price: 0.950, units: 210.52, amount: 199.99, currency: 'SGD' },
      { date: '2024-04-30', price: 0.917, units: 218.1, amount: 200.00, currency: 'SGD' },
      { date: '2024-06-01', price: 1.000, units: 200, amount: 200.00, currency: 'SGD' },
      { date: '2024-07-01', price: 1.108, units: 180.5, amount: 199.99, currency: 'SGD' },
      { date: '2024-08-01', price: 0.987, units: 202.63, amount: 200.00, currency: 'SGD' },
      { date: '2024-09-01', price: 1.002, units: 199.6, amount: 200.00, currency: 'SGD' },
      { date: '2024-09-30', price: 1.028, units: 194.55, amount: 199.99, currency: 'SGD' },
      { date: '2024-11-01', price: 1.080, units: 185.18, amount: 199.99, currency: 'SGD' },
      { date: '2024-12-01', price: 1.1972, units: 167.05, amount: 200.00, currency: 'SGD' },
      { date: '2024-12-31', price: 1.2293, units: 162.69, amount: 199.99, currency: 'SGD' },
      { date: '2025-02-01', price: 1.1721, units: 170.6, amount: 200.00, currency: 'SGD' },
      { date: '2025-03-03', price: 1.1024, units: 181.42, amount: 200.00, currency: 'SGD' },
      { date: '2025-03-31', price: 1.0415, units: 192.03, amount: 200.00, currency: 'SGD' },
      { date: '2025-05-02', price: 1.0366, units: 192.93, amount: 199.99, currency: 'SGD' },
      { date: '2025-05-31', price: 1.1127, units: 179.74, amount: 200.00, currency: 'SGD' },
      { date: '2025-07-01', price: 1.1981, units: 166.93, amount: 200.00, currency: 'SGD' },
      { date: '2025-07-31', price: 1.2311, units: 162.45, amount: 199.99, currency: 'SGD' },
      { date: '2025-08-30', price: 1.2498, units: 160.02, amount: 200.00, currency: 'SGD' },
      { date: '2025-09-30', price: 1.3711, units: 145.86, amount: 199.99, currency: 'SGD' },
      { date: '2025-10-31', price: 1.4752, units: 135.57, amount: 200.00, currency: 'SGD' },
      { date: '2025-11-28', price: 1.3953, units: 143.36, amount: 199.99, currency: 'SGD' },
      { date: '2026-01-01', price: 1.3861, units: 144.28, amount: 200.00, currency: 'SGD' },
      { date: '2026-01-31', price: 1.3623, units: 146.81, amount: 199.99, currency: 'SGD' },
    ],
  },
  { name: 'LionGlobal Singapore Trust (SGD)', type: 'mutual_fund', units: 199.58, buyPrice: 4.30, currentPrice: 5.24, purchaseDate: '2026-01-01', color: '#ec4899', platform: 'Tiger Brokers', notes: 'Tiger Brokers unit trust. Originally priced in SGD (cost S$5.51, current S$6.72/unit).', purchaseHistory: [{ date: '2026-01-01', price: 5.51, units: 199.58, amount: 1100.00, currency: 'SGD' }] },
  // Tiger Brokers - stocks
  { name: 'WinkingStudios', ticker: 'WKS.SI', type: 'stock', units: 200, buyPrice: 0.156, currentPrice: 0.1599, purchaseDate: '2023-12-03', color: '#84cc16', platform: 'Tiger Brokers', notes: 'Tiger Brokers stock. Filled buy order: 200 shares @ limit S$0.200 on 2023-12-03 (an earlier S$0.200 order that day was cancelled).', purchaseHistory: [{ date: '2023-12-03', price: 0.156, units: 200, amount: 31.20 }] },
  { name: 'Apple Inc.', ticker: 'AAPL', type: 'stock', units: 1.25364, buyPrice: 221.15, currentPrice: 298.43, purchaseDate: '2026-01-02', color: '#6366f1', platform: 'Tiger Brokers', notes: 'Tiger Brokers auto-invest: USD 2 every Thursday.', autoInvest: { amountUsd: 2, frequency: 'weekly', dayOfWeek: 4, lastAppliedDate: '2026-06-18' }, purchaseHistory: [{ date: '2026-01-02', price: 221.15, units: 1.25364, amount: 277.20 }] },
  { name: 'Marvell Technology', ticker: 'MRVL', type: 'stock', units: 0.10369, buyPrice: 241.05, currentPrice: 324.38, purchaseDate: '2026-05-20', color: '#ef4444', platform: 'Tiger Brokers', notes: 'Tiger Brokers auto-invest: USD 5 every Wednesday.', autoInvest: { amountUsd: 5, frequency: 'weekly', dayOfWeek: 3, lastAppliedDate: '2026-06-18' }, purchaseHistory: [{ date: '2026-05-20', price: 241.05, units: 0.10369, amount: 24.99 }] },
  { name: 'NVIDIA Corp', ticker: 'NVDA', type: 'stock', units: 3.03564, buyPrice: 121.58, currentPrice: 209.38, purchaseDate: '2026-01-02', color: '#10b981', platform: 'Tiger Brokers', notes: 'Tiger Brokers auto-invest: USD 5 every Thursday.', autoInvest: { amountUsd: 5, frequency: 'weekly', dayOfWeek: 4, lastAppliedDate: '2026-06-18' }, purchaseHistory: [{ date: '2026-01-02', price: 121.58, units: 3.03564, amount: 369.07 }] },
  { name: 'SpaceX', ticker: 'SPCX', type: 'stock', units: 2, buyPrice: 206.96, currentPrice: 179.88, purchaseDate: '2026-06-16', color: '#3b82f6', platform: 'Tiger Brokers', notes: 'Tiger Brokers stock. Average Filled Price was $205.87/share (Filled Amount $411.74); average cost above includes a $2.18 brokerage commission, matching Tiger\'s portfolio view.', purchaseHistory: [{ date: '2026-06-16', price: 205.87, units: 2, amount: 411.74, fee: 2.18 }] },
  // Coinbase - crypto
  { name: 'XRP', ticker: 'XRP', type: 'crypto', units: 265.02, buyPrice: 1.47, currentPrice: 1.21, purchaseDate: '2026-02-05', color: '#f59e0b', platform: 'Coinbase', notes: 'Bought via Coinbase for S$500. Price from Coinbase, updated 2026-06-18 — check Coinbase for the latest.', purchaseHistory: [{ date: '2026-02-05', price: 1.47, units: 265.02, amount: 389.58 }] },
];

const PLATFORM_ORDER: InvestmentPlatform[] = ['Tiger Brokers', 'Coinbase', 'StashAway', 'Other'];

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
  units: string; buyPrice: string; currentPrice: string; fee: string;
  purchaseDate: string; notes: string; color: string;
  platform: InvestmentPlatform;
}

const emptyForm: InvForm = {
  name: '', type: 'stock', ticker: '', units: '',
  buyPrice: '', currentPrice: '', fee: '', purchaseDate: '',
  notes: '', color: '#3b82f6', platform: 'Other',
};

// Briefly highlights green/red whenever `value` changes, to surface live price ticks.
function FlashValue({ value, format, className = '' }: { value: number; format: (v: number) => string; className?: string }) {
  const prevValue = useRef(value);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (value !== prevValue.current) {
      setFlash(value > prevValue.current ? 'up' : 'down');
      prevValue.current = value;
      const timeout = setTimeout(() => setFlash(null), 1200);
      return () => clearTimeout(timeout);
    }
  }, [value]);

  return (
    <span
      className={`inline-block rounded px-1 transition-colors duration-700 ${
        flash === 'up' ? 'bg-emerald-500/25 text-emerald-300' : flash === 'down' ? 'bg-rose-500/25 text-rose-300' : ''
      } ${className}`}
    >
      {format(value)}
    </span>
  );
}

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
  const [stockSyncing, setStockSyncing] = useState(false);
  const [stockSyncError, setStockSyncError] = useState('');
  const [stockLastSynced, setStockLastSynced] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [syncTick, setSyncTick] = useState(0);

  // Auto-refresh live prices on page load, then every 15 minutes while this page stays open —
  // no need to click "Sync" manually. (Only runs while a tab has this page open; it can't
  // update prices in the background once the browser is closed.)
  useEffect(() => {
    const id = setInterval(() => setSyncTick(t => t + 1), 15 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    handleSyncStocks();
    handleSyncCrypto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncTick]);

  useEffect(() => {
    async function syncAutoInvest() {
      const dueList = investments.filter(inv => inv.autoInvest);
      if (dueList.length === 0) return;

      // Fetch today's live price for these tickers so auto-invest contributions
      // (and the displayed P&L) use real market prices, not a stale stored value.
      const tickers = Array.from(new Set(dueList.map(inv => inv.ticker).filter(Boolean))) as string[];
      let livePrices: Record<string, number> = {};
      if (tickers.length > 0) {
        try {
          const res = await fetch(`/api/quote?symbols=${tickers.map(encodeURIComponent).join(',')}`);
          if (res.ok) livePrices = await res.json();
        } catch {
          // fall back to each holding's stored currentPrice if the price service is unreachable
        }
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueList.forEach(inv => {
        const cfg = inv.autoInvest!;
        const price = (inv.ticker && livePrices[inv.ticker]) || inv.currentPrice;
        let units = inv.units;
        let buyPrice = inv.buyPrice;
        let lastApplied = cfg.lastAppliedDate;
        let changed = price !== inv.currentPrice;
        const newRecords: PurchaseRecord[] = [];
        let next = nextAutoInvestOccurrence(new Date(cfg.lastAppliedDate), cfg);
        while (next <= today) {
          const addedUnits = cfg.amountUsd / price;
          const newUnits = units + addedUnits;
          buyPrice = (units * buyPrice + addedUnits * price) / newUnits;
          units = newUnits;
          lastApplied = next.toISOString().slice(0, 10);
          newRecords.push({ date: lastApplied, price, units: addedUnits, amount: cfg.amountUsd });
          changed = true;
          next = nextAutoInvestOccurrence(next, cfg);
        }
        if (changed) {
          updateInvestment(inv.id, {
            units, buyPrice, currentPrice: price,
            autoInvest: { ...cfg, lastAppliedDate: lastApplied },
            purchaseHistory: [...(inv.purchaseHistory || []), ...newRecords],
          });
        }
      });
    }
    syncAutoInvest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const platformGroups = PLATFORM_ORDER.map(platform => {
    const holdings = investments.filter(inv => (inv.platform || 'Other') === platform);
    const value = holdings.reduce((sum, inv) => sum + inv.units * inv.currentPrice, 0);
    const cost = holdings.reduce((sum, inv) => sum + inv.units * inv.buyPrice, 0);
    return { platform, holdings, value, cost, gain: value - cost };
  }).filter(g => g.holdings.length > 0);

  const detailInv = investments.find(inv => inv.id === detailId) || null;

  function openAdd() {
    setForm(emptyForm);
    setEditId(null);
    setShowModal(true);
  }

  function openEdit(inv: Investment) {
    // If this holding has a single purchase on record, split its buyPrice back into the
    // raw fill price + fee so re-editing doesn't double-count a fee already folded in.
    const singleRecord = inv.purchaseHistory?.length === 1 ? inv.purchaseHistory[0] : null;
    setForm({
      name: inv.name, type: inv.type, ticker: inv.ticker || '',
      units: String(inv.units), buyPrice: String(singleRecord ? singleRecord.price : inv.buyPrice),
      currentPrice: String(inv.currentPrice), fee: singleRecord?.fee ? String(singleRecord.fee) : '',
      purchaseDate: inv.purchaseDate,
      notes: inv.notes || '', color: inv.color, platform: inv.platform || 'Other',
    });
    setEditId(inv.id);
    setShowModal(true);
  }

  function handleSubmit() {
    if (!form.name || !form.units || !form.buyPrice || !form.currentPrice) return;
    const units = parseFloat(form.units);
    const rawPrice = parseFloat(form.buyPrice);
    const fee = parseFloat(form.fee) || 0;
    const buyPrice = fee > 0 && units > 0 ? rawPrice + fee / units : rawPrice;
    const existing = editId ? investments.find(inv => inv.id === editId) : null;
    const payload: Omit<Investment, 'id'> = {
      name: form.name, type: form.type, ticker: form.ticker || undefined,
      units, buyPrice,
      currentPrice: parseFloat(form.currentPrice), purchaseDate: form.purchaseDate,
      notes: form.notes || undefined, color: form.color, platform: form.platform,
    };
    // Keep a single-entry purchase history in sync with the raw price/fee so editing again later splits correctly.
    if (!existing || !existing.purchaseHistory || existing.purchaseHistory.length <= 1) {
      payload.purchaseHistory = [{
        date: form.purchaseDate, price: rawPrice, units, amount: rawPrice * units,
        fee: fee > 0 ? fee : undefined,
      }];
    }
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

  async function handleSyncStocks() {
    const stockHoldings = investments.filter(inv => (inv.type === 'stock' || inv.type === 'etf') && inv.ticker);
    if (stockHoldings.length === 0) {
      setStockSyncError('No stock or ETF holdings with a ticker to sync.');
      return;
    }
    setStockSyncing(true);
    setStockSyncError('');
    try {
      const tickers = Array.from(new Set(stockHoldings.map(h => h.ticker!)));
      const res = await fetch(`/api/quote?symbols=${tickers.map(encodeURIComponent).join(',')}`);
      if (!res.ok) throw new Error('Price service unavailable, try again later.');
      const data = await res.json();
      const unresolved: string[] = [];
      stockHoldings.forEach(h => {
        const price = data[h.ticker!];
        if (typeof price === 'number') updateInvestment(h.id, { currentPrice: price });
        else unresolved.push(h.ticker!);
      });
      setStockLastSynced(new Date().toLocaleTimeString());
      setStockSyncError(unresolved.length > 0 ? `Couldn't get a live price for: ${unresolved.join(', ')}.` : '');
    } catch (err) {
      setStockSyncError(err instanceof Error ? err.message : 'Failed to sync prices. (Live stock sync only works on the deployed Vercel site, not local dev.)');
    } finally {
      setStockSyncing(false);
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
          <p className="text-slate-400 text-sm mt-0.5">Track your wealth growth · prices auto-refresh every 15 min while this page is open</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSyncStocks} disabled={stockSyncing} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={16} className={stockSyncing ? 'animate-spin' : ''} /> {stockSyncing ? 'Syncing...' : 'Sync Stock Prices Now'}
          </button>
          <button onClick={handleSyncCrypto} disabled={syncing} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Syncing...' : 'Sync Crypto Prices Now'}
          </button>
          <button onClick={() => setShowImportModal(true)} className="btn-secondary flex items-center gap-2">
            <Download size={16} /> Import My Holdings
          </button>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Investment
          </button>
        </div>
      </div>
      {(syncError || lastSynced || stockSyncError || stockLastSynced) && (
        <div className="space-y-0.5">
          {(syncError || lastSynced) && (
            <p className={`text-xs ${syncError ? 'text-rose-400' : 'text-slate-500'}`}>
              {syncError || `Crypto prices synced at ${lastSynced}`}
            </p>
          )}
          {(stockSyncError || stockLastSynced) && (
            <p className={`text-xs ${stockSyncError ? 'text-rose-400' : 'text-slate-500'}`}>
              {stockSyncError || `Stock/ETF prices synced at ${stockLastSynced}`}
            </p>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card">
          <div className="text-xs text-slate-400 mb-1">Portfolio Value</div>
          <div className="text-2xl font-bold text-white"><FlashValue value={totalValue} format={formatCurrency} /></div>
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
            <FlashValue value={totalReturn} format={v => `${v >= 0 ? '+' : ''}${formatCurrency(v)}`} />
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

      {/* Holdings by Platform */}
      {platformGroups.map(group => (
        <div key={group.platform} className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">{group.platform}</h2>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-slate-500"><FlashValue value={group.value} format={formatCurrency} /> value</span>
              <span className={`font-medium ${group.gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                <FlashValue value={group.gain} format={v => `${v >= 0 ? '+' : ''}${formatCurrency(v)}`} />
              </span>
            </div>
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
              {group.holdings.map(inv => {
                const value = inv.units * inv.currentPrice;
                const cost = inv.units * inv.buyPrice;
                const gain = value - cost;
                const gainPct = cost > 0 ? (gain / cost) * 100 : 0;
                return (
                  <tr key={inv.id} onClick={() => setDetailId(inv.id)} className="hover:bg-slate-800/30 transition-colors cursor-pointer">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: inv.color + '20', color: inv.color }}>
                          {(inv.ticker || inv.name).charAt(0)}
                        </div>
                        <div>
                          <div className="text-white font-medium text-xs flex items-center gap-1.5">
                            {inv.name}
                            {inv.autoInvest && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Auto</span>
                            )}
                          </div>
                          {inv.ticker && <div className="text-slate-500 text-xs">{inv.ticker}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">{TYPE_LABELS[inv.type]}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300 text-xs">{inv.units}</td>
                    <td className="px-4 py-3 text-right text-slate-300 text-xs">{formatCurrency(inv.buyPrice)}</td>
                    <td className="px-4 py-3 text-right text-slate-300 text-xs"><FlashValue value={inv.currentPrice} format={formatCurrency} /></td>
                    <td className="px-4 py-3 text-right text-white font-medium text-xs"><FlashValue value={value} format={formatCurrency} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className={`text-xs font-semibold ${gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        <FlashValue value={gain} format={v => `${v >= 0 ? '+' : ''}${formatCurrency(v)}`} />
                      </div>
                      <div className={`text-xs ${gainPct >= 0 ? 'text-emerald-400/70' : 'text-rose-400/70'}`}>
                        <FlashValue value={gainPct} format={v => `${v >= 0 ? '+' : ''}${formatPercent(v)}`} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={e => { e.stopPropagation(); openEdit(inv); }} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); deleteInvestment(inv.id); }} className="p-1.5 rounded-lg hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 transition-colors">
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
      ))}

      {/* Detail Modal */}
      {detailInv && (() => {
        const value = detailInv.units * detailInv.currentPrice;
        const cost = detailInv.units * detailInv.buyPrice;
        const gain = value - cost;
        const gainPct = cost > 0 ? (gain / cost) * 100 : 0;
        const history = [...(detailInv.purchaseHistory || [])].sort((a, b) => a.date.localeCompare(b.date));
        const chartData = history.map(r => ({ date: formatDate(r.date), price: r.price }));
        const fmtPrice = (r: PurchaseRecord) => r.currency === 'SGD' ? `S$${r.price.toFixed(4)}` : formatCurrency(r.price);
        const fmtAmount = (r: PurchaseRecord) => r.currency === 'SGD' ? `S$${r.amount.toFixed(2)}` : formatCurrency(r.amount);
        const fmtFee = (r: PurchaseRecord) => r.currency === 'SGD' ? `S$${(r.fee || 0).toFixed(2)}` : formatCurrency(r.fee || 0);
        const hasFees = history.some(r => r.fee);
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setDetailId(null)}>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl mx-4 p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: detailInv.color + '20', color: detailInv.color }}>
                    {(detailInv.ticker || detailInv.name).charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      {detailInv.name}
                      {detailInv.autoInvest && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Auto</span>
                      )}
                    </h2>
                    <div className="text-xs text-slate-500">
                      {detailInv.ticker && <span>{detailInv.ticker} · </span>}
                      {TYPE_LABELS[detailInv.type]} · {detailInv.platform || 'Other'}
                    </div>
                  </div>
                </div>
                <button onClick={() => setDetailId(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
              </div>

              <div className="grid grid-cols-4 gap-3 mb-5">
                <div className="card py-3">
                  <div className="text-xs text-slate-400 mb-1">Units</div>
                  <div className="text-sm font-semibold text-white">{detailInv.units}</div>
                </div>
                <div className="card py-3">
                  <div className="text-xs text-slate-400 mb-1">Avg Buy Price</div>
                  <div className="text-sm font-semibold text-white">{formatCurrency(detailInv.buyPrice)}</div>
                </div>
                <div className="card py-3">
                  <div className="text-xs text-slate-400 mb-1">Current Price</div>
                  <div className="text-sm font-semibold text-white"><FlashValue value={detailInv.currentPrice} format={formatCurrency} /></div>
                </div>
                <div className="card py-3">
                  <div className="text-xs text-slate-400 mb-1">Value</div>
                  <div className="text-sm font-semibold text-white"><FlashValue value={value} format={formatCurrency} /></div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="card py-3">
                  <div className="text-xs text-slate-400 mb-1">Cost Basis</div>
                  <div className="text-sm font-semibold text-white">{formatCurrency(cost)}</div>
                </div>
                <div className="card py-3">
                  <div className="text-xs text-slate-400 mb-1">Return</div>
                  <div className={`text-sm font-semibold ${gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    <FlashValue value={gain} format={v => `${v >= 0 ? '+' : ''}${formatCurrency(v)}`} />
                  </div>
                </div>
                <div className="card py-3">
                  <div className="text-xs text-slate-400 mb-1">Return %</div>
                  <div className={`text-sm font-semibold ${gainPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    <FlashValue value={gainPct} format={v => `${v >= 0 ? '+' : ''}${formatPercent(v)}`} />
                  </div>
                </div>
              </div>

              {chartData.length > 1 ? (
                <div className="card mb-5">
                  <h3 className="text-sm font-semibold text-white mb-3">Purchase Price Over Time</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={chartData}>
                      <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                      <Tooltip formatter={(v: number) => [formatCurrency(v), 'Price']} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }} />
                      <Line type="monotone" dataKey="price" stroke={detailInv.color} strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-xs text-slate-500 mb-5">Single lump purchase — no price history to chart yet.</p>
              )}

              <h3 className="text-sm font-semibold text-white mb-2">Purchase History</h3>
              <div className="rounded-xl border border-slate-800 overflow-hidden mb-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-800/40">
                      <th className="text-left text-slate-500 font-medium px-3 py-2">Date</th>
                      <th className="text-right text-slate-500 font-medium px-3 py-2">Price</th>
                      <th className="text-right text-slate-500 font-medium px-3 py-2">Units</th>
                      <th className="text-right text-slate-500 font-medium px-3 py-2">Amount</th>
                      {hasFees && <th className="text-right text-slate-500 font-medium px-3 py-2">Fee</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {history.map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-slate-300">{formatDate(r.date)}</td>
                        <td className="px-3 py-2 text-right text-slate-300">{fmtPrice(r)}</td>
                        <td className="px-3 py-2 text-right text-slate-300">{r.units}</td>
                        <td className="px-3 py-2 text-right text-slate-300">{fmtAmount(r)}</td>
                        {hasFees && <td className="px-3 py-2 text-right text-slate-400">{r.fee ? fmtFee(r) : '—'}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {detailInv.notes && (
                <p className="text-xs text-slate-500">{detailInv.notes}</p>
              )}
            </div>
          </div>
        );
      })()}

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
              <div>
                <label className="label">Platform</label>
                <select className="input" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value as InvestmentPlatform }))}>
                  {PLATFORM_ORDER.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
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
                <label className="label">Fees / Charges (total, optional)</label>
                <input className="input" type="number" min="0" step="0.01" placeholder="e.g. 2.18 brokerage commission" value={form.fee} onChange={e => setForm(f => ({ ...f, fee: e.target.value }))} />
                <p className="text-xs text-slate-500 mt-1">Total commission charged on top of Buy Price × Units — added to your average cost, like Tiger Brokers' portfolio view.</p>
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
