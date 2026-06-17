import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Edit2, Check, X, TrendingUp, AlertTriangle, CheckCircle, Plus, Trash2 } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency } from '../utils/formatters';
import { getMonthExpenses, getMonthTransactions, getCategoryTotals } from '../utils/calculations';
import { format, subMonths } from 'date-fns';

const DEFAULT_BUDGET_CATEGORIES: Record<string, number> = {
  'Housing': 1500,
  'Food & Dining': 500,
  'Transport': 150,
  'Health': 200,
  'Entertainment': 100,
  'Shopping': 200,
  'Utilities': 120,
  'Personal Care': 80,
  'Education': 100,
  'Gifts & Donations': 50,
  'Subscriptions': 200,
  'Other': 100,
};

export default function Budget() {
  const { transactions, budgets, setBudget } = useFinanceStore();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [editMode, setEditMode] = useState(false);
  const [draftBudget, setDraftBudget] = useState<Record<string, string>>({});
  const [newCatName, setNewCatName] = useState('');
  const [newCatAmount, setNewCatAmount] = useState('');

  const currentBudget = useMemo(
    () => budgets.find(b => b.month === selectedMonth),
    [budgets, selectedMonth]
  );

  const budgetCategories = currentBudget?.categories || DEFAULT_BUDGET_CATEGORIES;

  const actualByCategory = useMemo(() => {
    const txns = getMonthTransactions(transactions, selectedMonth);
    const totals = getCategoryTotals(txns, 'expense');
    const map: Record<string, number> = {};
    totals.forEach(({ name, value }) => { map[name] = value; });
    return map;
  }, [transactions, selectedMonth]);

  const totalBudget = Object.values(budgetCategories).reduce((s, v) => s + v, 0);
  const totalActual = getMonthExpenses(transactions, selectedMonth);
  const totalRemaining = totalBudget - totalActual;

  const chartData = Object.entries(budgetCategories).map(([category, budget]) => ({
    category,
    budget,
    actual: actualByCategory[category] || 0,
    over: (actualByCategory[category] || 0) > budget,
  }));

  function startEdit() {
    const draft: Record<string, string> = {};
    Object.entries(budgetCategories).forEach(([k, v]) => { draft[k] = String(v); });
    setDraftBudget(draft);
    setEditMode(true);
  }

  function saveBudget() {
    const categories: Record<string, number> = {};
    Object.entries(draftBudget).forEach(([k, v]) => {
      const val = parseFloat(v);
      if (!isNaN(val) && val >= 0) categories[k] = val;
    });
    setBudget({ month: selectedMonth, categories });
    setEditMode(false);
  }

  function addCategory() {
    const name = newCatName.trim();
    if (!name || draftBudget[name] !== undefined) return;
    setDraftBudget(d => ({ ...d, [name]: newCatAmount || '0' }));
    setNewCatName('');
    setNewCatAmount('');
  }

  function removeCategory(category: string) {
    setDraftBudget(d => {
      const next = { ...d };
      delete next[category];
      return next;
    });
  }

  const lastThreeMonths = Array.from({ length: 4 }, (_, i) => {
    const d = subMonths(new Date(), i);
    return format(d, 'yyyy-MM');
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Budget Planner</h1>
          <p className="text-slate-400 text-sm mt-0.5">Set limits, track spending</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            className="input w-44"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
          />
          {editMode ? (
            <div className="flex gap-2">
              <button onClick={() => setEditMode(false)} className="btn-secondary flex items-center gap-1.5"><X size={14} /> Cancel</button>
              <button onClick={saveBudget} className="btn-primary flex items-center gap-1.5"><Check size={14} /> Save</button>
            </div>
          ) : (
            <button onClick={startEdit} className="btn-secondary flex items-center gap-1.5">
              <Edit2 size={14} /> Edit Budget
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <div className="text-xs text-slate-400 mb-1">Total Budget</div>
          <div className="text-2xl font-bold text-white">{formatCurrency(totalBudget)}</div>
          <div className="text-xs text-slate-500 mt-0.5">for {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-400 mb-1">Total Spent</div>
          <div className={`text-2xl font-bold ${totalActual > totalBudget ? 'text-rose-400' : 'text-white'}`}>
            {formatCurrency(totalActual)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{totalBudget > 0 ? ((totalActual / totalBudget) * 100).toFixed(1) : 0}% of budget used</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-400 mb-1">Remaining</div>
          <div className={`text-2xl font-bold ${totalRemaining < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {formatCurrency(Math.abs(totalRemaining))}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{totalRemaining < 0 ? 'Over budget!' : 'left to spend'}</div>
        </div>
      </div>

      {/* Budget vs Actual Chart */}
      <div className="card">
        <h2 className="text-sm font-semibold text-white mb-4">Budget vs Actual by Category</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} layout="vertical" barGap={3}>
            <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
            <YAxis type="category" dataKey="category" width={110} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(v: number, name: string) => [`$${v.toFixed(0)}`, name === 'budget' ? 'Budget' : 'Actual']}
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }}
            />
            <Bar dataKey="budget" name="Budget" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={8} />
            <Bar dataKey="actual" name="Actual" radius={[0, 4, 4, 0]} barSize={8}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.over ? '#f43f5e' : '#10b981'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category Details */}
      <div className="card">
        <h2 className="text-sm font-semibold text-white mb-4">Category Breakdown</h2>
        <div className="space-y-3">
          {(editMode ? Object.keys(draftBudget) : Object.keys(budgetCategories)).map((category) => {
            const budget = editMode ? (parseFloat(draftBudget[category]) || 0) : budgetCategories[category];
            const actual = actualByCategory[category] || 0;
            const pct = budget > 0 ? Math.min(100, (actual / budget) * 100) : 0;
            const over = actual > budget;
            const remaining = budget - actual;

            return (
              <div key={category} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {over ? (
                      <AlertTriangle size={13} className="text-rose-400" />
                    ) : pct >= 80 ? (
                      <TrendingUp size={13} className="text-amber-400" />
                    ) : (
                      <CheckCircle size={13} className="text-emerald-400" />
                    )}
                    <span className="text-slate-300">{category}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {editMode ? (
                      <input
                        type="number"
                        className="input w-24 text-right py-1"
                        value={draftBudget[category] || ''}
                        onChange={e => setDraftBudget(d => ({ ...d, [category]: e.target.value }))}
                      />
                    ) : (
                      <span className="text-slate-500 text-xs">budget: {formatCurrency(budget)}</span>
                    )}
                    <span className={`font-medium text-xs w-20 text-right ${over ? 'text-rose-400' : 'text-slate-300'}`}>
                      {formatCurrency(actual)} spent
                    </span>
                    <span className={`text-xs w-24 text-right ${remaining < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {remaining < 0 ? `-${formatCurrency(Math.abs(remaining))}` : `${formatCurrency(remaining)} left`}
                    </span>
                    {editMode && (
                      <button onClick={() => removeCategory(category)} className="p-1 rounded-lg hover:bg-rose-500/15 text-slate-500 hover:text-rose-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: over ? '#f43f5e' : pct >= 80 ? '#f59e0b' : '#10b981',
                    }}
                  />
                </div>
              </div>
            );
          })}

          {editMode && (
            <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
              <input
                type="text"
                placeholder="New category name"
                className="input flex-1 py-1.5 text-sm"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
              />
              <input
                type="number"
                placeholder="Amount"
                className="input w-28 py-1.5 text-sm"
                value={newCatAmount}
                onChange={e => setNewCatAmount(e.target.value)}
              />
              <button onClick={addCategory} className="btn-secondary py-1.5 px-3 flex items-center gap-1.5 shrink-0">
                <Plus size={13} /> Add
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
