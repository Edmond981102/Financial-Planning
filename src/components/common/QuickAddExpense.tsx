import { useState, useRef, useCallback } from 'react';
import { Plus, X, Zap, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { useFinanceStore } from '../../store/useFinanceStore';
import MoneyInput from './MoneyInput';

const EXPENSE_CATEGORIES = [
  'Housing', 'Food & Dining', 'Transport', 'Health', 'Entertainment',
  'Shopping', 'Education', 'Travel', 'Utilities', 'Personal Care',
  'Gifts & Donations', 'Subscriptions', 'Other',
];
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investment Returns', 'Rental Income', 'Business', 'Bonus', 'Gift', 'Other'];

const TYPE_OPTS = [
  { value: 'expense', label: 'Expense' },
  { value: 'saving', label: 'Saving' },
  { value: 'income', label: 'Income' },
] as const;

// Hardcoded tap → category mapping (2+ taps only)
const CATEGORY_TAPS: Record<number, string> = {
  2: 'Food & Dining',
  3: 'Subscriptions',
};

// Hardcoded tap → account name fragment mapping
const ACCOUNT_TAPS: Record<number, string> = {
  2: 'DBS Expense',
  3: 'Citibank Credit',
};

const TAP_TIMEOUT_MS = 1000;

type TapPhase = 'category' | 'account';

export default function QuickAddExpense() {
  const { addTransaction, budgetTemplate, accounts, creditCards } = useFinanceStore();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'saving' | 'income'>('expense');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [accountId, setAccountId] = useState('');

  // Tap shortcut state
  const [tapPhase, setTapPhase] = useState<TapPhase | null>(null);
  const [tapCount, setTapCount] = useState(0);
  const [tapFlash, setTapFlash] = useState(false);
  const [tapError, setTapError] = useState('');
  const [resolvedCategory, setResolvedCategory] = useState('');
  const [resolvedAccount, setResolvedAccount] = useState('');
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allLinked = [
    ...accounts.map(a => ({ id: a.id, name: a.name })),
    ...creditCards.map(c => ({ id: c.id, name: c.name })),
  ];

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
    setTapPhase(null);
    setTapCount(0);
    setTapError('');
    setResolvedCategory('');
    setResolvedAccount('');
    if (tapTimer.current) clearTimeout(tapTimer.current);
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

  // Called when the 1s timeout fires after tapping stops
  const resolveCategory = useCallback((count: number) => {
    const mapped = CATEGORY_TAPS[count];
    if (mapped) {
      setCategory(mapped);
      setResolvedCategory(mapped);
      setTapError('');
      setTapCount(0);
      setTapPhase('account'); // advance to round 2
    } else {
      setTapError(`${count} taps not assigned — try again`);
      setTapCount(0);
    }
  }, []);

  const resolveAccount = useCallback((count: number, linked: { id: string; name: string }[]) => {
    const fragment = ACCOUNT_TAPS[count];
    if (fragment) {
      const match = linked.find(a => a.name.toLowerCase().includes(fragment.toLowerCase()));
      if (match) {
        setAccountId(match.id);
        setResolvedAccount(match.name);
        setTapError('');
        setTapCount(0);
        setTapPhase(null); // done
      } else {
        setTapError(`"${fragment}" not found in your accounts`);
        setTapCount(0);
      }
    } else {
      setTapError(`${count} taps not assigned — try again`);
      setTapCount(0);
    }
  }, []);

  function handleTap() {
    if (!tapPhase) return;
    setTapFlash(true);
    setTimeout(() => setTapFlash(false), 120);
    setTapError('');

    const next = tapCount + 1;
    setTapCount(next);

    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => {
      if (tapPhase === 'category') resolveCategory(next);
      else resolveAccount(next, allLinked);
    }, TAP_TIMEOUT_MS);
  }

  // Start tap mode when amount is entered
  function handleAmountChange(val: string) {
    setAmount(val);
    if (val && parseFloat(val) > 0 && tapPhase === null && !resolvedCategory) {
      setTapPhase('category');
      setTapCount(0);
      setTapError('');
    }
  }

  const tapHint = tapPhase === 'category'
    ? { label: 'Tap for category', hint: '2× Food & Dining · 3× Subscriptions' }
    : { label: 'Tap for account', hint: '2× DBS Expense · 3× Citibank Credit' };

  return (
    <>
      <button
        onClick={openFresh}
        title="Quick add expense"
        className="fixed bottom-6 right-5 z-40 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/30 flex items-center justify-center transition-all active:scale-95"
      >
        <Plus size={24} className="text-white" />
      </button>

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
              {/* Amount */}
              <MoneyInput
                className="input text-2xl font-bold text-center h-14"
                placeholder="0.00"
                value={amount}
                onChange={handleAmountChange}
                autoFocus
              />

              {/* Tap zone — shown when amount is set */}
              {amount && parseFloat(amount) > 0 && (
                <div className="space-y-2">
                  {/* Resolved pills */}
                  <div className="flex gap-2">
                    {resolvedCategory ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 text-xs font-medium flex-1">
                        <CheckCircle2 size={12} /> {resolvedCategory}
                      </div>
                    ) : (
                      <div className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-500 text-xs flex-1">Category</div>
                    )}
                    {resolvedAccount ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 text-xs font-medium flex-1">
                        <CheckCircle2 size={12} /> {resolvedAccount}
                      </div>
                    ) : (
                      <div className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-500 text-xs flex-1">Account</div>
                    )}
                  </div>

                  {/* Active tap zone */}
                  {tapPhase && (
                    <button
                      onClick={handleTap}
                      className={`w-full rounded-xl border-2 border-dashed py-5 flex flex-col items-center gap-2 transition-all select-none active:scale-95 ${
                        tapFlash
                          ? 'border-emerald-400 bg-emerald-500/20'
                          : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
                      }`}
                    >
                      <span className="text-xs font-semibold text-white">{tapHint.label}</span>
                      {/* Tap dots */}
                      <div className="flex gap-1.5 h-3 items-center">
                        {tapCount >= 2 && Array.from({ length: tapCount }).map((_, i) => (
                          <span key={i} className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                        ))}
                        {tapCount === 0 && <span className="text-slate-500 text-xs">tap here</span>}
                        {tapCount === 1 && <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />}
                      </div>
                      <span className="text-xs text-slate-500">{tapHint.hint}</span>
                    </button>
                  )}

                  {tapError && (
                    <p className="text-xs text-amber-400 text-center">{tapError}</p>
                  )}
                </div>
              )}

              {/* Category dropdown (fallback / override) */}
              <select
                className="input text-sm"
                value={effectiveCategory}
                onChange={e => { setCategory(e.target.value); setResolvedCategory(e.target.value); }}
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              {/* Description */}
              <input
                type="text"
                className="input"
                placeholder={`Note (optional)`}
                value={description}
                onChange={e => setDescription(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submit(); }}
              />

              {/* Date + Account */}
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
                    onChange={e => { setAccountId(e.target.value); setResolvedAccount(allLinked.find(a => a.id === e.target.value)?.name || ''); }}
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
