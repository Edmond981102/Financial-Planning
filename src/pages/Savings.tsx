import { useState } from 'react';
import { Plus, Trash2, Edit2, X, Check, PlusCircle, Target } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency, formatDate } from '../utils/formatters';
import { calculateGoalProgress, calculateMonthsToGoal } from '../utils/calculations';
import { SavingsGoal, GoalCategory } from '../types';
import { addMonths, format } from 'date-fns';

const GOAL_ICONS: Record<GoalCategory, string> = {
  emergency: '🛡️',
  vacation: '✈️',
  home: '🏠',
  vehicle: '🚗',
  education: '🎓',
  retirement: '🌴',
  gadget: '💻',
  wedding: '💍',
  other: '🎯',
};

const GOAL_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
];

interface GoalForm {
  name: string;
  targetAmount: string;
  currentAmount: string;
  targetDate: string;
  category: GoalCategory;
  color: string;
  monthlyContribution: string;
}

const emptyForm: GoalForm = {
  name: '',
  targetAmount: '',
  currentAmount: '0',
  targetDate: format(addMonths(new Date(), 12), 'yyyy-MM-dd'),
  category: 'other',
  color: '#10b981',
  monthlyContribution: '',
};

export default function Savings() {
  const { savingsGoals, addSavingsGoal, updateSavingsGoal, deleteSavingsGoal, addFundsToGoal } = useFinanceStore();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<GoalForm>(emptyForm);
  const [addFundsId, setAddFundsId] = useState<string | null>(null);
  const [fundsAmount, setFundsAmount] = useState('');

  const totalSaved = savingsGoals.reduce((s, g) => s + g.currentAmount, 0);
  const totalTarget = savingsGoals.reduce((s, g) => s + g.targetAmount, 0);
  const completed = savingsGoals.filter(g => g.currentAmount >= g.targetAmount).length;

  function openAdd() {
    setForm(emptyForm);
    setEditId(null);
    setShowModal(true);
  }

  function openEdit(goal: SavingsGoal) {
    setForm({
      name: goal.name,
      targetAmount: String(goal.targetAmount),
      currentAmount: String(goal.currentAmount),
      targetDate: goal.targetDate,
      category: goal.category,
      color: goal.color,
      monthlyContribution: String(goal.monthlyContribution || ''),
    });
    setEditId(goal.id);
    setShowModal(true);
  }

  function handleSubmit() {
    if (!form.name || !form.targetAmount) return;
    const payload = {
      name: form.name,
      targetAmount: parseFloat(form.targetAmount),
      currentAmount: parseFloat(form.currentAmount) || 0,
      targetDate: form.targetDate,
      category: form.category,
      color: form.color,
      monthlyContribution: parseFloat(form.monthlyContribution) || undefined,
    };
    if (editId) {
      updateSavingsGoal(editId, payload);
    } else {
      addSavingsGoal(payload);
    }
    setShowModal(false);
  }

  function handleAddFunds() {
    if (!addFundsId || !fundsAmount) return;
    addFundsToGoal(addFundsId, parseFloat(fundsAmount));
    setAddFundsId(null);
    setFundsAmount('');
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Savings Goals</h1>
          <p className="text-slate-400 text-sm mt-0.5">Work towards what matters</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Goal
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <div className="text-xs text-slate-400 mb-1">Total Saved</div>
          <div className="text-2xl font-bold text-emerald-400">{formatCurrency(totalSaved)}</div>
          <div className="text-xs text-slate-500 mt-0.5">across {savingsGoals.length} goals</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-400 mb-1">Total Target</div>
          <div className="text-2xl font-bold text-white">{formatCurrency(totalTarget)}</div>
          <div className="text-xs text-slate-500 mt-0.5">{totalTarget > 0 ? ((totalSaved / totalTarget) * 100).toFixed(1) : 0}% overall progress</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-400 mb-1">Goals Completed</div>
          <div className="text-2xl font-bold text-blue-400">{completed}/{savingsGoals.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">{savingsGoals.length - completed} remaining</div>
        </div>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-2 gap-4">
        {savingsGoals.map(goal => {
          const pct = calculateGoalProgress(goal);
          const monthsLeft = calculateMonthsToGoal(goal);
          const isComplete = goal.currentAmount >= goal.targetAmount;
          const remaining = goal.targetAmount - goal.currentAmount;

          return (
            <div key={goal.id} className="card space-y-4 hover:border-slate-700 transition-colors">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: goal.color + '20' }}>
                    {GOAL_ICONS[goal.category]}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{goal.name}</div>
                    <div className="text-xs text-slate-500 capitalize">{goal.category.replace('_', ' ')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setAddFundsId(goal.id); setFundsAmount(''); }} className="p-1.5 rounded-lg hover:bg-emerald-500/15 text-slate-500 hover:text-emerald-400 transition-colors" title="Add funds">
                    <PlusCircle size={14} />
                  </button>
                  <button onClick={() => openEdit(goal)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-white transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => deleteSavingsGoal(goal.id)} className="p-1.5 rounded-lg hover:bg-rose-500/15 text-slate-500 hover:text-rose-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Progress */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <span className="text-2xl font-bold text-white">{formatCurrency(goal.currentAmount)}</span>
                    <span className="text-slate-500 text-sm"> / {formatCurrency(goal.targetAmount)}</span>
                  </div>
                  <div className={`text-2xl font-bold ${isComplete ? 'text-emerald-400' : ''}`} style={{ color: isComplete ? undefined : goal.color }}>
                    {pct.toFixed(0)}%
                  </div>
                </div>
                <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: isComplete ? '#10b981' : goal.color }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <Target size={11} />
                  <span>Due {formatDate(goal.targetDate, 'MMM d, yyyy')}</span>
                </div>
                {!isComplete && goal.monthlyContribution && (
                  <span>
                    {monthsLeft === Infinity ? '∞' : monthsLeft} mo left · {formatCurrency(goal.monthlyContribution)}/mo
                  </span>
                )}
                {isComplete && (
                  <span className="text-emerald-400 font-medium">✓ Goal Reached!</span>
                )}
              </div>

              {/* Add Funds inline */}
              {addFundsId === goal.id && (
                <div className="flex gap-2 pt-1 border-t border-slate-800">
                  <input
                    className="input flex-1"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={`Max: ${formatCurrency(remaining)}`}
                    value={fundsAmount}
                    onChange={e => setFundsAmount(e.target.value)}
                    autoFocus
                  />
                  <button onClick={handleAddFunds} className="btn-primary px-3 py-1.5"><Check size={14} /></button>
                  <button onClick={() => setAddFundsId(null)} className="btn-secondary px-3 py-1.5"><X size={14} /></button>
                </div>
              )}
            </div>
          );
        })}

        {savingsGoals.length === 0 && (
          <div className="col-span-2 card text-center py-16">
            <Target size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500">No savings goals yet. Create your first one!</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md mx-4 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">{editId ? 'Edit' : 'New'} Goal</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Goal Name *</label>
                <input className="input" placeholder="e.g. Japan Vacation" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Target Amount *</label>
                  <input className="input" type="number" min="0" placeholder="0.00" value={form.targetAmount} onChange={e => setForm(f => ({ ...f, targetAmount: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Current Amount</label>
                  <input className="input" type="number" min="0" placeholder="0.00" value={form.currentAmount} onChange={e => setForm(f => ({ ...f, currentAmount: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Monthly Contribution</label>
                  <input className="input" type="number" min="0" placeholder="0.00" value={form.monthlyContribution} onChange={e => setForm(f => ({ ...f, monthlyContribution: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Target Date</label>
                  <input className="input" type="date" value={form.targetDate} onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Category</label>
                <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as GoalCategory }))}>
                  {(Object.keys(GOAL_ICONS) as GoalCategory[]).map(c => (
                    <option key={c} value={c}>{GOAL_ICONS[c]} {c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {GOAL_COLORS.map(c => (
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
