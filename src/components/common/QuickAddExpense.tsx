import { useState } from 'react';
import { Plus, X, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { useFinanceStore } from '../../store/useFinanceStore';
import MoneyInput from './MoneyInput';

const EXPENSE_CATEGORIES = [
  'Housing', 'Food & Dining', 'Transport', 'Health', 'Entertainment',
  'Shopping', 'Education', 'Travel', 'Utilities', 'Personal Care',
  'Gifts & Donations', 'Subscriptions', 'Other',
];

const TYPE_OPTS = [
  { value: 'expense', label: 'Expense' },
  { value: 'saving', label: 'Saving' },
  { value: 'income', label: 'Income' },
] as const;

const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investment Returns', 'Rental Income', 'Business', 'Bonus', 'Gift', 'Other'];

export default function QuickAddExpense() {
  const { addTransaction, budgetTemplate, accounts, creditCards } = useFinanceStore();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'saving' | 'income'>('expense');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [accountId, setAccountId] = useState('');

  const expenseCategories = Object.keys(budgetTemplate).length > 0 ? Object.keys(budgetTemplate) : EXPENSE_CATEGORIES;
  const categories = type === 'income' ? INCOME_CATEGORIES : expenseCategories;
  const effectiveCategory = category || categories[0];

  function openFresh() {
    setAmount('');
    setType('expense');
    setCategory('');
    setDescription('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setAccountId('');
    setOpen(true);
  }

  function submit() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    addTransaction({
      date,
      amount: amt,
      description: description.trim() || effectiveCategory,
      category: effectiveCategory,
      type,
      accountId: accountId || undefined,
    });
    setOpen(false);
  }

  const allLinked = [...accounts.map(a => ({ id: a.id, name: a.name })), ...creditCards.map(c => ({ id: c.id, name: c.name }))];

  return (
    <>
      {/* Floating action button */}
      <button
        onClick={openFresh}
        title="Quick add expense"
        className="fixed bottom-6 right-5 z-40 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/30 flex items-center justify-center transition-all active:scale-95"
      >
        <Plus size={24} className="text-white" />
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl w-full max-w-sm mx-0 sm:mx-4 p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap size={15} className="text-emerald-400" />
                <span className="text-sm font-semibold text-white">Quick Add</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Type toggle */}
            <div className="flex rounded-xl bg-slate-800 p-0.5 mb-4">
              {TYPE_OPTS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setType(opt.value); setCategory(''); }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${type === opt.value ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {/* Amount — auto-focused, most important field */}
              <MoneyInput
                className="input text-2xl font-bold text-center h-14"
                placeholder="0.00"
                value={amount}
                onChange={setAmount}
                autoFocus
              />

              {/* Category */}
              <select
                className="input"
                value={effectiveCategory}
                onChange={e => setCategory(e.target.value)}
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              {/* Description — optional */}
              <input
                type="text"
                className="input"
                placeholder={`Note (optional, defaults to "${effectiveCategory}")`}
                value={description}
                onChange={e => setDescription(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submit(); }}
              />

              {/* Date + Account on one line */}
              <div className="flex gap-2">
                <input
                  type="date"
                  className="input flex-1"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
                {allLinked.length > 0 && (
                  <select
                    className="input flex-1"
                    value={accountId}
                    onChange={e => setAccountId(e.target.value)}
                  >
                    <option value="">No account</option>
                    {allLinked.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                )}
              </div>

              <button
                onClick={submit}
                disabled={!amount || parseFloat(amount) <= 0}
                className="btn-primary w-full py-3 text-base font-semibold disabled:opacity-40"
              >
                Add {type}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
