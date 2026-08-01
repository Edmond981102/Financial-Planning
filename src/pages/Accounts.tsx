import { useState } from 'react';
import { Plus, Trash2, Edit2, X, Check, Landmark, CreditCard as CreditCardIcon, ArrowLeftRight, Target } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getAccountBalance, getCreditCardOwed } from '../utils/calculations';
import { Account, CreditCard } from '../types';
import { setDate, isBefore, addMonths, differenceInCalendarDays, format } from 'date-fns';
import MoneyInput from '../components/common/MoneyInput';

const ACCOUNT_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
];
const CARD_COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981'];

interface AccountForm {
  name: string;
  openingBalance: string;
  color: string;
}

const emptyForm: AccountForm = {
  name: '',
  openingBalance: '0',
  color: ACCOUNT_COLORS[0],
};

function getNextDueDate(dueDay: number): Date {
  const today = new Date();
  let next = setDate(today, dueDay);
  if (isBefore(next, today)) next = setDate(addMonths(today, 1), dueDay);
  return next;
}

function ordinal(day: number): string {
  if (day >= 11 && day <= 13) return `${day}th`;
  switch (day % 10) {
    case 1: return `${day}st`;
    case 2: return `${day}nd`;
    case 3: return `${day}rd`;
    default: return `${day}th`;
  }
}
const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);

export default function Accounts() {
  const {
    accounts, transactions, addAccount, updateAccount, deleteAccount,
    creditCards, addCreditCard, updateCreditCard, deleteCreditCard,
    addTransaction,
  } = useFinanceStore();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<AccountForm>(emptyForm);

  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardDraft, setCardDraft] = useState<Record<string, string>>({});
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCard, setNewCard] = useState({ name: '', limit: '', currentBalance: '', statementDay: '1', dueDay: '15' });
  const [viewingId, setViewingId] = useState<string | null>(null);

  // Reconcile state
  const [adjustingAccountId, setAdjustingAccountId] = useState<string | null>(null);
  const [adjustTarget, setAdjustTarget] = useState('');
  const [adjustingCardId, setAdjustingCardId] = useState<string | null>(null);
  const [adjustCardTarget, setAdjustCardTarget] = useState('');

  const totalBalance = accounts.reduce((sum, a) => sum + getAccountBalance(a, transactions), 0);

  const viewingName = [...accounts, ...creditCards].find((a) => a.id === viewingId)?.name;
  const viewingTransactions = transactions
    .filter((t) => t.accountId === viewingId || t.toAccountId === viewingId)
    .sort((a, b) => b.date.localeCompare(a.date));

  function openAdd() {
    setForm(emptyForm);
    setEditId(null);
    setShowModal(true);
  }

  function openEdit(account: Account) {
    setForm({
      name: account.name,
      openingBalance: String(account.openingBalance),
      color: account.color,
    });
    setEditId(account.id);
    setShowModal(true);
  }

  function handleSubmit() {
    if (!form.name) return;
    const payload = {
      name: form.name,
      openingBalance: parseFloat(form.openingBalance) || 0,
      color: form.color,
    };
    if (editId) {
      updateAccount(editId, payload);
    } else {
      addAccount(payload);
    }
    setShowModal(false);
  }

  function startAdjustAccount(account: Account) {
    const balance = getAccountBalance(account, transactions);
    setAdjustingAccountId(account.id);
    setAdjustTarget(String(balance));
  }

  function applyAccountAdjust(account: Account) {
    const actual = parseFloat(adjustTarget);
    if (isNaN(actual)) { setAdjustingAccountId(null); return; }
    const current = getAccountBalance(account, transactions);
    const diff = actual - current;
    if (Math.abs(diff) >= 0.01) {
      addTransaction({
        date: format(new Date(), 'yyyy-MM-dd'),
        amount: Math.abs(diff),
        category: 'Other',
        description: 'Balance adjustment',
        type: diff > 0 ? 'income' : 'expense',
        accountId: account.id,
      });
    }
    setAdjustingAccountId(null);
  }

  function startAdjustCard(card: CreditCard) {
    setAdjustingCardId(card.id);
    setAdjustCardTarget(String(card.currentBalance));
  }

  function applyCardAdjust(card: CreditCard) {
    const actual = parseFloat(adjustCardTarget);
    if (!isNaN(actual)) {
      updateCreditCard(card.id, { currentBalance: actual });
    }
    setAdjustingCardId(null);
  }

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
    const limit = parseFloat(newCard.limit) || 0;
    addCreditCard({
      name: newCard.name.trim(),
      limit,
      currentBalance: newCard.currentBalance === '' ? limit : (parseFloat(newCard.currentBalance) || 0),
      statementDay: Math.min(31, Math.max(1, parseInt(newCard.statementDay) || 1)),
      dueDay: Math.min(31, Math.max(1, parseInt(newCard.dueDay) || 1)),
      color: CARD_COLORS[creditCards.length % CARD_COLORS.length],
    });
    setNewCard({ name: '', limit: '', currentBalance: '', statementDay: '1', dueDay: '15' });
    setShowAddCard(false);
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Accounts</h1>
          <p className="text-slate-400 text-sm mt-0.5">Track balances across your bank accounts and wallets</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 shrink-0">
          <Plus size={16} /> New Account
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card">
          <div className="text-xs text-slate-400 mb-1">Total Balance</div>
          <div className="text-2xl font-bold text-emerald-400">{formatCurrency(totalBalance)}</div>
          <div className="text-xs text-slate-500 mt-0.5">across {accounts.length} accounts</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-400 mb-1">Linked Transactions</div>
          <div className="text-2xl font-bold text-white">{transactions.filter(t => t.accountId).length}</div>
          <div className="text-xs text-slate-500 mt-0.5">of {transactions.length} total transactions</div>
        </div>
      </div>

      {/* Accounts grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {accounts.map(account => {
          const balance = getAccountBalance(account, transactions);
          const linkedCount = transactions.filter(t => t.accountId === account.id || t.toAccountId === account.id).length;
          const isAdjusting = adjustingAccountId === account.id;
          const adjustedActual = parseFloat(adjustTarget);
          const diff = isAdjusting && !isNaN(adjustedActual) ? adjustedActual - balance : 0;

          return (
            <div
              key={account.id}
              onClick={() => !isAdjusting && setViewingId(account.id)}
              className="card space-y-4 hover:border-slate-700 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: account.color }}>
                    {account.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{account.name}</div>
                    <div className="text-xs text-slate-500">{linkedCount} linked transaction{linkedCount === 1 ? '' : 's'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => isAdjusting ? setAdjustingAccountId(null) : startAdjustAccount(account)}
                    title="Adjust to actual balance"
                    className={`p-1.5 rounded-lg transition-colors ${isAdjusting ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-slate-700 text-slate-500 hover:text-amber-400'}`}
                  >
                    <Target size={14} />
                  </button>
                  <button onClick={() => openEdit(account)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-white transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => deleteAccount(account.id)} className="p-1.5 rounded-lg hover:bg-rose-500/15 text-slate-500 hover:text-rose-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${balance >= 0 ? 'text-white' : 'text-rose-400'}`}>{formatCurrency(balance)}</div>
                <div className="text-xs text-slate-500 mt-0.5">opening balance {formatCurrency(account.openingBalance)}</div>
              </div>

              {isAdjusting && (
                <div className="border-t border-slate-700 pt-3 space-y-2" onClick={e => e.stopPropagation()}>
                  <label className="text-xs text-slate-400 font-medium">Set actual balance</label>
                  <div className="flex items-center gap-2">
                    <MoneyInput
                      className="input flex-1"
                      value={adjustTarget}
                      onChange={setAdjustTarget}
                      autoFocus
                    />
                    <button onClick={() => applyAccountAdjust(account)} className="btn-primary p-2 shrink-0">
                      <Check size={14} />
                    </button>
                    <button onClick={() => setAdjustingAccountId(null)} className="btn-secondary p-2 shrink-0">
                      <X size={14} />
                    </button>
                  </div>
                  {!isNaN(adjustedActual) && Math.abs(diff) >= 0.01 && (
                    <p className={`text-xs ${diff > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {diff > 0 ? `+${formatCurrency(diff)} will be recorded as income` : `${formatCurrency(diff)} will be recorded as expense`}
                    </p>
                  )}
                  {!isNaN(adjustedActual) && Math.abs(diff) < 0.01 && (
                    <p className="text-xs text-slate-500">Already matches — no adjustment needed.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {accounts.length === 0 && (
          <div className="sm:col-span-2 card text-center py-16">
            <Landmark size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500">No accounts yet. Add your bank accounts or wallets to track their balances.</p>
          </div>
        )}
      </div>

      {/* Credit Cards */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-white">Credit Cards</h2>
          <button onClick={() => setShowAddCard(s => !s)} className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3 shrink-0">
            <Plus size={13} /> Add Card
          </button>
        </div>

        {creditCards.length === 0 && !showAddCard && (
          <p className="text-slate-500 text-sm py-4 text-center">No credit cards added yet.</p>
        )}

        <div className="space-y-3">
          {creditCards.map((c) => {
            const isEditing = editingCardId === c.id;
            const isAdjustingCard = adjustingCardId === c.id;
            const owed = getCreditCardOwed(c);
            const usagePercent = c.limit > 0 ? Math.min(100, (owed / c.limit) * 100) : 0;
            const daysUntilDue = differenceInCalendarDays(getNextDueDate(c.dueDay), new Date());
            const dueSoon = daysUntilDue <= 5;

            if (isEditing) {
              return (
                <div key={c.id} className="flex items-end gap-2 flex-wrap bg-slate-800/60 rounded-xl p-3">
                  <div className="flex-1 min-w-[140px]">
                    <label className="label">Name</label>
                    <input className="input" value={cardDraft.name} onChange={e => setCardDraft(d => ({ ...d, name: e.target.value }))} />
                  </div>
                  <div className="w-28">
                    <label className="label">Limit</label>
                    <MoneyInput className="input" value={cardDraft.limit} onChange={raw => setCardDraft(d => ({ ...d, limit: raw }))} />
                  </div>
                  <div className="w-28">
                    <label className="label">Available Balance</label>
                    <MoneyInput className="input" value={cardDraft.currentBalance} onChange={raw => setCardDraft(d => ({ ...d, currentBalance: raw }))} />
                  </div>
                  <div className="w-28">
                    <label className="label">Statement day</label>
                    <select
                      className="input"
                      value={cardDraft.statementDay}
                      onChange={e => setCardDraft(d => ({ ...d, statementDay: e.target.value }))}
                    >
                      {DAYS_OF_MONTH.map(day => (
                        <option key={day} value={day}>{ordinal(day)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-28">
                    <label className="label">Due day</label>
                    <select
                      className="input"
                      value={cardDraft.dueDay}
                      onChange={e => setCardDraft(d => ({ ...d, dueDay: e.target.value }))}
                    >
                      {DAYS_OF_MONTH.map(day => (
                        <option key={day} value={day}>{ordinal(day)}</option>
                      ))}
                    </select>
                  </div>
                  <button onClick={saveCardEdit} className="btn-primary p-2"><Check size={14} /></button>
                  <button onClick={() => setEditingCardId(null)} className="btn-secondary p-2"><X size={14} /></button>
                </div>
              );
            }

            if (isAdjustingCard) {
              const adjustedAvail = parseFloat(adjustCardTarget);
              const newOwed = !isNaN(adjustedAvail) ? Math.max(0, c.limit - adjustedAvail) : null;
              return (
                <div key={c.id} className="bg-slate-800/60 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.color + '20' }}>
                      <CreditCardIcon size={16} style={{ color: c.color }} />
                    </div>
                    <span className="text-white font-medium flex-1 truncate">{c.name}</span>
                    <span className="text-xs text-slate-500">limit {formatCurrency(c.limit)}</span>
                  </div>
                  <label className="text-xs text-slate-400 font-medium">Set actual available balance</label>
                  <div className="flex items-center gap-2">
                    <MoneyInput
                      className="input flex-1"
                      value={adjustCardTarget}
                      onChange={setAdjustCardTarget}
                      autoFocus
                    />
                    <button onClick={() => applyCardAdjust(c)} className="btn-primary p-2 shrink-0">
                      <Check size={14} />
                    </button>
                    <button onClick={() => setAdjustingCardId(null)} className="btn-secondary p-2 shrink-0">
                      <X size={14} />
                    </button>
                  </div>
                  {newOwed !== null && (
                    <p className="text-xs text-slate-400">
                      Spent will update to <span className={newOwed > owed ? 'text-rose-400' : 'text-emerald-400'}>{formatCurrency(newOwed)}</span> of {formatCurrency(c.limit)}
                    </p>
                  )}
                </div>
              );
            }

            return (
              <div
                key={c.id}
                onClick={() => setViewingId(c.id)}
                className="flex items-center justify-between gap-2 sm:gap-4 bg-slate-800/40 hover:bg-slate-800/70 rounded-xl p-3 cursor-pointer transition-colors"
              >
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
                <div className="w-24 sm:w-40 shrink-0">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{formatCurrency(owed)} spent</span>
                    <span className="text-slate-500 hidden sm:inline">of {formatCurrency(c.limit)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${usagePercent}%`, background: usagePercent > 80 ? '#f43f5e' : c.color }} />
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => startAdjustCard(c)}
                    title="Adjust to actual balance"
                    className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-amber-400 transition-colors"
                  >
                    <Target size={14} />
                  </button>
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
            <div className="flex items-end gap-2 flex-wrap bg-slate-800/60 rounded-xl p-3">
              <div className="flex-1 min-w-[140px]">
                <label className="label">Card name</label>
                <input className="input" value={newCard.name} onChange={e => setNewCard(d => ({ ...d, name: e.target.value }))} />
              </div>
              <div className="w-28">
                <label className="label">Limit</label>
                <MoneyInput className="input" value={newCard.limit} onChange={raw => setNewCard(d => ({ ...d, limit: raw }))} />
              </div>
              <div className="w-28">
                <label className="label">Available Balance</label>
                <MoneyInput className="input" value={newCard.currentBalance} onChange={raw => setNewCard(d => ({ ...d, currentBalance: raw }))} />
              </div>
              <div className="w-28">
                <label className="label">Statement day</label>
                <select
                  className="input"
                  value={newCard.statementDay}
                  onChange={e => setNewCard(d => ({ ...d, statementDay: e.target.value }))}
                >
                  {DAYS_OF_MONTH.map(day => (
                    <option key={day} value={day}>{ordinal(day)}</option>
                  ))}
                </select>
              </div>
              <div className="w-28">
                <label className="label">Due day</label>
                <select
                  className="input"
                  value={newCard.dueDay}
                  onChange={e => setNewCard(d => ({ ...d, dueDay: e.target.value }))}
                >
                  {DAYS_OF_MONTH.map(day => (
                    <option key={day} value={day}>{ordinal(day)}</option>
                  ))}
                </select>
              </div>
              <button onClick={submitNewCard} className="btn-primary p-2"><Check size={14} /></button>
              <button onClick={() => setShowAddCard(false)} className="btn-secondary p-2"><X size={14} /></button>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md mx-4 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">{editId ? 'Edit' : 'New'} Account</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Account Name *</label>
                <input className="input" placeholder="e.g. Travel Fund" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Opening Balance</label>
                <MoneyInput className="input" placeholder="0.00" value={form.openingBalance} onChange={raw => setForm(f => ({ ...f, openingBalance: raw }))} />
                <p className="text-xs text-slate-500 mt-1">Balance before any transactions are linked to this account.</p>
              </div>
              <div>
                <label className="label">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {ACCOUNT_COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                      style={{ background: c, outline: form.color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleSubmit} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Check size={15} /> {editId ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transactions for a clicked account/card */}
      {viewingId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setViewingId(null)}>
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg mx-4 p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">{viewingName} — Transactions</h2>
              <button onClick={() => setViewingId(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            {viewingTransactions.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-10">No transactions linked to this account yet.</p>
            ) : (
              <div className="space-y-1">
                {viewingTransactions.map(t => (
                  <div key={t.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-800 last:border-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {t.type === 'transfer' && <ArrowLeftRight size={14} className="text-violet-400 shrink-0" />}
                      <div className="min-w-0">
                        <div className="text-sm text-white truncate">{t.description}</div>
                        <div className="text-xs text-slate-500">{formatDate(t.date)} · {t.category}</div>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-semibold shrink-0 ${
                        t.type === 'income' || (t.type === 'transfer' && t.toAccountId === viewingId)
                          ? 'text-emerald-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {t.type === 'income' || (t.type === 'transfer' && t.toAccountId === viewingId) ? '+' : '-'}
                      {formatCurrency(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
