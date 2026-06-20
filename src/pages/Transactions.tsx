import { useState, useMemo } from 'react';
import { Plus, Search, Filter, Trash2, Edit2, X, Check } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import { format } from 'date-fns';
import MoneyInput from '../components/common/MoneyInput';
import CurrencyToggle from '../components/common/CurrencyToggle';

const EXPENSE_CATEGORIES = [
  'Housing', 'Food & Dining', 'Transport', 'Health', 'Entertainment',
  'Shopping', 'Education', 'Travel', 'Utilities', 'Personal Care',
  'Gifts & Donations', 'Subscriptions', 'Other',
];
const INCOME_CATEGORIES = [
  'Salary', 'Freelance', 'Investment Returns', 'Rental Income',
  'Business', 'Bonus', 'Gift', 'Other',
];

type FilterType = 'all' | 'income' | 'expense';

interface TxForm {
  date: string;
  amount: string;
  description: string;
  category: string;
  type: 'income' | 'expense';
  accountId: string;
}

const emptyForm: TxForm = {
  date: format(new Date(), 'yyyy-MM-dd'),
  amount: '',
  description: '',
  category: 'Food & Dining',
  type: 'expense',
  accountId: '',
};

export default function Transactions() {
  const { transactions, accounts, creditCards, budgetTemplate, myrToSgdRate, setMyrToSgdRate, addTransaction, updateTransaction, deleteTransaction } = useFinanceStore();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TxForm>(emptyForm);
  const [amountCurrency, setAmountCurrency] = useState<'SGD' | 'MYR'>('SGD');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterMonth, setFilterMonth] = useState('');

  const filtered = useMemo(() => {
    let list = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
    if (filterType !== 'all') list = list.filter(t => t.type === filterType);
    if (filterMonth) list = list.filter(t => t.date.startsWith(filterMonth));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [transactions, filterType, filterMonth, search]);

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  function openAdd() {
    const defaultExpenseCategories = Object.keys(budgetTemplate).length > 0 ? Object.keys(budgetTemplate) : EXPENSE_CATEGORIES;
    setForm({ ...emptyForm, category: defaultExpenseCategories[0] });
    setEditId(null);
    setAmountCurrency('SGD');
    setShowModal(true);
  }

  function openEdit(id: string) {
    const t = transactions.find(x => x.id === id);
    if (!t) return;
    setForm({ date: t.date, amount: String(t.amount), description: t.description, category: t.category, type: t.type, accountId: t.accountId ?? '' });
    setEditId(id);
    setAmountCurrency('SGD');
    setShowModal(true);
  }

  function handleSubmit() {
    if (!form.amount || !form.description || !form.date) return;
    const enteredAmount = parseFloat(form.amount) || 0;
    const payload = {
      date: form.date,
      amount: amountCurrency === 'MYR' ? enteredAmount * myrToSgdRate : enteredAmount,
      description: form.description,
      category: form.category,
      type: form.type,
      accountId: form.accountId || undefined,
    };
    if (editId) {
      updateTransaction(editId, payload);
    } else {
      addTransaction(payload);
    }
    setShowModal(false);
  }

  // Expense categories mirror whatever the user has set up in Budget, so the
  // dropdown never offers a category with no budget behind it. Falls back to
  // a starter list only before any budget category has been created.
  const expenseCategories = Object.keys(budgetTemplate).length > 0 ? Object.keys(budgetTemplate) : EXPENSE_CATEGORIES;
  // If an existing transaction's category was since removed from Budget, keep
  // it selectable here so editing the form doesn't silently change its category.
  const categories = form.type === 'income'
    ? INCOME_CATEGORIES
    : expenseCategories.includes(form.category) ? expenseCategories : [form.category, ...expenseCategories];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-slate-400 text-sm mt-0.5">Track every dollar in and out</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Transaction
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <div className="text-xs text-slate-400 mb-1">Total Income</div>
          <div className="text-xl font-bold text-emerald-400">{formatCurrency(totalIncome)}</div>
        </div>
        <div className="card text-center">
          <div className="text-xs text-slate-400 mb-1">Total Expenses</div>
          <div className="text-xl font-bold text-rose-400">{formatCurrency(totalExpenses)}</div>
        </div>
        <div className="card text-center">
          <div className="text-xs text-slate-400 mb-1">Net Balance</div>
          <div className={`text-xl font-bold ${totalIncome - totalExpenses >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(totalIncome - totalExpenses)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input pl-8"
            placeholder="Search transactions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input w-40"
          value={filterType}
          onChange={e => setFilterType(e.target.value as FilterType)}
        >
          <option value="all">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <input
          type="month"
          className="input w-40"
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
        />
        {(search || filterType !== 'all' || filterMonth) && (
          <button
            onClick={() => { setSearch(''); setFilterType('all'); setFilterMonth(''); }}
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
              <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Account</th>
              <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Type</th>
              <th className="text-right text-xs text-slate-500 font-medium px-5 py-3">Amount</th>
              <th className="text-right text-xs text-slate-500 font-medium px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-slate-500 py-10">No transactions found</td>
              </tr>
            ) : (
              filtered.map(t => {
                const account = accounts.find(a => a.id === t.accountId);
                const card = !account ? creditCards.find(c => c.id === t.accountId) : undefined;
                return (
                <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3 text-slate-400 whitespace-nowrap">{formatDate(t.date, 'MMM d, yyyy')}</td>
                  <td className="px-4 py-3 text-white font-medium">{t.description}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">{t.category}</span>
                  </td>
                  <td className="px-4 py-3">
                    {account ? (
                      <span className="text-xs flex items-center gap-1.5 text-slate-300">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: account.color }} />
                        {account.name}
                      </span>
                    ) : card ? (
                      <span className="text-xs flex items-center gap-1.5 text-slate-300">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: card.color }} />
                        {card.name}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${t.type === 'income' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                      {t.type}
                    </span>
                  </td>
                  <td className={`px-5 py-3 text-right font-semibold ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
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
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md mx-4 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">{editId ? 'Edit' : 'New'} Transaction</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              {/* Type Toggle */}
              <div className="flex rounded-xl overflow-hidden border border-slate-700 p-1 gap-1">
                {(['expense', 'income'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setForm(f => ({ ...f, type, category: type === 'income' ? 'Salary' : expenseCategories[0] }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                      form.type === type
                        ? type === 'income' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <div>
                <label className="label">Description *</label>
                <input className="input" placeholder="e.g. Grocery Shopping" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Amount *</label>
                  <MoneyInput className="input" placeholder="0.00" value={form.amount} onChange={raw => setForm(f => ({ ...f, amount: raw }))} />
                  <CurrencyToggle
                    currency={amountCurrency}
                    onCurrencyChange={setAmountCurrency}
                    rate={myrToSgdRate}
                    onRateChange={setMyrToSgdRate}
                    convertedAmount={amountCurrency === 'MYR' ? (parseFloat(form.amount) || 0) * myrToSgdRate : undefined}
                  />
                </div>
                <div>
                  <label className="label">Date *</label>
                  <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Category</label>
                  <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Account</label>
                  <select className="input" value={form.accountId} onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}>
                    <option value="">No account</option>
                    {accounts.length > 0 && (
                      <optgroup label="Accounts">
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </optgroup>
                    )}
                    {creditCards.length > 0 && (
                      <optgroup label="Credit Cards">
                        {creditCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </optgroup>
                    )}
                  </select>
                </div>
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
