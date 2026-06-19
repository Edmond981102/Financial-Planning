import { useState, useEffect } from 'react';
import { Wallet, ChevronRight, ChevronLeft, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { addYears, differenceInCalendarYears, format, parseISO, startOfMonth, subYears } from 'date-fns';
import { useFinanceStore } from '../../store/useFinanceStore';
import { getCpfBreakdown } from '../../utils/cpf';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { ResidencyStatus, GoalCategory, UserProfile } from '../../types';
import MoneyInput from '../common/MoneyInput';

const GOAL_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
const CARD_COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981'];

// Statement/due days are a recurring day-of-month (1-31), but a native date
// picker is friendlier to fill in than a number stepper — so we render one
// pinned to a fixed reference month and only read back the day component.
function dayToDateInputValue(day: number): string {
  return `2024-01-${String(Math.min(31, Math.max(1, day || 1))).padStart(2, '0')}`;
}
function dateInputValueToDay(value: string): number {
  return Math.min(31, Math.max(1, parseInt(value.slice(-2), 10) || 1));
}

interface GoalDraft {
  name: string;
  targetAmount: string;
  targetDate: string;
  monthlyContribution: string;
}

interface CardDraft {
  name: string;
  limit: string;
  currentBalance: string;
  statementDay: string;
  dueDay: string;
}

const STEPS = ['Income & Age', 'Residency & CPF', 'Goals', 'Budget Split', 'Credit Cards'];

export default function OnboardingWizard() {
  const profile = useFinanceStore((s) => s.profile);
  const updateProfile = useFinanceStore((s) => s.updateProfile);
  const addSavingsGoal = useFinanceStore((s) => s.addSavingsGoal);
  const addCreditCard = useFinanceStore((s) => s.addCreditCard);
  const completeOnboarding = useFinanceStore((s) => s.completeOnboarding);

  const [step, setStep] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(0);
  useEffect(() => {
    setMaxStepReached((m) => Math.max(m, step));
  }, [step]);

  const [name, setName] = useState(profile.name);
  const [monthlyIncome, setMonthlyIncome] = useState(String(profile.monthlyIncome));
  const [dateOfBirth, setDateOfBirth] = useState(
    profile.dateOfBirth ?? format(subYears(new Date(), profile.currentAge || 25), 'yyyy-MM-dd')
  );
  const currentAge = dateOfBirth ? differenceInCalendarYears(new Date(), parseISO(dateOfBirth)) : 0;
  const [retirementAge, setRetirementAge] = useState(String(profile.retirementAge));
  const [retirementTargetAmount, setRetirementTargetAmount] = useState(String(profile.retirementTargetAmount ?? ''));

  const [residencyStatus, setResidencyStatus] = useState<ResidencyStatus>(profile.residencyStatus ?? 'citizen');
  const [prStartDate, setPrStartDate] = useState(profile.prStartDate ?? '');

  const defaultGoalTargetDate = () => format(startOfMonth(addYears(new Date(), 1)), 'yyyy-MM-dd');

  const [goals, setGoals] = useState<GoalDraft[]>([]);
  const [goalDraft, setGoalDraft] = useState<GoalDraft>({
    name: '', targetAmount: '', targetDate: defaultGoalTargetDate(), monthlyContribution: '',
  });

  const [savingsPct, setSavingsPct] = useState(String(profile.allocationTargets?.savingsPct ?? 20));
  const [expensesPct, setExpensesPct] = useState(String(profile.allocationTargets?.expensesPct ?? 60));
  const [investmentsPct, setInvestmentsPct] = useState(String(profile.allocationTargets?.investmentsPct ?? 20));

  const [cards, setCards] = useState<CardDraft[]>([]);
  const [cardDraft, setCardDraft] = useState<CardDraft>({
    name: '', limit: '', currentBalance: '0', statementDay: '1', dueDay: '15',
  });

  const previewProfile = {
    ...profile,
    monthlyIncome: parseFloat(monthlyIncome) || 0,
    currentAge,
    residencyStatus,
    prStartDate: prStartDate || undefined,
  };
  const cpf = getCpfBreakdown(previewProfile);

  const allocationTotal = (parseFloat(savingsPct) || 0) + (parseFloat(expensesPct) || 0) + (parseFloat(investmentsPct) || 0);

  function addGoalRow() {
    if (!goalDraft.name.trim() || !goalDraft.targetAmount) return;
    setGoals((g) => [...g, goalDraft]);
    setGoalDraft({ name: '', targetAmount: '', targetDate: defaultGoalTargetDate(), monthlyContribution: '' });
  }

  function addCardRow() {
    if (!cardDraft.name.trim() || !cardDraft.limit) return;
    setCards((c) => [...c, cardDraft]);
    setCardDraft({ name: '', limit: '', currentBalance: '0', statementDay: '1', dueDay: '15' });
  }

  function persistAndFinish() {
    // Only persist answers for steps the user actually saw — otherwise skipping
    // from step 0 would silently write default residency/allocation values and
    // make the profile look "complete", hiding the dashboard reminder banner.
    const profileUpdates: Partial<UserProfile> = {
      name: name.trim() || profile.name,
      monthlyIncome: parseFloat(monthlyIncome) || profile.monthlyIncome,
      dateOfBirth: dateOfBirth || profile.dateOfBirth,
      currentAge: dateOfBirth ? currentAge : profile.currentAge,
      retirementAge: parseFloat(retirementAge) || profile.retirementAge,
      retirementTargetAmount: retirementTargetAmount ? parseFloat(retirementTargetAmount) : profile.retirementTargetAmount,
    };
    if (maxStepReached >= 1) {
      profileUpdates.residencyStatus = residencyStatus;
      profileUpdates.prStartDate = residencyStatus === 'pr' ? (prStartDate || undefined) : undefined;
    }
    if (maxStepReached >= 3) {
      profileUpdates.allocationTargets = {
        savingsPct: parseFloat(savingsPct) || 0,
        expensesPct: parseFloat(expensesPct) || 0,
        investmentsPct: parseFloat(investmentsPct) || 0,
      };
    }
    updateProfile(profileUpdates);
    goals.forEach((g, i) => {
      addSavingsGoal({
        name: g.name.trim(),
        targetAmount: parseFloat(g.targetAmount) || 0,
        currentAmount: 0,
        targetDate: g.targetDate,
        category: 'other' as GoalCategory,
        color: GOAL_COLORS[i % GOAL_COLORS.length],
        monthlyContribution: g.monthlyContribution ? parseFloat(g.monthlyContribution) : undefined,
      });
    });
    cards.forEach((c, i) => {
      addCreditCard({
        name: c.name.trim(),
        limit: parseFloat(c.limit) || 0,
        currentBalance: parseFloat(c.currentBalance) || 0,
        statementDay: Math.min(31, Math.max(1, parseInt(c.statementDay) || 1)),
        dueDay: Math.min(31, Math.max(1, parseInt(c.dueDay) || 1)),
        color: CARD_COLORS[i % CARD_COLORS.length],
      });
    });
    completeOnboarding();
  }

  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center">
                <Wallet size={18} className="text-white" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Let's set up your financial profile</div>
                <div className="text-xs text-slate-400">A few quick steps so FinanceIQ can tell you how to hit your goals.</div>
              </div>
            </div>
            <button onClick={persistAndFinish} className="text-xs text-slate-500 hover:text-slate-300 transition-colors shrink-0">
              Skip setup for now
            </button>
          </div>
          <div className="flex items-center gap-2">
            {STEPS.map((label, i) => (
              <div key={label} className="flex-1">
                <div className={`h-1.5 rounded-full transition-colors ${i <= step ? 'bg-emerald-500' : 'bg-slate-800'}`} />
                <div className={`text-[11px] mt-1.5 ${i === step ? 'text-emerald-400 font-medium' : 'text-slate-500'}`}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-6 min-h-[320px]">
          {step === 0 && (
            <div className="space-y-3">
              <div>
                <label className="label">Name</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Monthly income</label>
                  <MoneyInput className="input" value={monthlyIncome} onChange={(raw) => setMonthlyIncome(raw)} />
                </div>
                <div>
                  <label className="label">Date of birth</label>
                  <input className="input" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
                  {dateOfBirth && <p className="text-xs text-slate-500 mt-1">Age {currentAge}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Target retirement age</label>
                  <input className="input" type="number" min="0" value={retirementAge} onChange={(e) => setRetirementAge(e.target.value)} />
                </div>
                <div>
                  <label className="label">Target retirement amount</label>
                  <MoneyInput className="input" placeholder="e.g. 1,000,000" value={retirementTargetAmount} onChange={(raw) => setRetirementTargetAmount(raw)} />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="label">Residency status</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['citizen', 'pr', 'foreigner'] as ResidencyStatus[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => setResidencyStatus(status)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                        residencyStatus === status
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                          : 'border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {status === 'citizen' ? 'Singapore Citizen' : status === 'pr' ? 'PR' : 'Foreigner / Other'}
                    </button>
                  ))}
                </div>
              </div>

              {residencyStatus === 'pr' && (
                <div>
                  <label className="label">PR start date</label>
                  <input className="input" type="date" value={prStartDate} onChange={(e) => setPrStartDate(e.target.value)} />
                  <p className="text-xs text-slate-500 mt-1">Determines whether you're on graduated (year 1/2) or full CPF rates.</p>
                </div>
              )}

              <div className="card !bg-slate-800/60">
                {cpf.applicable ? (
                  <>
                    <div className="text-xs text-slate-400 mb-2">
                      Estimated CPF{cpf.residencyYear && cpf.residencyYear < 3 ? ` (graduated, year ${cpf.residencyYear})` : ''}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">Employee contribution ({formatPercent(cpf.employeeRate * 100, 0)})</span>
                      <span className="text-rose-400 font-medium">-{formatCurrency(cpf.employeeContribution)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1.5 pt-1.5 border-t border-slate-700">
                      <span className="text-slate-300 font-medium">Estimated take-home pay</span>
                      <span className="text-emerald-400 font-semibold">{formatCurrency(cpf.takeHomePay)}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-400">No CPF deductions — your full monthly income is take-home pay.</p>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">What do you want to achieve in the next 1-5 years? You can add more goals later from the Savings page.</p>
              {goals.map((g, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-800/60 rounded-xl px-3 py-2 text-sm">
                  <span className="text-white">{g.name}</span>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>{formatCurrency(parseFloat(g.targetAmount) || 0)}</span>
                    <span>by {format(parseISO(g.targetDate), 'MMM yyyy')}</span>
                    <button onClick={() => setGoals((arr) => arr.filter((_, idx) => idx !== i))} className="text-slate-500 hover:text-rose-400">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-2">
                <input className="input" placeholder="Goal name (e.g. Wedding)" value={goalDraft.name} onChange={(e) => setGoalDraft((d) => ({ ...d, name: e.target.value }))} />
                <MoneyInput className="input" placeholder="Target amount" value={goalDraft.targetAmount} onChange={(raw) => setGoalDraft((d) => ({ ...d, targetAmount: raw }))} />
                <input className="input" type="month" value={goalDraft.targetDate.slice(0, 7)} onChange={(e) => setGoalDraft((d) => ({ ...d, targetDate: `${e.target.value}-01` }))} />
                <MoneyInput className="input" placeholder="Monthly contribution (optional)" value={goalDraft.monthlyContribution} onChange={(raw) => setGoalDraft((d) => ({ ...d, monthlyContribution: raw }))} />
              </div>
              <button onClick={addGoalRow} className="btn-secondary flex items-center gap-1.5 text-xs">
                <Plus size={13} /> Add goal
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">Roughly how do you want to split each paycheck? This becomes your target — Budget will track how close your actual spending gets.</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Savings %</label>
                  <input className="input" type="number" min="0" max="100" value={savingsPct} onChange={(e) => setSavingsPct(e.target.value)} />
                </div>
                <div>
                  <label className="label">Expenses %</label>
                  <input className="input" type="number" min="0" max="100" value={expensesPct} onChange={(e) => setExpensesPct(e.target.value)} />
                </div>
                <div>
                  <label className="label">Investments %</label>
                  <input className="input" type="number" min="0" max="100" value={investmentsPct} onChange={(e) => setInvestmentsPct(e.target.value)} />
                </div>
              </div>
              <p className={`text-xs ${allocationTotal === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                Total: {allocationTotal}% {allocationTotal !== 100 && '(should add up to 100%)'}
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">Add your credit cards so FinanceIQ can warn you before statements and due dates.</p>
              {cards.map((c, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-800/60 rounded-xl px-3 py-2 text-sm">
                  <span className="text-white">{c.name}</span>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>Limit {formatCurrency(parseFloat(c.limit) || 0)}</span>
                    <span>Due day {c.dueDay}</span>
                    <button onClick={() => setCards((arr) => arr.filter((_, idx) => idx !== i))} className="text-slate-500 hover:text-rose-400">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Card name</label>
                  <input className="input" value={cardDraft.name} onChange={(e) => setCardDraft((d) => ({ ...d, name: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Credit limit</label>
                  <MoneyInput className="input" value={cardDraft.limit} onChange={(raw) => setCardDraft((d) => ({ ...d, limit: raw }))} />
                </div>
                <div>
                  <label className="label">Current balance</label>
                  <MoneyInput className="input" value={cardDraft.currentBalance} onChange={(raw) => setCardDraft((d) => ({ ...d, currentBalance: raw }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">Statement date</label>
                    <input
                      className="input"
                      type="date"
                      value={dayToDateInputValue(parseInt(cardDraft.statementDay, 10))}
                      onChange={(e) => setCardDraft((d) => ({ ...d, statementDay: String(dateInputValueToDay(e.target.value)) }))}
                    />
                  </div>
                  <div>
                    <label className="label">Due date</label>
                    <input
                      className="input"
                      type="date"
                      value={dayToDateInputValue(parseInt(cardDraft.dueDay, 10))}
                      onChange={(e) => setCardDraft((d) => ({ ...d, dueDay: String(dateInputValueToDay(e.target.value)) }))}
                    />
                  </div>
                </div>
              </div>
              <button onClick={addCardRow} className="btn-secondary flex items-center gap-1.5 text-xs">
                <Plus size={13} /> Add card
              </button>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="btn-secondary flex items-center gap-1.5 disabled:opacity-0"
          >
            <ChevronLeft size={14} /> Back
          </button>
          {isLastStep ? (
            <button onClick={persistAndFinish} className="btn-primary flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Finish setup
            </button>
          ) : (
            <button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} className="btn-primary flex items-center gap-1.5">
              Next <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
