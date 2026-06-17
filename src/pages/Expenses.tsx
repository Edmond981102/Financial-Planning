import { useState, useMemo } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { Plus, Search, Trash2, Edit2, X, Check, Receipt, Calendar, TrendingDown } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getCategoryTotals, getLast6MonthsData, getMonthExpenses, getMonthTransactions } from '../utils/calculations';
import { format } from 'date-fns';

const EXPENSE_CATEGORIES = [
  'Housing', 'Food & Dining', 'Transport', 'Health', 'Entertainment',
  'Shopping', 'Education', 'Travel', 'Utilities', 'Personal Care',
  'Gifts & Donations', 'Subscriptions', 'Other',
];

const CATEGORY_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
];

interface ExpForm {
  date: string;
  amount: string;
  description: string;
  category: string;
}

const emptyForm: ExpForm = {
  date: format(new Date(), 'yyyy-MM-dd'),
  amount: '',
  description: '',
  category: 'Food & Dining',
};

export default function Expenses() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useFinanceStore();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ExpForm>(emptyForm);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterMonth, setFilterMonth] = useState('');

  const expenses = useMemo(() => transactions.filter(t => t.type === 'expense'), [transactions]);

  const thisMonth = format(new Date(), 'yyyy-MM');
  const thisMonthExpenses = useMemo(() => getMonthExpenses(transactions, thisMonth), [transactions, thisMonth]);
  const dailyAverage = thisMonthExpenses / new Date().getDate();

  const categoryData = useMemo(
    () => getCategoryTotals(getMonthTransactions(transactions, thisMonth), 'expense'),
    [transactions, thisMonth]
  );
  const topCategory = categoryData[0];

  const monthlyTrend = useMemo(() => getLast6MonthsData(transactions), [transactions]);

  const filtered = useMemo(() => {
    let list = [...expenses].sort((a, b) => b.date.localeCompare(a.date));
    if (filterCategory !== 'all') list = list.filter(t => t.category === filterCategory);
    if (filterMonth) list = list.filter(t => t.date.startsWith(filterMonth));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [expenses, filterCategory, filterMonth, search]);

  function openAdd() {
    setForm(emptyForm);
    setEditId(null);
    setShowModal(true);
  }

  function openEdit(id: string) {
    const t = transactions.find(x => x.id === id);
    if (!t) return;
    setForm({ date: t.date, amount: String(t.amount), description: t.description, category: t.category });
    setEditId(id);
    setShowModal(true);
  }

  function handleSubmit() {
    if (!form.amount || !form.description || !form.date) return;
    const payload = {
      date: form.date,
      amount: parseFloat(form.amount),
      description: form.description,
      category: form.category,
      type: 'expense' as const,
    };
    if (editId) {
      updateTransaction(editId, payload);
    } else {
      addTransaction(payload);
    }
    setShowModal(false);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Expenses</h1>
          <p className="text-slate-400 text-sm mt-0.5">Where your money is going</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Expense
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <div className="text-xs text-slate-400 mb-1">This Month's Expenses</div>
          <div className="text-2xl font-bold text-rose-400">{formatCurrency(thisMonthExpenses)}</div>
          <div className="text-xs text-slate-500 mt-0.5">{format(new Date(), 'MMMM yyyy')}</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-400 mb-1">Daily Average</div>
          <div className="text-2xl font-bold text-white">{formatCurrency(dailyAverage)}</div>
          <div className="text-xs text-slate-500 mt-0.5">per day so far this month</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-400 mb-1">Top Category</div>
          <div className="text-2xl font-bold text-amber-400">{topCategory ? topCategory.name : '—'}</div>
          <div className="text-xs text-slate-500 mt-0.5">{topCategory ? `${formatCurrency(topCategory.value)} this month` : 'No expenses yet'}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 card">
          <h2 className="text-sm font-semibold text-white mb-4">6-Month Expense Trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyTrend} barSize={28}>
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip
                formatter={(v: number) => [`$${v.toFixed(0)}`, 'Expenses']}
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }}
              />
              <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-4">By Category</h2>
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={index} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`$${v.toFixed(0)}`, '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {categoryData.slice(0, 4).map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[i] }} />
                      <span className="text-slate-400">{d.name}</span>
                    </div>
                    <span className="text-slate-300 font-medium">${d.value.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-slate-500 text-xs">No expenses this month.</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input pl-8"
            placeholder="Search expenses..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-44"
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
        >
          <option value="all">All Categories</option>
          {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          type="month"
          className="input w-40"
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
        />
        {(search || filterCategory !== 'all' || filterMonth) && (
          <button
            onClick={() => { setSearch(''); setFilterCategory('all'); setFilterMonth(''); }}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
          >
            <X size={13} /> Clear
          </button>
        )}
        <span className="text-xs text-slate-500 ml-auto">{filtered.length} records</span>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left text-xs text-slate-500 font-medium px-5 py-3">Date</th>
              <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Description</th>
              <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Category</th>
              <th className="text-right text-xs text-slate-500 font-medium px-5 py-3">Amount</th>
              <th className="text-right text-xs text-slate-500 font-medium px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-slate-500 py-10">
                  <div className="flex flex-col items-center gap-2">
                    <Receipt size={24} className="text-slate-600" />
                    No expenses found
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map(t => (
                <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3 text-slate-400 whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-slate-500" />
                      {formatDate(t.date, 'MMM d, yyyy')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{t.description}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">{t.category}</span>
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-rose-400">
                    <span className="flex items-center justify-end gap-1">
                      <TrendingDown size={12} />
                      {formatCurrency(t.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(t.id)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => deleteTransaction(t.id)} className="p-1.5 rounded-lg hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md mx-4 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">{editId ? 'Edit' : 'New'} Expense</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Description *</label>
                <input className="input" placeholder="e.g. Grocery Shopping" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Amount *</label>
                  <input className="input" type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Date *</label>
                  <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Category</label>
                <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
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
