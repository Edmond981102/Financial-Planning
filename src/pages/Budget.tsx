import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Edit2, Check, X, TrendingUp, AlertTriangle, CheckCircle, Plus, Trash2, Lock, GripVertical } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { getMonthExpenses, getMonthIncome, getMonthSavings, getMonthTransactions, getCategoryTotals } from '../utils/calculations';
import { format, subMonths } from 'date-fns';
import MoneyInput from '../components/common/MoneyInput';
import CurrencyToggle from '../components/common/CurrencyToggle';
import type { AllocationBucket } from '../types';

const DEFAULT_BUCKETS: AllocationBucket[] = ['savings', 'expenses', 'investments'];
const NEW_BUCKET_OPTION = '__new__';

const ALLOCATION_LABELS: Record<string, string> = {
  savings: 'Savings',
  expenses: 'Expenses',
  investments: 'Investments',
};

const ALLOCATION_STYLES: Record<string, string> = {
  savings: 'bg-sky-500/15 text-sky-400',
  expenses: 'bg-slate-500/15 text-slate-400',
  investments: 'bg-violet-500/15 text-violet-400',
};
const DEFAULT_ALLOCATION_STYLE = 'bg-amber-500/15 text-amber-400';

function bucketLabel(bucket: AllocationBucket): string {
  return ALLOCATION_LABELS[bucket] ?? bucket;
}
function bucketStyle(bucket: AllocationBucket): string {
  return ALLOCATION_STYLES[bucket] ?? DEFAULT_ALLOCATION_STYLE;
}

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
  const {
    transactions, budgetTemplate, categoryAllocations, budgetHistory, updateBudgetTemplate,
    myrToSgdRate, setMyrToSgdRate,
  } = useFinanceStore();
  const currentRealMonth = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(currentRealMonth);
  const [editMode, setEditMode] = useState(false);
  const [draftCategories, setDraftCategories] = useState<{ id: string; name: string; amount: string; currency: 'SGD' | 'MYR'; allocation: AllocationBucket }[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatAmount, setNewCatAmount] = useState('');
  const [newCatCurrency, setNewCatCurrency] = useState<'SGD' | 'MYR'>('SGD');
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const isPastMonth = selectedMonth < currentRealMonth;

  const historicalBudget = useMemo(
    () => budgetHistory.find(b => b.month === selectedMonth),
    [budgetHistory, selectedMonth]
  );

  // Past months use a frozen snapshot so later template edits never rewrite history.
  // Current/future months always reflect the live shared template.
  const budgetCategories = isPastMonth
    ? historicalBudget?.categories || budgetTemplate || DEFAULT_BUDGET_CATEGORIES
    : Object.keys(budgetTemplate).length > 0 ? budgetTemplate : DEFAULT_BUDGET_CATEGORIES;

  const actualByCategory = useMemo(() => {
    const txns = getMonthTransactions(transactions, selectedMonth);
    // Budgeted categories can be tagged as either expense or saving transactions
    // (e.g. "Spouse Savings"), so both count toward a category's actual spend.
    const totals = [...getCategoryTotals(txns, 'expense'), ...getCategoryTotals(txns, 'saving')];
    const map: Record<string, number> = {};
    totals.forEach(({ name, value }) => { map[name] = (map[name] || 0) + value; });
    return map;
  }, [transactions, selectedMonth]);

  const totalBudget = Object.values(budgetCategories).reduce((s, v) => s + v, 0);
  const totalActual = getMonthExpenses(transactions, selectedMonth) + getMonthSavings(transactions, selectedMonth);
  const totalRemaining = totalBudget - totalActual;

  const chartData = Object.entries(budgetCategories).map(([category, budget]) => ({
    category,
    budget,
    actual: actualByCategory[category] || 0,
    over: (actualByCategory[category] || 0) > budget,
  }));

  function startEdit() {
    setDraftCategories(
      Object.entries(budgetCategories).map(([name, amount]) => ({
        id: crypto.randomUUID(),
        name,
        amount: String(amount),
        currency: 'SGD' as const,
        allocation: categoryAllocations[name] ?? 'expenses',
      }))
    );
    setEditMode(true);
  }

  function saveBudget() {
    const categories: Record<string, number> = {};
    const allocations: Record<string, AllocationBucket> = {};
    draftCategories.forEach(({ name, amount, currency, allocation }) => {
      const trimmedName = name.trim();
      const val = parseFloat(amount);
      if (trimmedName && !isNaN(val) && val >= 0) {
        categories[trimmedName] = currency === 'MYR' ? val * myrToSgdRate : val;
        allocations[trimmedName] = allocation;
      }
    });
    updateBudgetTemplate(categories, allocations);
    setEditMode(false);
  }

  function addCategory() {
    const name = newCatName.trim();
    if (!name || draftCategories.some(c => c.name === name)) return;
    const rawAmount = parseFloat(newCatAmount) || 0;
    const sgdAmount = newCatCurrency === 'MYR' ? rawAmount * myrToSgdRate : rawAmount;
    setDraftCategories(d => [...d, { id: crypto.randomUUID(), name, amount: String(sgdAmount), currency: 'SGD', allocation: 'expenses' }]);
    setNewCatName('');
    setNewCatAmount('');
    setNewCatCurrency('SGD');
  }

  function setCategoryAllocation(id: string, allocation: AllocationBucket) {
    setDraftCategories(d => d.map(c => (c.id === id ? { ...c, allocation } : c)));
  }

  function handleAllocationChange(id: string, value: string) {
    if (value !== NEW_BUCKET_OPTION) {
      setCategoryAllocation(id, value);
      return;
    }
    const name = window.prompt('New allocation bucket name (e.g. "Giving"):')?.trim();
    if (name) setCategoryAllocation(id, name);
  }

  function removeCategory(id: string) {
    setDraftCategories(d => d.filter(c => c.id !== id));
  }

  function renameCategory(id: string, name: string) {
    setDraftCategories(d => d.map(c => (c.id === id ? { ...c, name } : c)));
  }

  function setCategoryAmount(id: string, amount: string) {
    setDraftCategories(d => d.map(c => (c.id === id ? { ...c, amount } : c)));
  }

  function setCategoryCurrency(id: string, currency: 'SGD' | 'MYR') {
    setDraftCategories(d => d.map(c => (c.id === id ? { ...c, currency } : c)));
  }

  function moveCategory(from: number, to: number) {
    setDraftCategories(d => {
      const next = [...d];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  const thisMonthIncome = getMonthIncome(transactions, currentRealMonth);

  // Always reflects the live budget template (not a past month's frozen snapshot),
  // since the Income Allocation widget is fixed to "This Month".
  const liveBudgetCategories = Object.keys(budgetTemplate).length > 0 ? budgetTemplate : DEFAULT_BUDGET_CATEGORIES;

  // Target % is derived entirely from how budget categories are tagged to buckets —
  // it's not a separate user-set goal, so there's nothing to edit here.
  const { bucketBudgetTotals, categoryCountByBucket } = useMemo(() => {
    const budgetTotals: Record<string, number> = {};
    const counts: Record<string, number> = {};
    Object.entries(liveBudgetCategories).forEach(([cat, amount]) => {
      const bucket = categoryAllocations[cat] ?? 'expenses';
      budgetTotals[bucket] = (budgetTotals[bucket] || 0) + amount;
      counts[bucket] = (counts[bucket] || 0) + 1;
    });
    return { bucketBudgetTotals: budgetTotals, categoryCountByBucket: counts };
  }, [liveBudgetCategories, categoryAllocations]);

  // "Actual" is real spending this month, grouped by the same bucket tags.
  const bucketSpentTotals = useMemo(() => {
    const txns = getMonthTransactions(transactions, currentRealMonth);
    const totals = [...getCategoryTotals(txns, 'expense'), ...getCategoryTotals(txns, 'saving')];
    const spent: Record<string, number> = {};
    totals.forEach(({ name, value }) => {
      const bucket = categoryAllocations[name] ?? 'expenses';
      spent[bucket] = (spent[bucket] || 0) + value;
    });
    return spent;
  }, [transactions, currentRealMonth, categoryAllocations]);

  const knownBuckets = useMemo(() => {
    const set = new Set<string>(DEFAULT_BUCKETS);
    Object.values(categoryAllocations).forEach(b => set.add(b));
    draftCategories.forEach(d => set.add(d.allocation));
    return Array.from(set);
  }, [categoryAllocations, draftCategories]);

  // A bucket only appears once a budget category is actually tagged to it.
  const visibleBuckets = knownBuckets.filter((b) => (categoryCountByBucket[b] || 0) > 0);

  const lastThreeMonths = Array.from({ length: 4 }, (_, i) => {
    const d = subMonths(new Date(), i);
    return format(d, 'yyyy-MM');
  });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Budget Planner</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {isPastMonth ? 'Viewing a past, locked budget' : 'Set limits — changes apply to this month and onward'}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="month"
            className="input w-44"
            value={selectedMonth}
            onChange={e => { setSelectedMonth(e.target.value); setEditMode(false); }}
          />
          {isPastMonth ? (
            <span className="text-xs text-slate-500 flex items-center gap-1.5 px-3 py-2 bg-slate-800 rounded-xl">
              <Lock size={13} /> Past months are locked
            </span>
          ) : editMode ? (
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

      {/* Income Allocation: target vs actual */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-white">Income Allocation — This Month</h2>
          <span className="text-xs text-slate-500">Target % comes from how your budget categories are tagged below</span>
        </div>
        {visibleBuckets.length === 0 ? (
          <p className="text-sm text-slate-500">Tag a budget category to a bucket below to see your allocation here.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {visibleBuckets.map((bucket) => {
              const targetPct = thisMonthIncome > 0 ? ((bucketBudgetTotals[bucket] || 0) / thisMonthIncome) * 100 : 0;
              const actualPct = thisMonthIncome > 0 ? ((bucketSpentTotals[bucket] || 0) / thisMonthIncome) * 100 : 0;
              const good = bucket === 'expenses' ? actualPct <= targetPct : actualPct >= targetPct;
              return (
                <div key={bucket}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-400">{bucketLabel(bucket)}</span>
                    <span className={good ? 'text-emerald-400' : 'text-amber-400'}>
                      {formatPercent(actualPct, 0)}{' '}
                      <span className="text-slate-500">/ {formatPercent(targetPct, 0)} target</span>
                    </span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, actualPct)}%`, background: good ? '#10b981' : '#f59e0b' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Budget vs Actual Chart */}
      <div className="card">
        <h2 className="text-sm font-semibold text-white mb-4">Budget vs Actual by Category</h2>
        <ResponsiveContainer width="100%" height={Math.max(250, chartData.length * 32)}>
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
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-white">Category Breakdown</h2>
          <span className="text-xs text-slate-400">
            Spent: <span className="text-white font-semibold">{formatCurrency(totalActual)}</span>
            <span className="text-slate-500"> / {formatCurrency(totalBudget)}</span>
          </span>
        </div>
        <div className="space-y-3">
          {editMode
            ? draftCategories.map((draft, index) => {
                const budget = parseFloat(draft.amount) || 0;
                const actual = actualByCategory[draft.name] || 0;
                const pct = budget > 0 ? Math.min(100, (actual / budget) * 100) : 0;
                const over = actual > budget;
                const remaining = budget - actual;

                return (
                  <div
                    key={draft.id}
                    className={`space-y-1.5 rounded-lg transition-colors ${dragIndex === index ? 'opacity-40' : ''}`}
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragIndex !== null && dragIndex !== index) moveCategory(dragIndex, index);
                      setDragIndex(null);
                    }}
                    onDragEnd={() => setDragIndex(null)}
                  >
                    <div className="flex items-center justify-between text-sm flex-wrap gap-y-2">
                      <div className="flex items-center gap-2 flex-1 min-w-[160px]">
                        <GripVertical size={14} className="text-slate-600 cursor-grab shrink-0" />
                        {over ? (
                          <AlertTriangle size={13} className="text-rose-400 shrink-0" />
                        ) : pct >= 80 ? (
                          <TrendingUp size={13} className="text-amber-400 shrink-0" />
                        ) : (
                          <CheckCircle size={13} className="text-emerald-400 shrink-0" />
                        )}
                        <input
                          type="text"
                          className="input py-1 text-sm flex-1 min-w-0"
                          value={draft.name}
                          onChange={e => renameCategory(draft.id, e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-4 flex-wrap justify-end">
                        <MoneyInput
                          className="input w-24 text-right py-1"
                          value={draft.amount}
                          onChange={raw => setCategoryAmount(draft.id, raw)}
                        />
                        <CurrencyToggle
                          currency={draft.currency}
                          onCurrencyChange={c => setCategoryCurrency(draft.id, c)}
                          rate={myrToSgdRate}
                          onRateChange={setMyrToSgdRate}
                          convertedAmount={draft.currency === 'MYR' ? (parseFloat(draft.amount) || 0) * myrToSgdRate : undefined}
                        />
                        <select
                          className={`badge border-0 cursor-pointer ${bucketStyle(draft.allocation)}`}
                          value={draft.allocation}
                          onChange={e => handleAllocationChange(draft.id, e.target.value)}
                        >
                          {knownBuckets.map((bucket) => (
                            <option key={bucket} value={bucket}>{bucketLabel(bucket)}</option>
                          ))}
                          <option value={NEW_BUCKET_OPTION}>+ New bucket…</option>
                        </select>
                        <span className={`font-medium text-xs w-20 text-right ${over ? 'text-rose-400' : 'text-slate-300'}`}>
                          {formatCurrency(actual)} spent
                        </span>
                        <span className={`text-xs w-24 text-right ${remaining < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {remaining < 0 ? `-${formatCurrency(Math.abs(remaining))}` : `${formatCurrency(remaining)} left`}
                        </span>
                        <button onClick={() => removeCategory(draft.id)} className="p-1 rounded-lg hover:bg-rose-500/15 text-slate-500 hover:text-rose-400 transition-colors">
                          <Trash2 size={13} />
                        </button>
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
              })
            : Object.keys(budgetCategories).map((category) => {
                const budget = budgetCategories[category];
                const actual = actualByCategory[category] || 0;
                const pct = budget > 0 ? Math.min(100, (actual / budget) * 100) : 0;
                const over = actual > budget;
                const remaining = budget - actual;

                return (
                  <div key={category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm flex-wrap gap-y-1">
                      <div className="flex items-center gap-2">
                        {over ? (
                          <AlertTriangle size={13} className="text-rose-400" />
                        ) : pct >= 80 ? (
                          <TrendingUp size={13} className="text-amber-400" />
                        ) : (
                          <CheckCircle size={13} className="text-emerald-400" />
                        )}
                        <span className="text-slate-300">{category}</span>
                        <span className={`badge ${bucketStyle(categoryAllocations[category] ?? 'expenses')}`}>
                          {bucketLabel(categoryAllocations[category] ?? 'expenses')}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 flex-wrap justify-end">
                        <span className="text-slate-500 text-xs">budget: {formatCurrency(budget)}</span>
                        <span className={`font-medium text-xs w-20 text-right ${over ? 'text-rose-400' : 'text-slate-300'}`}>
                          {formatCurrency(actual)} spent
                        </span>
                        <span className={`text-xs w-24 text-right ${remaining < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {remaining < 0 ? `-${formatCurrency(Math.abs(remaining))}` : `${formatCurrency(remaining)} left`}
                        </span>
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
            <div className="flex items-center gap-2 pt-3 border-t border-slate-800 flex-wrap">
              <input
                type="text"
                placeholder="New category name"
                className="input flex-1 py-1.5 text-sm min-w-32"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
              />
              <MoneyInput
                placeholder="Amount"
                className="input w-28 py-1.5 text-sm"
                value={newCatAmount}
                onChange={raw => setNewCatAmount(raw)}
              />
              <CurrencyToggle
                currency={newCatCurrency}
                onCurrencyChange={setNewCatCurrency}
                rate={myrToSgdRate}
                onRateChange={setMyrToSgdRate}
                convertedAmount={newCatCurrency === 'MYR' ? (parseFloat(newCatAmount) || 0) * myrToSgdRate : undefined}
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
