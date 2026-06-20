import { useState } from 'react';
import { Plus, Trash2, Edit2, X, Check, Landmark, CreditCard as CreditCardIcon } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency } from '../utils/formatters';
import { getAccountBalance } from '../utils/calculations';
import { Account, CreditCard } from '../types';
import { setDate, isBefore, addMonths, differenceInCalendarDays } from 'date-fns';
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

// Statement/due days are a recurring day-of-month (1-31) with no year or
// month attached, so a plain day picker avoids implying a specific date.
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
  } = useFinanceStore();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<AccountForm>(emptyForm);

  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardDraft, setCardDraft] = useState<Record<string, string>>({});
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCard, setNewCard] = useState({ name: '', limit: '', currentBalance: '', statementDay: '1', dueDay: '15' });

  const totalBalance = accounts.reduce((sum, a) => sum + getAccountBalance(a, transactions), 0);

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
          const linkedCount = transactions.filter(t => t.accountId === account.id).length;
          return (
            <div key={account.id} className="card space-y-4 hover:border-slate-700 transition-colors">
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
                <div className="flex items-center gap-1">
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
            const owed = Math.max(0, c.limit - c.currentBalance);
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

            return (
              <div key={c.id} className="flex items-center justify-between gap-2 sm:gap-4 bg-slate-800/40 rounded-xl p-3">
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
    </div>
  );
}
