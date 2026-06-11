import { useState } from 'react';
import { Plus, Trash2, Edit2, X, Check, Power, Calendar } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getMonthlyAmount } from '../utils/calculations';
import { Subscription, SubscriptionFrequency } from '../types';
import { differenceInDays, parseISO } from 'date-fns';

const SUB_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
];

const CATEGORIES = ['Entertainment', 'Productivity', 'Shopping', 'Health', 'Utilities', 'Work', 'Professional', 'Other'];

interface SubForm {
  name: string;
  amount: string;
  frequency: SubscriptionFrequency;
  category: string;
  nextBillingDate: string;
  color: string;
  isActive: boolean;
}

const emptyForm: SubForm = {
  name: '',
  amount: '',
  frequency: 'monthly',
  category: 'Entertainment',
  nextBillingDate: '',
  color: '#10b981',
  isActive: true,
};

export default function Subscriptions() {
  const { subscriptions, addSubscription, updateSubscription, deleteSubscription } = useFinanceStore();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<SubForm>(emptyForm);

  const activeSubscriptions = subscriptions.filter(s => s.isActive);
  const inactiveSubscriptions = subscriptions.filter(s => !s.isActive);
  const monthlyTotal = activeSubscriptions.reduce((s, sub) => s + getMonthlyAmount(sub.amount, sub.frequency), 0);
  const yearlyTotal = monthlyTotal * 12;

  function openAdd() {
    setForm(emptyForm);
    setEditId(null);
    setShowModal(true);
  }

  function openEdit(sub: Subscription) {
    setForm({
      name: sub.name,
      amount: String(sub.amount),
      frequency: sub.frequency,
      category: sub.category,
      nextBillingDate: sub.nextBillingDate,
      color: sub.color,
      isActive: sub.isActive,
    });
    setEditId(sub.id);
    setShowModal(true);
  }

  function handleSubmit() {
    if (!form.name || !form.amount) return;
    const payload = {
      name: form.name,
      amount: parseFloat(form.amount),
      frequency: form.frequency,
      category: form.category,
      nextBillingDate: form.nextBillingDate,
      color: form.color,
      isActive: form.isActive,
    };
    if (editId) {
      updateSubscription(editId, payload);
    } else {
      addSubscription(payload);
    }
    setShowModal(false);
  }

  function getDaysUntilBilling(dateStr: string): number {
    if (!dateStr) return 0;
    return differenceInDays(parseISO(dateStr), new Date());
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Subscriptions</h1>
          <p className="text-slate-400 text-sm mt-0.5">Manage recurring payments</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Subscription
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <div className="text-xs text-slate-400 mb-1">Monthly Cost</div>
          <div className="text-2xl font-bold text-white">{formatCurrency(monthlyTotal)}</div>
          <div className="text-xs text-slate-500 mt-0.5">across {activeSubscriptions.length} active plans</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-400 mb-1">Annual Cost</div>
          <div className="text-2xl font-bold text-amber-400">{formatCurrency(yearlyTotal)}</div>
          <div className="text-xs text-slate-500 mt-0.5">per year total</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-400 mb-1">Daily Cost</div>
          <div className="text-2xl font-bold text-blue-400">{formatCurrency(monthlyTotal / 30)}</div>
          <div className="text-xs text-slate-500 mt-0.5">average per day</div>
        </div>
      </div>

      {/* Active Subscriptions */}
      <div>
        <h2 className="section-title">Active ({activeSubscriptions.length})</h2>
        <div className="grid grid-cols-2 gap-4">
          {activeSubscriptions.map(sub => {
            const days = getDaysUntilBilling(sub.nextBillingDate);
            const monthly = getMonthlyAmount(sub.amount, sub.frequency);
            return (
              <div key={sub.id} className="card flex items-center gap-4 hover:border-slate-700 transition-colors">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
                  style={{ background: sub.color + '30', border: `1px solid ${sub.color}40` }}
                >
                  <span style={{ color: sub.color }}>{sub.name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-semibold">{sub.name}</span>
                    <span className="text-white font-bold">{formatCurrency(sub.amount)}<span className="text-xs text-slate-400">/{sub.frequency === 'monthly' ? 'mo' : sub.frequency === 'yearly' ? 'yr' : 'wk'}</span></span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-500">{sub.category} · {formatCurrency(monthly)}/mo equiv</span>
                    <div className={`flex items-center gap-1 text-xs ${days <= 7 ? 'text-amber-400' : 'text-slate-500'}`}>
                      <Calendar size={11} />
                      {days <= 0 ? 'Due today' : `${days}d left`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => updateSubscription(sub.id, { isActive: false })} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-amber-400 transition-colors" title="Pause">
                    <Power size={13} />
                  </button>
                  <button onClick={() => openEdit(sub)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-white transition-colors">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => deleteSubscription(sub.id)} className="p-1.5 rounded-lg hover:bg-rose-500/15 text-slate-500 hover:text-rose-400 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inactive Subscriptions */}
      {inactiveSubscriptions.length > 0 && (
        <div>
          <h2 className="section-title text-slate-500">Inactive ({inactiveSubscriptions.length})</h2>
          <div className="grid grid-cols-2 gap-4">
            {inactiveSubscriptions.map(sub => (
              <div key={sub.id} className="card flex items-center gap-4 opacity-50 hover:opacity-75 transition-opacity">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-800 shrink-0">
                  <span className="text-slate-400 font-bold">{sub.name.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">{sub.name}</span>
                    <span className="text-slate-500">{formatCurrency(sub.amount)}/{sub.frequency === 'monthly' ? 'mo' : 'yr'}</span>
                  </div>
                  <span className="text-xs text-slate-600">{sub.category} · Paused</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateSubscription(sub.id, { isActive: true })} className="p-1.5 rounded-lg hover:bg-emerald-500/15 text-slate-500 hover:text-emerald-400 transition-colors" title="Resume">
                    <Power size={13} />
                  </button>
                  <button onClick={() => deleteSubscription(sub.id)} className="p-1.5 rounded-lg hover:bg-rose-500/15 text-slate-500 hover:text-rose-400 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md mx-4 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">{editId ? 'Edit' : 'New'} Subscription</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Name *</label>
                <input className="input" placeholder="e.g. Netflix" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Amount *</label>
                  <input className="input" type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Frequency</label>
                  <select className="input" value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value as SubscriptionFrequency }))}>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Category</label>
                  <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Next Billing Date</label>
                  <input className="input" type="date" value={form.nextBillingDate} onChange={e => setForm(f => ({ ...f, nextBillingDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {SUB_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                      style={{ background: c, outline: form.color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
                    />
                  ))}
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
