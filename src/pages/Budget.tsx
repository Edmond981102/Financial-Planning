import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Edit2, Check, X, TrendingUp, AlertTriangle, CheckCircle, Plus, Trash2, Lock, GripVertical } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { getMonthExpenses, getMonthIncome, getMonthSavings, getMonthTransactions, getCategoryTotals } from '../utils/calculations';
import { format, subMonths } from 'date-fns';
import MoneyInput from '../components/common/MoneyInput';
import CurrencyToggle from '../components/common/CurrencyToggle';

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
    transactions, budgetTemplate, budgetHistory, updateBudgetTemplate,
    investments, profile,
    myrToSgdRate, setMyrToSgdRate,
  } = useFinanceStore();
  const currentRealMonth = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(currentRealMonth);
  const [editMode, setEditMode] = useState(false);
  const [draftCategories, setDraftCategories] = useState<{ id: string; name: string; amount: string; currency: 'SGD' | 'MYR' }[]>([]);
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
      }))
    );
    setEditMode(true);
  }

  function saveBudget() {
    const categories: Record<string, number> = {};
    draftCategories.forEach(({ name, amount, currency }) => {
      const trimmedName = name.trim();
      const val = parseFloat(amount);
      if (trimmedName && !isNaN(val) && val >= 0) {
        categories[trimmedName] = currency === 'MYR' ? val * myrToSgdRate : val;
      }
    });
    updateBudgetTemplate(categories);
    setEditMode(false);
  }

  function addCategory() {
    const name = newCatName.trim();
    if (!name || draftCategories.some(c => c.name === name)) return;
    const rawAmount = parseFloat(newCatAmount) || 0;
    const sgdAmount = newCatCurrency === 'MYR' ? rawAmount * myrToSgdRate : rawAmount;
    setDraftCategories(d => [...d, { id: crypto.randomUUID(), name, amount: String(sgdAmount), currency: 'SGD' }]);
    setNewCatName('');
    setNewCatAmount('');
    setNewCatCurrency('SGD');
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
  const monthlyAutoInvest = investments.reduce((sum, inv) => {
    if (!inv.autoInvest) return sum;
    return sum + (inv.autoInvest.frequency === 'weekly' ? inv.autoInvest.amountUsd * 52 / 12 : inv.autoInvest.amountUsd);
  }, 0);
  const actualExpensesPct = thisMonthIncome > 0 ? (getMonthExpenses(transactions, currentRealMonth) / thisMonthIncome) * 100 : 0;
  const actualInvestmentsPct = thisMonthIncome > 0 ? (monthlyAutoInvest / thisMonthIncome) * 100 : 0;
  const actualSavingsPct = thisMonthIncome > 0 ? (getMonthSavings(transactions, currentRealMonth) / thisMonthIncome) * 100 : 0;

  const targets = profile.allocationTargets ?? { savingsPct: 20, expensesPct: 60, investmentsPct: 20 };

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
          <span className="text-xs text-slate-500">Target set during profile setup</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Savings', target: targets.savingsPct, actual: actualSavingsPct, good: actualSavingsPct >= targets.savingsPct },
            { label: 'Expenses', target: targets.expensesPct, actual: actualExpensesPct, good: actualExpensesPct <= targets.expensesPct },
            { label: 'Investments', target: targets.investmentsPct, actual: actualInvestmentsPct, good: actualInvestmentsPct >= targets.investmentsPct },
          ].map((row) => (
            <div key={row.label}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-400">{row.label}</span>
                <span className={row.good ? 'text-emerald-400' : 'text-amber-400'}>
                  {formatPercent(row.actual, 0)} <span className="text-slate-500">/ {formatPercent(row.target, 0)} target</span>
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, row.actual)}%`, background: row.good ? '#10b981' : '#f59e0b' }} />
              </div>
            </div>
          ))}
        </div>
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
