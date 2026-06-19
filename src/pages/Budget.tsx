import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Edit2, Check, X, TrendingUp, AlertTriangle, CheckCircle, Plus, Trash2, Lock, CreditCard as CreditCardIcon } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { getMonthExpenses, getMonthIncome, getMonthTransactions, getCategoryTotals } from '../utils/calculations';
import { format, subMonths, setDate, isBefore, addMonths, differenceInCalendarDays } from 'date-fns';
import { CreditCard } from '../types';

const CARD_COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981'];

function getNextDueDate(dueDay: number): Date {
  const today = new Date();
  let next = setDate(today, dueDay);
  if (isBefore(next, today)) next = setDate(addMonths(today, 1), dueDay);
  return next;
}

// Statement/due days are a recurring day-of-month (1-31), but a native date
// picker is friendlier to fill in than a number stepper — so we render one
// pinned to a fixed reference month and only read back the day component.
function dayToDateInputValue(day: number): string {
  return `2024-01-${String(Math.min(31, Math.max(1, day || 1))).padStart(2, '0')}`;
}
function dateInputValueToDay(value: string): number {
  return Math.min(31, Math.max(1, parseInt(value.slice(-2), 10) || 1));
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
    transactions, budgetTemplate, budgetHistory, updateBudgetTemplate,
    investments, profile, creditCards, addCreditCard, updateCreditCard, deleteCreditCard,
  } = useFinanceStore();
  const currentRealMonth = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(currentRealMonth);
  const [editMode, setEditMode] = useState(false);
  const [draftBudget, setDraftBudget] = useState<Record<string, string>>({});
  const [newCatName, setNewCatName] = useState('');
  const [newCatAmount, setNewCatAmount] = useState('');

  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardDraft, setCardDraft] = useState<Record<string, string>>({});
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCard, setNewCard] = useState({ name: '', limit: '', currentBalance: '0', statementDay: '1', dueDay: '15' });

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
    updateBudgetTemplate(categories);
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

  const thisMonthIncome = getMonthIncome(transactions, currentRealMonth);
  const monthlyAutoInvest = investments.reduce((sum, inv) => {
    if (!inv.autoInvest) return sum;
    return sum + (inv.autoInvest.frequency === 'weekly' ? inv.autoInvest.amountUsd * 52 / 12 : inv.autoInvest.amountUsd);
  }, 0);
  const actualExpensesPct = thisMonthIncome > 0 ? (getMonthExpenses(transactions, currentRealMonth) / thisMonthIncome) * 100 : 0;
  const actualInvestmentsPct = thisMonthIncome > 0 ? (monthlyAutoInvest / thisMonthIncome) * 100 : 0;
  const actualSavingsPct = Math.max(0, 100 - actualExpensesPct - actualInvestmentsPct);

  const targets = profile.allocationTargets ?? { savingsPct: 20, expensesPct: 60, investmentsPct: 20 };

  function startEditCard(card: CreditCard) {
    setEditingCardId(card.id);
    setCardDraft({
      name: card.name,
      limit: String(card.limit),
      currentBalance: String(card.currentBalance),
      statementDay: String(card.statementDay),
      dueDay: String(card.dueDay),
    });
  }

  function saveCardEdit() {
    if (!editingCardId) return;
    updateCreditCard(editingCardId, {
      name: cardDraft.name.trim(),
      limit: parseFloat(cardDraft.limit) || 0,
      currentBalance: parseFloat(cardDraft.currentBalance) || 0,
      statementDay: Math.min(31, Math.max(1, parseInt(cardDraft.statementDay) || 1)),
      dueDay: Math.min(31, Math.max(1, parseInt(cardDraft.dueDay) || 1)),
    });
    setEditingCardId(null);
  }

  function submitNewCard() {
    if (!newCard.name.trim() || !newCard.limit) return;
    addCreditCard({
      name: newCard.name.trim(),
      limit: parseFloat(newCard.limit) || 0,
      currentBalance: parseFloat(newCard.currentBalance) || 0,
      statementDay: Math.min(31, Math.max(1, parseInt(newCard.statementDay) || 1)),
      dueDay: Math.min(31, Math.max(1, parseInt(newCard.dueDay) || 1)),
      color: CARD_COLORS[creditCards.length % CARD_COLORS.length],
    });
    setNewCard({ name: '', limit: '', currentBalance: '0', statementDay: '1', dueDay: '15' });
    setShowAddCard(false);
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
          <p className="text-slate-400 text-sm mt-0.5">
            {isPastMonth ? 'Viewing a past, locked budget' : 'Set limits — changes apply to this month and onward'}
          </p>
        </div>
        <div className="flex items-center gap-3">
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

      {/* Income Allocation: target vs actual */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Income Allocation — This Month</h2>
          <span className="text-xs text-slate-500">Target set during profile setup</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
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

      {/* Credit Cards */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Credit Cards</h2>
          <button onClick={() => setShowAddCard(s => !s)} className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3">
            <Plus size={13} /> Add Card
          </button>
        </div>

        {creditCards.length === 0 && !showAddCard && (
          <p className="text-slate-500 text-sm py-4 text-center">No credit cards added yet.</p>
        )}

        <div className="space-y-3">
          {creditCards.map((c) => {
            const isEditing = editingCardId === c.id;
            const utilization = c.limit > 0 ? Math.min(100, (c.currentBalance / c.limit) * 100) : 0;
            const daysUntilDue = differenceInCalendarDays(getNextDueDate(c.dueDay), new Date());
            const dueSoon = daysUntilDue <= 5;

            if (isEditing) {
              return (
                <div key={c.id} className="flex items-end gap-2 bg-slate-800/60 rounded-xl p-3">
                  <div className="flex-1">
                    <label className="label">Name</label>
                    <input className="input" value={cardDraft.name} onChange={e => setCardDraft(d => ({ ...d, name: e.target.value }))} />
                  </div>
                  <div className="w-28">
                    <label className="label">Limit</label>
                    <input className="input" type="number" value={cardDraft.limit} onChange={e => setCardDraft(d => ({ ...d, limit: e.target.value }))} />
                  </div>
                  <div className="w-28">
                    <label className="label">Balance</label>
                    <input className="input" type="number" value={cardDraft.currentBalance} onChange={e => setCardDraft(d => ({ ...d, currentBalance: e.target.value }))} />
                  </div>
                  <div className="w-36">
                    <label className="label">Statement date</label>
                    <input
                      className="input"
                      type="date"
                      value={dayToDateInputValue(parseInt(cardDraft.statementDay, 10))}
                      onChange={e => setCardDraft(d => ({ ...d, statementDay: String(dateInputValueToDay(e.target.value)) }))}
                    />
                  </div>
                  <div className="w-36">
                    <label className="label">Due date</label>
                    <input
                      className="input"
                      type="date"
                      value={dayToDateInputValue(parseInt(cardDraft.dueDay, 10))}
                      onChange={e => setCardDraft(d => ({ ...d, dueDay: String(dateInputValueToDay(e.target.value)) }))}
                    />
                  </div>
                  <button onClick={saveCardEdit} className="btn-primary p-2"><Check size={14} /></button>
                  <button onClick={() => setEditingCardId(null)} className="btn-secondary p-2"><X size={14} /></button>
                </div>
              );
            }

            return (
              <div key={c.id} className="flex items-center justify-between gap-4 bg-slate-800/40 rounded-xl p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.color + '20' }}>
                    <CreditCardIcon size={16} style={{ color: c.color }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-white font-medium truncate">{c.name}</div>
                    <div className="text-xs text-slate-500">
                      Statement day {c.statementDay} · Due day {c.dueDay}
                      {dueSoon && <span className="text-amber-400 ml-1.5">· due in {daysUntilDue}d</span>}
                    </div>
                  </div>
                </div>
                <div className="w-40 shrink-0">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{formatCurrency(c.currentBalance)}</span>
                    <span className="text-slate-500">of {formatCurrency(c.limit)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${utilization}%`, background: utilization > 80 ? '#f43f5e' : c.color }} />
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => startEditCard(c)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-white transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => deleteCreditCard(c.id)} className="p-1.5 rounded-lg hover:bg-rose-500/15 text-slate-500 hover:text-rose-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}

          {showAddCard && (
            <div className="flex items-end gap-2 bg-slate-800/60 rounded-xl p-3">
              <div className="flex-1">
                <label className="label">Card name</label>
                <input className="input" value={newCard.name} onChange={e => setNewCard(d => ({ ...d, name: e.target.value }))} />
              </div>
              <div className="w-28">
                <label className="label">Limit</label>
                <input className="input" type="number" value={newCard.limit} onChange={e => setNewCard(d => ({ ...d, limit: e.target.value }))} />
              </div>
              <div className="w-28">
                <label className="label">Balance</label>
                <input className="input" type="number" value={newCard.currentBalance} onChange={e => setNewCard(d => ({ ...d, currentBalance: e.target.value }))} />
              </div>
              <div className="w-36">
                <label className="label">Statement date</label>
                <input
                  className="input"
                  type="date"
                  value={dayToDateInputValue(parseInt(newCard.statementDay, 10))}
                  onChange={e => setNewCard(d => ({ ...d, statementDay: String(dateInputValueToDay(e.target.value)) }))}
                />
              </div>
              <div className="w-36">
                <label className="label">Due date</label>
                <input
                  className="input"
                  type="date"
                  value={dayToDateInputValue(parseInt(newCard.dueDay, 10))}
                  onChange={e => setNewCard(d => ({ ...d, dueDay: String(dateInputValueToDay(e.target.value)) }))}
                />
              </div>
              <button onClick={submitNewCard} className="btn-primary p-2"><Check size={14} /></button>
              <button onClick={() => setShowAddCard(false)} className="btn-secondary p-2"><X size={14} /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
