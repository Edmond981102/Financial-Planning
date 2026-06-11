import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Plus, Trash2, Edit2, X, Check, TrendingUp, TrendingDown } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency, formatDate, formatPercent } from '../utils/formatters';
import { getTotalInvestmentValue, getTotalInvestmentCost, getInvestmentReturn } from '../utils/calculations';
import { Investment, InvestmentType } from '../types';

const TYPE_LABELS: Record<InvestmentType, string> = {
  stock: 'Stock', etf: 'ETF', crypto: 'Crypto', mutual_fund: 'Mutual Fund',
  bond: 'Bond', real_estate: 'Real Estate', gold: 'Gold', other: 'Other',
};

const INV_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444',
  '#06b6d4', '#ec4899', '#84cc16',
];

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Investment Portfolio</h1>
          <p className="text-slate-400 text-sm mt-0.5">Track your wealth growth</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Investment
        </button>
      </div>

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
