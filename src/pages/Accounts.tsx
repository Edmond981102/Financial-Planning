import { useState } from 'react';
import { Plus, Trash2, Edit2, X, Check, Landmark } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency } from '../utils/formatters';
import { getAccountBalance } from '../utils/calculations';
import { Account } from '../types';
import MoneyInput from '../components/common/MoneyInput';

const ACCOUNT_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
];

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

export default function Accounts() {
  const { accounts, transactions, addAccount, updateAccount, deleteAccount } = useFinanceStore();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<AccountForm>(emptyForm);

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Accounts</h1>
          <p className="text-slate-400 text-sm mt-0.5">Track balances across your bank accounts and wallets</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Account
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
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
      <div className="grid grid-cols-2 gap-4">
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
          <div className="col-span-2 card text-center py-16">
            <Landmark size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500">No accounts yet. Add your bank accounts or wallets to track their balances.</p>
          </div>
        )}
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
